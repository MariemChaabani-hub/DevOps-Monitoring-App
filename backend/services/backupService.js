/**
 * Backup Service
 * Handles backup monitoring and daily backup checks
 */

const mongoose = require('mongoose');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Backup = require('../models/Backup');
const Server = require('../models/Server');
const Alert = require('../models/Alert');
const EmailService = require('./emailService');

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
  const statuses = ['OK', 'FAILED'];
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
    const { serverId, status } = backup;

    // Send a daily completion email for THIS backup regardless of status
    // (OK, FAILED or LATE) — separate from the CRITICAL-only alert email
    // sent further below for FAILED/LATE.
    try {
      const server = await Server.findOne({ server_id: serverId });
      const adminEmail = process.env.ADMIN_EMAIL || 'mariemchaabani39@gmail.com';
      const emailResult = await EmailService.sendBackupCompletionEmail({
        serverId,
        serverName: server && server.name,
        status,
        size: backup.size || 0,
        duration: backup.duration || 0,
        timestamp: backup.date,
        adminEmail,
        errorMessage: status === 'FAILED' ? 'Backup process did not complete successfully' : null
      });
      console.log(`[Backup Service] Completion email result for ${serverId}:`, emailResult);
    } catch (emailError) {
      console.error(`[Backup Service] Failed to send backup completion email for ${serverId}:`, emailError);
    }

    if (status === 'OK') {
      // Resolve any existing backup-related alerts for this server
      await Alert.updateMany(
        {
          serverId: serverId,
          metric: 'backup_status',
          status: 'ACTIVE'
        },
        {
          status: 'RESOLVED',
          resolvedAt: new Date()
        }
      );
      console.log(`[Backup Service] Resolved backup alerts for server ${serverId}`);
      return null;
    }

    // Determine alert severity based on backup status
    const severity = status === 'LATE' ? 'CRITICAL' : 'WARNING';
    const alertType = status === 'LATE' ? 'BACKUP_MISSING' : 'BACKUP_FAILED';
    const message = status === 'LATE'
      ? `Sauvegarde manquante pour le serveur ${serverId}`
      : `Échec de la sauvegarde pour le serveur ${serverId}`;

    // Check if alert already exists for this backup status
    const existingAlert = await Alert.findOne({
      serverId: serverId,
      metric: 'backup_status',
      type: alertType,
      status: 'ACTIVE'
    });

    if (existingAlert) {
      // Update existing alert with new backup info
      existingAlert.message = message;
      existingAlert.timestamp = new Date();
      await existingAlert.save();
      console.log(`[Backup Service] Updated ${severity} alert for server ${serverId}`);
      return existingAlert;
    }

    // Create new alert
    const alert = new Alert({
      serverId: serverId,
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
    console.log(`[Backup Service] Created ${severity} alert for server ${serverId}: ${message}`);

    // Send email notification for backup failures
    if (status === 'FAILED' || status === 'LATE') {
      try {
        const emailService = require('./emailService');
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        
        const emailData = {
          serverId: serverId,
          type: status === 'LATE' ? 'BACKUP_LATE' : 'BACKUP_FAILED',
          severity: 'CRITICAL',
          status: status,
          duration: backup.duration || 0,
          size: backup.size || 0,
          date: backup.date,
          message: message,
          timestamp: new Date(),
          adminEmail: adminEmail
        };

        const emailResult = await emailService.sendBackupAlertEmail(emailData);
        console.log(`[Backup Service] Email notification result for ${serverId}:`, emailResult);
      } catch (emailError) {
        console.error(`[Backup Service] Failed to send backup failure email for ${serverId}:`, emailError);
        // Don't throw error - email failure shouldn't break the backup process
      }
    }

    return alert;
  } catch (error) {
    console.error(`[Backup Service] Error creating backup alert for server ${backup.serverId}:`, error);
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
    const status = random < 0.8 ? 'OK' : 'FAILED';

    // Generate random size between 100-1000 MB
    const size = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;

    // Generate random duration between 5-60 seconds
    const duration = Math.floor(Math.random() * (60 - 5 + 1)) + 5;

    // Create backup record
    const backup = new Backup({
      serverId: server_id,
      date: new Date(),
      status: status,
      size: size,
      duration: duration
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
        serverId: serverId,
        date: {
          $gte: dateRange.start,
          $lt: dateRange.end
        }
      });

      if (existingBackup) {
        console.log(`[Backup Service] Backup exists for server ${serverId}: status = ${existingBackup.status}`);
        results.backups_found++;
        results.details.push({
          serverId: serverId,
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
          serverId: serverId,
          date: new Date(),
          status: status,
          size: size,
          duration: duration
        });

        await backup.save();

        console.log(`[Backup Service] Created backup for server ${serverId}: status = ${status}, size = ${size}MB, duration = ${duration}s`);

        // Check backup status and create alerts if needed
        await checkBackupStatusAndCreateAlert(backup);

        results.backups_created++;
        results.backups_simulated++;
        results.details.push({
          serverId: serverId,
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

/**
 * Calculate backup indicators for a specific server
 * 
 * @param {string} serverId - The server ID
 * @returns {Promise<Object>} - Summary object with:
 *   - last_successful_backup_date
 *   - last_backup_status
 *   - average_duration_seconds
 *   - average_size_mb
 *   - total_backups
 *   - status_breakdown
 */
async function calculateBackupIndicators(serverId) {
  try {
    console.log(`[Backup Service] Calculating indicators for server ${serverId}`);

    // Fetch all backups for this server
    const backups = await Backup.find({ serverId })
      .sort({ date: -1 })
      .exec();

    if (!backups || backups.length === 0) {
      console.log(`[Backup Service] No backups found for server ${serverId}`);
      return {
        serverId,
        last_successful_backup_date: null,
        last_backup_status: null,
        average_duration_seconds: 0,
        average_size_mb: 0,
        total_backups: 0,
        status_breakdown: {
          ok: 0,
          failed: 0,
          late: 0
        },
        has_data: false
      };
    }

    // Find last successful backup
    const lastSuccessful = backups.find(b => b.status === 'OK');
    const lastBackupStatus = backups.length > 0 ? backups[0].status : null;

    // Calculate averages
    let totalDuration = 0;
    let totalSize = 0;
    let durationCount = 0;
    let sizeCount = 0;

    const statusBreakdown = {
      ok: 0,
      failed: 0,
      late: 0
    };

    for (const backup of backups) {
      // Duration and size calculation (skip 0 values for LATE backups)
      if (backup.duration > 0) {
        totalDuration += backup.duration;
        durationCount++;
      }
      if (backup.size > 0) {
        totalSize += backup.size;
        sizeCount++;
      }

      // Status breakdown
      if (backup.status === 'OK') {
        statusBreakdown.ok++;
      } else if (backup.status === 'FAILED') {
        statusBreakdown.failed++;
      } else if (backup.status === 'LATE') {
        statusBreakdown.late++;
      }
    }

    const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;
    const avgSize = sizeCount > 0 ? Math.round(totalSize / sizeCount) : 0;

    const indicators = {
      serverId,
      last_successful_backup_date: lastSuccessful ? lastSuccessful.date : null,
      last_backup_status: lastBackupStatus,
      last_backup_date: backups.length > 0 ? backups[0].date : null,
      average_duration_seconds: avgDuration,
      average_size_mb: avgSize,
      total_backups: backups.length,
      status_breakdown: statusBreakdown,
      health_score: calculateHealthScore(statusBreakdown, backups.length),
      has_data: true
    };

    console.log(
      `[Backup Service] Indicators calculated for ${serverId}: ` +
      `${indicators.total_backups} backups, avg duration ${indicators.average_duration_seconds}s, ` +
      `avg size ${indicators.average_size_mb}MB`
    );

    return indicators;
  } catch (error) {
    console.error(`[Backup Service] Error calculating indicators for ${serverId}:`, error);
    throw error;
  }
}

/**
 * Calculate a health score (0-100) based on backup status breakdown
 * 
 * @param {Object} statusBreakdown - {ok, failed, late}
 * @param {number} total - Total number of backups
 * @returns {number} - Health score 0-100
 */
function calculateHealthScore(statusBreakdown, total) {
  if (total === 0) return 0;

  const okCount = statusBreakdown.ok || 0;
  const failedCount = statusBreakdown.failed || 0;
  const lateCount = statusBreakdown.late || 0;

  // Score formula: (ok_count * 100 - failed_count * 50 - late_count * 25) / total
  // Results in a 0-100 range
  const score = Math.max(0, Math.min(100, (okCount * 100 - failedCount * 50 - lateCount * 25) / total));
  return Math.round(score);
}

const BACKUP_DB_NAME = 'monitoring';
// Collections that can never legitimately be empty in a running instance —
// a dump missing either of these, or finding them empty, is a dump of the
// wrong database (or a broken connection), not a real backup. This is
// exactly the check that was missing for the two months a leftover local
// "mongodb" container quietly got dumped instead of Atlas: every dump
// "succeeded" and contained nothing but an empty admin.system.version.
const REQUIRED_NONEMPTY_COLLECTIONS = ['servers', 'metrics'];
const MIN_DUMP_SIZE_BYTES = 5 * 1024; // blunt backstop alongside the per-collection checks
const BACKUP_RETENTION_COUNT = parseInt(process.env.BACKUP_RETENTION_COUNT, 10) || 7;

/**
 * Perform a real MongoDB database backup via `mongodump --uri`, against
 * whatever MONGODB_URI actually points to (MongoDB Atlas in production).
 * A prior version ran `docker exec mongodb mongodump` first — dumping
 * whatever local container happened to be named "mongodb" on the VPS's
 * Docker daemon, never Atlas. That's gone: this is the only path now, and
 * its output is validated (see validateDump) before ever being reported
 * as a success, since an exit code of 0 alone was exactly what made the
 * two months of empty dumps look fine.
 *
 * @param {string} serverId - The server ID (e.g. 'default-server')
 * @returns {Promise<Object>} - { status: 'OK'|'FAILED', size: Number, duration: Number, filename: String|null, error?: String }
 */
async function performRealDatabaseBackup(serverId) {
  const startTime = Date.now();
  console.log(`[Backup Service] Starting real database backup for ${serverId}...`);

  const backupDir = '/app/backups';
  if (!fs.existsSync(backupDir)) {
    try {
      fs.mkdirSync(backupDir, { recursive: true });
    } catch (mkdirError) {
      console.error(`[Backup Service] Error creating backup directory ${backupDir}:`, mkdirError);
    }
  }

  const now = new Date();
  const dateStr = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
  const dirname = `backup-${serverId}-${dateStr}`;
  const outDir = path.join(backupDir, dirname);

  // Dumped as a directory (--out), not a single --archive --gzip stream —
  // that's what makes it possible to check the actual content below
  // (one .bson file per collection) without a second tool to unpack an
  // opaque archive first.
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/pfe-monitoring';

  const result = await new Promise((resolve) => {
    console.log(`[Backup Service] Running: mongodump --uri <redacted> --db=${BACKUP_DB_NAME} --out=${outDir}`);
    const child = spawn('mongodump', ['--uri', uri, '--db', BACKUP_DB_NAME, '--out', outDir]);

    let stderrData = '';
    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code) => {
      const duration = Math.round((Date.now() - startTime) / 1000);

      if (code !== 0) {
        console.error(`[Backup Service] mongodump exited with code ${code}`);
        console.error(`[Backup Service] stderr: ${stderrData}`);
        if (fs.existsSync(outDir)) {
          try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (e) {}
        }
        resolve({
          status: 'FAILED',
          size: 0,
          duration,
          filename: null,
          error: `mongodump exited with code ${code}: ${stderrData.trim() || 'no stderr output'}`
        });
        return;
      }

      // Exit code 0 is not proof of a real backup by itself — verify what
      // actually landed on disk before trusting it.
      const validation = validateDump(outDir);
      if (!validation.valid) {
        console.error(`[Backup Service] Dump validation failed: ${validation.reason}`);
        resolve({
          status: 'FAILED',
          size: 0,
          duration,
          filename: null,
          error: `Dump créé mais validation échouée : ${validation.reason}`
        });
        return;
      }

      const sizeInMB = parseFloat((validation.totalBytes / (1024 * 1024)).toFixed(2));
      console.log(`[Backup Service] Backup validated OK. Dir: ${dirname}, Size: ${sizeInMB}MB, Duration: ${duration}s`);
      resolve({
        status: 'OK',
        size: sizeInMB,
        duration,
        filename: dirname,
        filepath: outDir
      });
    });

    child.on('error', (err) => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.error('[Backup Service] Failed to start mongodump:', err);
      if (fs.existsSync(outDir)) {
        try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (e) {}
      }
      resolve({
        status: 'FAILED',
        size: 0,
        duration,
        filename: null,
        error: `Impossible de démarrer mongodump : ${err.message}`
      });
    });
  });

  if (result.status === 'OK') {
    pruneOldBackupDirs(backupDir, serverId, BACKUP_RETENTION_COUNT);
  }

  return result;
}

/**
 * Checks that a dump directory actually contains the real database rather
 * than just trusting mongodump's exit code. Returns
 * { valid, reason, totalBytes }.
 */
function validateDump(outDir) {
  const dbDir = path.join(outDir, BACKUP_DB_NAME);

  if (!fs.existsSync(dbDir)) {
    return { valid: false, reason: `répertoire "${BACKUP_DB_NAME}" absent du dump`, totalBytes: 0 };
  }

  for (const collection of REQUIRED_NONEMPTY_COLLECTIONS) {
    const bsonPath = path.join(dbDir, `${collection}.bson`);
    if (!fs.existsSync(bsonPath)) {
      return { valid: false, reason: `collection "${collection}" absente du dump`, totalBytes: 0 };
    }
    if (fs.statSync(bsonPath).size === 0) {
      return { valid: false, reason: `collection "${collection}" vide dans le dump`, totalBytes: 0 };
    }
  }

  const totalBytes = getDirectorySize(outDir);
  if (totalBytes < MIN_DUMP_SIZE_BYTES) {
    return {
      valid: false,
      reason: `taille totale du dump (${totalBytes} octets) sous le seuil minimal (${MIN_DUMP_SIZE_BYTES} octets)`,
      totalBytes
    };
  }

  return { valid: true, reason: null, totalBytes };
}

function getDirectorySize(dirPath) {
  let total = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    total += entry.isDirectory() ? getDirectorySize(entryPath) : fs.statSync(entryPath).size;
  }
  return total;
}

/**
 * Keeps only the `keepCount` most recent backup directories for a server
 * on disk, deleting older ones. Dumping as an uncompressed directory
 * (needed to validate content directly, see performRealDatabaseBackup)
 * uses noticeably more space than the old single gzipped archive — this
 * is what keeps that bounded. Configurable via BACKUP_RETENTION_COUNT,
 * defaults to 7. Only runs after a validated success, and only prunes
 * files on disk — the Backup documents in MongoDB (dashboard history) are
 * untouched.
 */
function pruneOldBackupDirs(backupDir, serverId, keepCount) {
  try {
    const prefix = `backup-${serverId}-`;
    const entries = fs.readdirSync(backupDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith(prefix))
      .sort((a, b) => b.name.localeCompare(a.name)); // ISO-like timestamp in the name sorts chronologically

    const toDelete = entries.slice(keepCount);
    for (const entry of toDelete) {
      const entryPath = path.join(backupDir, entry.name);
      fs.rmSync(entryPath, { recursive: true, force: true });
      console.log(`[Backup Service] Pruned old backup: ${entry.name}`);
    }
  } catch (error) {
    console.error('[Backup Service] Error pruning old backups:', error);
  }
}

module.exports = {
  simulateBackup,
  performRealDatabaseBackup,
  checkBackupStatusAndCreateAlert,
  runDailyBackupCheck,
  calculateBackupIndicators
};
