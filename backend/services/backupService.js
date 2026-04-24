/**
 * Backup Service
 * Handles backup monitoring and daily backup checks
 */

const Backup = require('../models/Backup');
const Server = require('../models/Server');
const Alert = require('../models/Alert');

// Helper function to get today's date at midnight
function getTodayDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return { start: today, end: tomorrow };
}

// Helper function to simulate backup success or failure (50/50 for daily check)
function simulateBackupStatus() {
  const statuses = ['success', 'failed'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

// Generate random backup size (100MB - 5000MB) for daily check
function generateRandomSize() {
  return Math.floor(Math.random() * (5000 - 100 + 1)) + 100;
}

// Generate random duration (30 - 600 seconds) for daily check
function generateRandomDuration() {
  return Math.floor(Math.random() * (600 - 30 + 1)) + 30;
}

/**
 * Check backup status and create alerts if needed
 * - "failed" status → creates WARNING alert
 * - "missing" status → creates CRITICAL alert
 * - "success" status → resolves existing backup alerts
 * 
 * @param {Object} backup - The backup document
 * @returns {Promise<Object|null>} - The created or updated alert, or null
 */
async function checkBackupStatusAndCreateAlert(backup) {
  try {
    const { server_id, status } = backup;

    if (status === 'success') {
      // Resolve any existing backup-related alerts for this server
      await Alert.updateMany(
        {
          serverId: server_id,
          metric: 'backup_status',
          status: 'ACTIVE'
        },
        {
          status: 'RESOLVED',
          resolvedAt: new Date()
        }
      );
      console.log(`[Backup Service] Resolved backup alerts for server ${server_id}`);
      return null;
    }

    // Determine alert severity based on backup status
    const severity = status === 'missing' ? 'CRITICAL' : 'WARNING';
    const alertType = status === 'missing' ? 'BACKUP_MISSING' : 'BACKUP_FAILED';
    const message = status === 'missing' 
      ? `Backup is missing for server ${server_id}`
      : `Backup failed for server ${server_id}`;

    // Check if alert already exists for this backup status
    const existingAlert = await Alert.findOne({
      serverId: server_id,
      metric: 'backup_status',
      type: alertType,
      status: 'ACTIVE'
    });

    if (existingAlert) {
      // Update existing alert with new backup info
      existingAlert.message = message;
      existingAlert.timestamp = new Date();
      await existingAlert.save();
      console.log(`[Backup Service] Updated ${severity} alert for server ${server_id}`);
      return existingAlert;
    }

    // Create new alert
    const alert = new Alert({
      serverId: server_id,
      type: severity,
      severity: severity,
      status: 'ACTIVE',
      metric: 'backup_status',
      value: status === 'missing' ? 0 : 1,
      threshold: 0,
      message: message,
      timestamp: new Date()
    });

    await alert.save();
    console.log(`[Backup Service] Created ${severity} alert for server ${server_id}: ${message}`);

    return alert;
  } catch (error) {
    console.error(`[Backup Service] Error creating backup alert for server ${backup.server_id}:`, error);
    throw error;
  }
}

/**
 * Simulate a backup for a specific server
 * Runs once per day per server
 * Success rate: 80%, Failure rate: 20%
 * Size: 100-1000 MB
 * Duration: 5-60 seconds
 * 
 * @param {string} server_id - The server ID to simulate backup for
 * @returns {Promise<Object>} - The created backup document
 */
async function simulateBackup(server_id) {
  try {
    if (!server_id) {
      throw new Error('server_id is required');
    }

    // Generate status with 80% success rate
    const random = Math.random();
    const status = random < 0.8 ? 'success' : 'failed';

    // Generate random size between 100-1000 MB
    const size = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;

    // Generate random duration between 5-60 seconds
    const duration = Math.floor(Math.random() * (60 - 5 + 1)) + 5;

    // Create backup record
    const backup = new Backup({
      server_id: server_id,
      date: new Date(),
      status: status,
      size: size,
      duration: duration,
      notes: `Simulated backup (${status === 'success' ? 'successful' : 'failed'})`
    });

    // Save to MongoDB
    await backup.save();

    console.log(`[Backup Service] Simulated backup for server ${server_id}: status=${status}, size=${size}MB, duration=${duration}s`);

    // Check backup status and create alerts if needed
    await checkBackupStatusAndCreateAlert(backup);

    return backup;
  } catch (error) {
    console.error(`[Backup Service] Error simulating backup for server ${server_id}:`, error);
    throw error;
  }
}

/**
 * Daily backup check job
 * Runs at 02:00 AM every day
 * Checks if backups exist for each server
 * Creates missing backup records with status "missing"
 */
async function runDailyBackupCheck() {
  try {
    console.log('[Backup Service] Starting daily backup check at', new Date().toLocaleString());

    // Get all active servers
    const servers = await Server.find({});
    console.log(`[Backup Service] Found ${servers.length} servers to check`);

    if (servers.length === 0) {
      console.log('[Backup Service] No servers found, skipping backup check');
      return;
    }

    const dateRange = getTodayDateRange();
    const results = {
      total_servers: servers.length,
      backups_found: 0,
      backups_missing: 0,
      backups_created: 0,
      backups_simulated: 0,
      details: []
    };

    // Check each server
    for (const server of servers) {
      const serverId = server.server_id || server._id;

      // Check if backup exists for today
      const existingBackup = await Backup.findOne({
        server_id: serverId,
        date: {
          $gte: dateRange.start,
          $lt: dateRange.end
        }
      });

      if (existingBackup) {
        console.log(`[Backup Service] Backup exists for server ${serverId}: status = ${existingBackup.status}`);
        results.backups_found++;
        results.details.push({
          server_id: serverId,
          action: 'found',
          status: existingBackup.status,
          date: existingBackup.date
        });
        
        // Check existing backup status and create alerts if needed
        await checkBackupStatusAndCreateAlert(existingBackup);
      } else {
        // Simulate backup status randomly
        const status = simulateBackupStatus();
        const size = generateRandomSize();
        const duration = generateRandomDuration();

        const backup = new Backup({
          server_id: serverId,
          date: new Date(),
          status: status,
          size: size,
          duration: duration,
          notes: `Auto-generated from daily backup check (simulated: ${status})`
        });

        await backup.save();

        console.log(`[Backup Service] Created backup for server ${serverId}: status = ${status}, size = ${size}MB, duration = ${duration}s`);

        // Check backup status and create alerts if needed
        await checkBackupStatusAndCreateAlert(backup);

        results.backups_created++;
        results.backups_simulated++;
        results.details.push({
          server_id: serverId,
          action: 'created',
          status: status,
          size: size,
          duration: duration,
          date: backup.date
        });
      }
    }

    results.backups_missing = results.total_servers - results.backups_found - results.backups_simulated;

    console.log('[Backup Service] Daily backup check completed');
    console.log('[Backup Service] Summary:', JSON.stringify(results, null, 2));

    return results;
  } catch (error) {
    console.error('[Backup Service] Error running daily backup check:', error);
    throw error;
  }
}

module.exports = {
  simulateBackup,
  checkBackupStatusAndCreateAlert,
  runDailyBackupCheck
};
