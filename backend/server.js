/**
 * DevOps Monitoring Dashboard - Enhanced Backend
 * Real-time server monitoring with alerting
 */

// Load environment variables from .env file
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.warn('[Backend] WARNING: JWT_SECRET is not set in the environment. Using an auto-generated secret for this run only — all tokens will be invalidated on restart. Set JWT_SECRET in your .env file for production.');
  process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const { Server: SocketIO } = require('socket.io');
const cron = require('node-cron');

const Metric = require('./models/Metric');
const Server = require('./models/Server');
const Alert = require('./models/Alert');
const Threshold = require('./models/Threshold');
const Backup = require('./models/Backup');

const StatusService = require('./services/statusService');
const AlertService = require('./services/alertService');
const CpuAlertService = require('./services/cpuAlertService');
const EmailService = require('./services/emailService');
const BackupService = require('./services/backupService');
const BackupCronService = require('./services/backupCronService');
const BackupSocketService = require('./services/backupSocketService');

const serverRoutes = require('./routes/servers');
const alertRoutes = require('./routes/alerts');
const metricsRoutes = require('./routes/metrics');
const backupRoutes = require('./routes/backups');
const remoteActionsRoutes = require('./routes/remoteActions');
const servicesRoutes = require('./routes/services');
const authRoutes = require('./routes/auth');
const { verifyToken } = require('./middleware/auth');

// Normalizes the agent's detected-services payload into a stable shape,
// accepting both the legacy format (array of plain unit-name strings,
// still sent by agents that haven't been updated) and the current one
// (array of {name, active_state, sub_state, description} objects).
// Entries with no usable name are dropped.
const normalizeServices = (rawServices) => {
  return rawServices
    .map(entry => {
      if (typeof entry === 'string') {
        // Unclassifiable (no is_system info from this agent generation) —
        // default to visible/application rather than hidden, per product
        // decision: noise beats a wrongly-hidden service.
        return { name: entry, active_state: 'unknown', sub_state: 'unknown', description: '', is_system: false };
      }
      if (entry && typeof entry === 'object' && entry.name) {
        return {
          name: entry.name,
          active_state: entry.active_state || 'unknown',
          sub_state: entry.sub_state || 'unknown',
          description: entry.description || '',
          is_system: entry.is_system === true
        };
      }
      return null;
    })
    .filter(Boolean);
};

// Initialize Express
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize Socket.io
const io = new SocketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize Backup Socket Service
BackupSocketService.initialize(io);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';

mongoose.connect(MONGODB_URI).then(() => {
  console.log('[Backend] Connected to MongoDB');
  initializeDefaultThresholds();
  initializeDefaultAdmin();
  BackupCronService.initializeBackupCron();
  BackupCronService.initializeLateBackupCheck();
}).catch(err => {
  console.error('[Backend] MongoDB connection error:', err);
  process.exit(1);
});

// Initialize default admin user if not exist (or backfill a password for a
// pre-existing admin created before password auth was introduced)
async function initializeDefaultAdmin() {
  try {
    const User = require('./models/User');
    const adminEmail = (process.env.ADMIN_EMAIL || 'mariemchaabani39@gmail.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

    if (!process.env.ADMIN_PASSWORD) {
      console.warn('[Backend] WARNING: ADMIN_PASSWORD is not set. Using an insecure default password for the seeded admin account. Set ADMIN_PASSWORD in your .env file and change it immediately.');
    }

    const existing = await User.findOne({ email: adminEmail }).select('+password');

    if (!existing) {
      await User.create({
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      console.log(`[Backend] Default admin user created in MongoDB: ${adminEmail}`);
    } else if (!existing.password) {
      existing.password = adminPassword;
      await existing.save();
      console.log(`[Backend] Migrated existing admin user with a hashed password: ${adminEmail}`);
    }
  } catch (error) {
    console.error('[Backend] Error initializing default admin:', error);
  }
}

// Initialize default thresholds if missing. Insert-only on purpose: the
// admin can now edit thresholds from the app (ThresholdSettingsModal /
// PUT /api/thresholds/:metric_name), so this must NOT overwrite existing
// values on every restart or it would silently undo that configuration.
async function initializeDefaultThresholds() {
  try {
    const defaults = [
      { metric_name: 'cpu', warning_level: 70, critical_level: 80 },
      { metric_name: 'ram', warning_level: 70, critical_level: 80 },
      { metric_name: 'disk', warning_level: 70, critical_level: 80 }
    ];

    for (const threshold of defaults) {
      await Threshold.updateOne(
        { metric_name: threshold.metric_name },
        { $setOnInsert: threshold },
        { upsert: true }
      );
    }
    console.log('[Backend] Default thresholds verified/initialized');
  } catch (error) {
    console.error('[Backend] Error initializing thresholds:', error);
  }
}


// WebSocket connection handler
const connectedClients = new Set();

wss.on('connection', (ws) => {
  console.log('[WebSocket] New client connected');
  connectedClients.add(ws);

  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('[WebSocket] Error:', error);
  });
});

// Broadcast to all connected WebSocket clients
function broadcastUpdate(data) {
  const message = JSON.stringify({
    type: 'update',
    timestamp: new Date(),
    data
  });

  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Health check
app.get('/', async (req, res) => {
  try {
    const serverCount = await Server.countDocuments();
    const metricCount = await Metric.countDocuments();
    const activeAlerts = await Alert.countDocuments({ status: 'ACTIVE' });
    
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      database: 'connected',
      servers_monitored: serverCount,
      total_metrics: metricCount,
      active_alerts: activeAlerts,
      version: '2.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Receive metrics from agent
app.post('/metrics', async (req, res) => {
  try {
    const metric = req.body;

    // Prepare metric object - normalize server_id and serverId
    const serverId = metric.server_id || metric.serverId;
    
    // Validate required fields
    if (!serverId || metric.cpu_percent === undefined) {
      return res.status(400).json({ error: 'Missing required fields: server_id and cpu_percent' });
    }

    // Normalize the metric object
    metric.server_id = serverId;
    metric.serverId = serverId;

    // Find or create server
    let server = await Server.findOne({ server_id: serverId });
    if (!server) {
      server = new Server({
        server_id: serverId,
        name: metric.server_name || serverId,
        location: metric.location || 'Inconnu'
      });
      await server.save();
      console.log(`[Backend] New server registered: ${serverId}`);
    }

    // Calculate status
    const statusResult = await StatusService.calculateStatus(metric);
    metric.status = statusResult.status;

    // Save metric to database
    const newMetric = new Metric(metric);
    await newMetric.save();

    // Update server's last metric time
    server.last_metric_time = new Date();
    server.status = statusResult.status;
    server.current_metrics = {
      cpu_percent: metric.cpu_percent,
      ram_percent: metric.ram_percent,
      disk_percent: metric.disk_percent
    };
    if (metric.collection_interval) {
      server.collection_interval = metric.collection_interval;
    }
    // Detected services list sent by the agent (systemctl-based detection).
    // Two agent generations coexist in the field:
    //   - updated agent: `services` is an array of {name, active_state,
    //     sub_state, description} objects, or explicitly `null` when
    //     detection failed this cycle (systemctl missing/timed out/etc).
    //   - older agent: `services` is always an array of plain name
    //     strings, and silently becomes [] on its own detection failures
    //     — it cannot tell us "failed" apart from "found nothing", so we
    //     only overwrite the last known-good list when that array is
    //     non-empty, same as before this change.
    if (Array.isArray(metric.services)) {
      if (metric.services.length > 0) {
        server.services = normalizeServices(metric.services);
        server.services_detection_failed_at = null;
      }
    } else if (metric.services === null) {
      server.services_detection_failed_at = new Date();
    }
    if (metric.agent_version) {
      server.agent_version = metric.agent_version;
    }
    await server.save();

    // Check and generate alerts for CPU, RAM and Disk (handles WARNING and
    // CRITICAL emails for all three metrics). CpuAlertService's own
    // checkCpuAndAlert() is intentionally NOT called here anymore — it was
    // a second, redundant CPU-only pipeline that would have produced
    // duplicate alerts/emails now that AlertService also emails on WARNING.
    await AlertService.checkAndGenerateAlerts(metric, server, statusResult);

    // Broadcast update to WebSocket clients
    broadcastUpdate({
      server_id: metric.server_id,
      serverId: metric.serverId,
      server_name: metric.server_name,
      status: metric.status,
      metrics: {
        cpu: metric.cpu_percent,
        ram: metric.ram_percent,
        disk: metric.disk_percent
      }
    });

    res.json({
      success: true,
      message: 'Metric received',
      status: metric.status,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Backend] Error saving metric:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.use('/api/servers', serverRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/remote-actions', verifyToken, remoteActionsRoutes);
app.use('/api/services', verifyToken, servicesRoutes);
app.use('/api/auth', authRoutes);

// Dashboard summary endpoint
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const servers = await Server.find({ is_active: true });
    const healthSummary = await StatusService.getHealthSummary(servers);
    const alertStats = await Alert.aggregate([
      {
        $match: { status: 'ACTIVE' }
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    const metrics24h = await Metric.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      health: healthSummary,
      alerts: {
        total: alertStats.reduce((sum, item) => sum + item.count, 0),
        by_severity: Object.fromEntries(
          alertStats.map(item => [item._id, item.count])
        )
      },
      metrics_24h: metrics24h,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[Backend] Error getting dashboard summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Thresholds management
app.get('/api/thresholds', async (req, res) => {
  try {
    const thresholds = await Threshold.find();
    res.json(thresholds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thresholds/:metric_name', verifyToken, async (req, res) => {
  try {
    const { metric_name } = req.params;
    const warning_level = Number(req.body.warning_level);
    const critical_level = Number(req.body.critical_level);

    if (
      Number.isNaN(warning_level) || Number.isNaN(critical_level) ||
      warning_level < 0 || warning_level > 100 ||
      critical_level < 0 || critical_level > 100
    ) {
      return res.status(400).json({
        error: 'Valeurs invalides',
        message: 'Les seuils doivent être des nombres compris entre 0 et 100.'
      });
    }

    if (warning_level >= critical_level) {
      return res.status(400).json({
        error: 'Valeurs invalides',
        message: 'Le seuil ALERTE doit être inférieur au seuil CRITIQUE.'
      });
    }

    const threshold = await Threshold.findOneAndUpdate(
      { metric_name },
      { warning_level, critical_level },
      { new: true }
    );

    if (!threshold) {
      return res.status(404).json({ error: 'Métrique non trouvée' });
    }

    console.log(`[Backend] Threshold updated: ${metric_name} warning=${warning_level}% critical=${critical_level}%`);
    res.json(threshold);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alert endpoints
app.get('/api/alerts', async (req, res) => {
  try {
    const { serverId, limit = 100 } = req.query;
    
    const query = serverId ? { serverId } : {};
    const alerts = await Alert.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json(alerts);
  } catch (error) {
    console.error('[Backend] Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/alerts/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { limit = 50 } = req.query;
    
    const alerts = await CpuAlertService.getAlerts(serverId, parseInt(limit));
    res.json(alerts);
  } catch (error) {
    console.error('[Backend] Error fetching server alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/alerts/stats/summary', async (req, res) => {
  try {
    const stats = await CpuAlertService.getAlertStats();
    const recent = await CpuAlertService.getRecentAlerts(10);
    
    res.json({
      summary: stats,
      recent
    });
  } catch (error) {
    console.error('[Backend] Error getting alert stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Periodic tasks
setInterval(async () => {
  try {
    await AlertService.checkAgentConnectivity();
  } catch (error) {
    console.error('[Backend] Error in connectivity check:', error);
  }
}, 15000); // Check every 15 seconds

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Backend] Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
[OK] DevOps Monitoring Dashboard - Backend
API Server:       http://localhost:${PORT}
WebSocket:        ws://localhost:${PORT}
Database:         MongoDB
Status:           Running
  `);

  console.log('Available endpoints:');
  console.log('  GET  /                              - Health check');
  console.log('  POST /metrics                       - Receive metrics from agents');
  console.log('  GET  /api/servers                   - List all servers');
  console.log('  GET  /api/servers/:id               - Get server details');
  console.log('  GET  /api/servers/:id/metrics       - Get server metrics');
  console.log('  GET  /api/servers/:id/alerts        - Get server alerts');
  console.log('  GET  /api/metrics/latest            - Get latest metrics per server (grouped)');
  console.log('  GET  /api/metrics/history/:serverId - Get metric history for specific server');
  console.log('  GET  /api/metrics/stats             - Get aggregated stats across servers');
  console.log('  GET  /api/alerts                    - List all alerts');
  console.log('  PUT  /api/alerts/:id/acknowledge    - Acknowledge alert');
  console.log('  GET  /api/dashboard/summary         - Dashboard summary');
  console.log('  GET  /api/thresholds                - Get thresholds');
  console.log('');
});

module.exports = { app, wss };