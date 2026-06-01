/**
 * Backup Cron Job Service
 * Runs daily at midnight (00:00) to simulate and record backup operations
 */

const cron = require('node-cron');
const Backup = require('../models/Backup');
const Server = require('../models/Server');
const BackupSocketService = require('./backupSocketService');
const BackupAlertService = require('./backupAlertService');

class BackupCronService {
  /**
   * Initialize the backup cron job
   * Runs every day at 00:00 (midnight)
   */
  static initializeBackupCron() {
    // Schedule: "0 0 * * *" means every day at 00:00 (midnight)
    const task = cron.schedule('0 0 * * *', async () => {
      console.log('[Backup Cron] Starting daily backup job at', new Date());
      await this.runDailyBackup();
    });

    console.log('[Backup Cron] Daily backup job scheduled for 00:00 every day');
    return task;
  }

  /**
   * Run the daily backup for all servers
   */
  static async runDailyBackup() {
    try {
      // Fetch all active servers
      const servers = await Server.find();

      if (!servers || servers.length === 0) {
        console.log('[Backup Cron] No servers found for backup');
        return;
      }

      console.log(`[Backup Cron] Processing ${servers.length} servers`);

      // Process backup for each server
      const backupResults = await Promise.all(
        servers.map(server => this.simulateServerBackup(server))
      );

      // Count results
      const successful = backupResults.filter(r => r.status === 'OK').length;
      const failed = backupResults.filter(r => r.status === 'FAILED').length;

      console.log(
        `[Backup Cron] Backup complete - OK: ${successful}, FAILED: ${failed}`
      );
    } catch (error) {
      console.error('[Backup Cron] Error during backup job:', error.message);
    }
  }

  /**
   * Simulate backup process for a single server
   */
  static async simulateServerBackup(server) {
    try {
      // Randomly determine if backup succeeds (80% success rate)
      const isSuccess = Math.random() > 0.2;

      // Mock data for duration (in seconds): 60 to 600 seconds
      const duration = Math.floor(Math.random() * 540) + 60;

      // Mock data for size (in MB): 100 to 5000 MB
      const size = Math.floor(Math.random() * 4900) + 100;

      // Determine status
      const status = isSuccess ? 'OK' : 'FAILED';

      // Create backup record
      const backup = new Backup({
        serverId: server.server_id,
        date: new Date(),
        status: status,
        duration: duration,
        size: size,
        createdAt: new Date()
      });

      // Save to database
      await backup.save();

      // Check backup status and trigger alerts if needed
      try {
        await BackupAlertService.checkBackupAndAlert(backup, server);
      } catch (error) {
        console.error('[Backup Cron] Error checking backup alerts:', error);
      }

      // Emit real-time socket.io event
      try {
        BackupSocketService.emitBackupUpdate(server.server_id, {
          status: backup.status,
          duration: backup.duration,
          size: backup.size,
          date: backup.date
        });
      } catch (error) {
        console.error('[Backup Cron] Error emitting socket event:', error);
      }

      console.log(
        `[Backup Cron] Server ${server.server_id}: ${status} ` +
        `(Duration: ${duration}s, Size: ${size}MB)`
      );

      return { serverId: server.server_id, status, duration, size };
    } catch (error) {
      console.error(
        `[Backup Cron] Error processing server ${server.server_id}:`,
        error.message
      );

      // Still create a FAILED backup record for this server
      try {
        const backup = new Backup({
          serverId: server.server_id,
          date: new Date(),
          status: 'FAILED',
          duration: 0,
          size: 0,
          createdAt: new Date()
        });
        await backup.save();
      } catch (saveError) {
        console.error('[Backup Cron] Failed to save error backup:', saveError.message);
      }

      return { serverId: server.server_id, status: 'FAILED', duration: 0, size: 0 };
    }
  }

  /**
   * Stop the backup cron job
   */
  static stopBackupCron(task) {
    if (task) {
      task.stop();
      console.log('[Backup Cron] Backup cron job stopped');
    }
  }

  /**
   * Manually trigger a backup (for testing)
   */
  static async triggerBackupNow() {
    console.log('[Backup Cron] Manually triggering backup...');
    await this.runDailyBackup();
  }

  /**
   * Initialize the late backup check cron job
   * Runs every hour to check if servers are missing today's backup
   */
  static initializeLateBackupCheck() {
    // Schedule: "0 * * * *" means every hour at minute 0
    const task = cron.schedule('0 * * * *', async () => {
      console.log('[Late Backup Check] Running hourly check at', new Date());
      await this.checkAndCreateLateBackups();
    });

    console.log('[Late Backup Check] Hourly late backup check scheduled');
    return task;
  }

  /**
   * Check all servers for missing backups today
   * If a server has no backup from today, create a LATE backup entry
   */
  static async checkAndCreateLateBackups() {
    try {
      // Get all servers
      const servers = await Server.find();

      if (!servers || servers.length === 0) {
        console.log('[Late Backup Check] No servers found');
        return;
      }

      // Get start and end of today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      console.log(`[Late Backup Check] Checking ${servers.length} servers for missing backups`);

      let lateCount = 0;

      // Check each server
      for (const server of servers) {
        try {
          // Check if server has any backup from today
          const backupToday = await Backup.findOne({
            serverId: server.server_id,
            date: {
              $gte: today,
              $lt: tomorrow
            }
          });

          if (!backupToday) {
            // No backup found for today - create a LATE backup entry
            const lateBackup = new Backup({
              serverId: server.server_id,
              date: new Date(),
              status: 'LATE',
              duration: 0,
              size: 0,
              createdAt: new Date()
            });

            await lateBackup.save();
            lateCount++;

            // Check backup status and trigger alerts if needed
            try {
              await BackupAlertService.checkBackupAndAlert(lateBackup, server);
            } catch (error) {
              console.error('[Late Backup Check] Error checking backup alerts:', error);
            }

            // Emit real-time socket.io events
            try {
              BackupSocketService.emitLateBackupAlert(server.server_id);
              BackupSocketService.emitBackupUpdate(server.server_id, {
                status: 'LATE',
                duration: 0,
                size: 0,
                date: lateBackup.date
              });
            } catch (error) {
              console.error('[Late Backup Check] Error emitting socket event:', error);
            }

            console.log(
              `[Late Backup Check] Server ${server.server_id}: Created LATE backup entry`
            );
          }
        } catch (error) {
          console.error(
            `[Late Backup Check] Error checking server ${server.server_id}:`,
            error.message
          );
        }
      }

      console.log(
        `[Late Backup Check] Completed - ${lateCount} LATE backup entries created`
      );
    } catch (error) {
      console.error('[Late Backup Check] Error during check:', error.message);
    }
  }

  /**
   * Stop the late backup check cron job
   */
  static stopLateBackupCheck(task) {
    if (task) {
      task.stop();
      console.log('[Late Backup Check] Cron job stopped');
    }
  }
}

module.exports = BackupCronService;
