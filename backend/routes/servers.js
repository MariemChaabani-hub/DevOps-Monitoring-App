/**
 * Server Management API Routes
 */

const express = require('express');
const { NodeSSH } = require('node-ssh');
const router = express.Router();
const Server = require('../models/Server');
const Metric = require('../models/Metric');
const StatusService = require('../services/statusService');
const { verifyToken, requireRole } = require('../middleware/auth');

// Every mutating route below (create/update/delete/test-ssh) requires an
// authenticated admin — these expose or change SSH credentials, unlike the
// read-only GET routes, which stay public (used by the dashboard and
// mobile app without a login).
const requireAdmin = [verifyToken, requireRole('admin')];

// ssh_password must never leave the server in a GET response — the
// frontend only ever sends a new one when the admin actually wants to
// change it, never reads the existing one back.
const stripPassword = (serverDoc) => {
  const obj = serverDoc.toObject ? serverDoc.toObject() : { ...serverDoc };
  delete obj.ssh_password;
  return obj;
};

// Get all servers with current status
router.get('/', async (req, res) => {
  try {
    const servers = await Server.find({ is_active: true })
      .sort({ created_at: -1 });

    const serversWithStatus = await Promise.all(
      servers.map(async (server) => {
        // Sorted by createdAt (server-side receipt order), not the
        // agent-supplied timestamp — see the matching comment in
        // routes/metrics.js's GET /latest for why.
        const latestMetric = await Metric.findOne({ server_id: server.server_id })
          .sort({ createdAt: -1 })
          .exec();

        return {
          ...stripPassword(server),
          last_metric: latestMetric || null
        };
      })
    );

    res.json(serversWithStatus);
  } catch (error) {
    console.error('[Servers API] Error fetching servers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get server metrics (last N records or time range)
router.get('/*server_id/metrics', async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }
    const { limit = 100, minutes = 60 } = req.query;

    const timeThreshold = new Date(Date.now() - minutes * 60 * 1000);

    const metrics = await Metric.find({
      server_id,
      timestamp: { $gte: timeThreshold }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .exec();

    res.json(metrics);
  } catch (error) {
    console.error('[Servers API] Error fetching metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get server alerts
router.get('/*server_id/alerts', async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }
    const { status = 'ACTIVE' } = req.query;

    const Alert = require('../models/Alert');
    const alerts = await Alert.find({
      serverId: server_id,
      status
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .exec();

    res.json(alerts);
  } catch (error) {
    console.error('[Servers API] Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test SSH connectivity for a server — either its already-saved
// credentials, or credentials still being typed in the config form
// (passed in the body, used only for this one check, never persisted).
// POST, not GET: a GET would put the SSH password in the URL, which ends
// up in access logs and browser history.
router.post('/*server_id/test-ssh', requireAdmin, async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }

    const server = await Server.findOne({ server_id }).lean();
    const creds = {
      ip_address: req.body.ip_address || server?.ip_address,
      ssh_username: req.body.ssh_username || server?.ssh_username,
      ssh_password: req.body.ssh_password || server?.ssh_password,
      ssh_port: req.body.ssh_port || server?.ssh_port || 22
    };

    if (!creds.ip_address || !creds.ssh_username || !creds.ssh_password) {
      return res.status(400).json({
        success: false,
        error: 'Informations SSH incomplètes',
        message: 'Adresse IP, utilisateur SSH et mot de passe SSH sont requis pour tester la connexion.'
      });
    }

    const ssh = new NodeSSH();
    try {
      await ssh.connect({
        host: creds.ip_address,
        username: creds.ssh_username,
        password: creds.ssh_password,
        port: creds.ssh_port,
        readyTimeout: 8000
      });
      const result = await ssh.execCommand('echo ok');
      await ssh.dispose();

      if (result.code !== 0) {
        return res.status(400).json({
          success: false,
          error: 'Connexion SSH établie mais la commande de test a échoué',
          message: result.stderr || 'La commande de test a échoué.'
        });
      }

      res.json({ success: true, message: 'Connexion SSH réussie ✅' });
    } catch (sshError) {
      res.status(400).json({
        success: false,
        error: 'Échec de la connexion SSH',
        message: `Impossible de se connecter : ${sshError.message}`
      });
    }
  } catch (error) {
    console.error('[Servers API] Error testing SSH connection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single server with latest metrics
router.get('/*server_id', async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }

    const server = await Server.findOne({ server_id });
    if (!server) {
      return res.status(404).json({ error: 'Serveur non trouvé' });
    }

    const latestMetric = await Metric.findOne({ server_id })
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      ...stripPassword(server),
      latest_metric: latestMetric || null
    });
  } catch (error) {
    console.error('[Servers API] Error fetching server:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register new server
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      server_id, name, location, description, alert_email,
      ip_address, ssh_username, ssh_password, ssh_port
    } = req.body;

    if (!server_id || !name) {
      return res.status(400).json({ error: 'server_id and name are required' });
    }
    if (!ip_address || !ssh_username || !ssh_password) {
      return res.status(400).json({
        error: 'Informations SSH incomplètes',
        message: 'Adresse IP, utilisateur SSH et mot de passe SSH sont requis.'
      });
    }

    const existingServer = await Server.findOne({ server_id });
    if (existingServer) {
      return res.status(409).json({ error: 'Ce serveur existe déjà' });
    }

    const newServer = new Server({
      server_id,
      name,
      location: location || 'Unknown',
      description: description || '',
      alert_email: alert_email || null,
      status: 'OK',
      ip_address,
      ssh_username,
      ssh_password,
      ssh_port: ssh_port || 22
    });

    await newServer.save();
    res.status(201).json(stripPassword(newServer));
  } catch (error) {
    console.error('[Servers API] Error creating server:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update server
router.put('/*server_id', requireAdmin, async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }
    const {
      name, location, description, alert_email, is_active,
      ip_address, ssh_username, ssh_password, ssh_port
    } = req.body;

    const server = await Server.findOne({ server_id });
    if (!server) {
      return res.status(404).json({ error: 'Serveur non trouvé' });
    }

    if (name) server.name = name;
    if (location) server.location = location;
    if (description) server.description = description;
    if (alert_email) server.alert_email = alert_email;
    if (is_active !== undefined) server.is_active = is_active;
    if (ip_address) server.ip_address = ip_address;
    if (ssh_username) server.ssh_username = ssh_username;
    // Only overwrite the stored password if a new one was actually typed —
    // the edit form never receives the current one back (see stripPassword
    // on the GET routes), so an empty field here means "leave it as is",
    // not "clear it".
    if (ssh_password) server.ssh_password = ssh_password;
    if (ssh_port) server.ssh_port = ssh_port;

    await server.save();
    res.json(stripPassword(server));
  } catch (error) {
    console.error('[Servers API] Error updating server:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete server
router.delete('/*server_id', requireAdmin, async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }

    const result = await Server.findOneAndDelete({ server_id });
    if (!result) {
      return res.status(404).json({ error: 'Serveur non trouvé' });
    }

    // Also delete associated metrics and alerts
    await Metric.deleteMany({ server_id });
    const Alert = require('../models/Alert');
    await Alert.deleteMany({ server_id });

    res.json({ message: 'Serveur et données associées supprimés' });
  } catch (error) {
    console.error('[Servers API] Error deleting server:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
