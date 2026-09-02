/**
 * Backup Alert Service
 * Monitors backup status and triggers alerts for FAILED/LATE backups
 * 
 * Alert Rules:
 *   - FAILED backup → CRITICAL alert (triggers email)
 *   - LATE backup → WARNING alert (triggers log)
 *   - Auto-resolves when backup returns to OK
 */

const Alert = require('../models/Alert');
const Server = require('../models/Server');

class BackupAlertService {
  /**
   * Check if an active (unresolved) alert exists for backup of this server
   */
  static async hasActiveBackupAlert(serverId) {
    try {
      const activeAlert = await Alert.findOne({
        serverId,
        type: { $in: ['BACKUP_FAILED', 'BACKUP_LATE'] },
        status: 'ACTIVE'
      });

      if (activeAlert) {
        console.log(
          `[BackupAlert] ✓ Found existing ACTIVE ${activeAlert.type} alert for ${serverId}`
        );
        return true;
      }

      console.log(
        `[BackupAlert] ✓ No existing ACTIVE backup alert for ${serverId} - will create new alert`
      );
      return false;
    } catch (error) {
      console.error('[BackupAlert] Error checking active alert:', error);
      return false;
    }
  }

  /**
   * Check backup status and trigger alerts if needed
   * Called after backup creation or update
   */
  static async checkBackupAndAlert(backup, server, adminEmail = 'mariemchaabani39@gmail.com') {
    try {
      const serverId = backup.serverId || backup.server_id;
      const status = backup.status;

      console.log(`[BackupAlert] Checking backup for ${serverId}: status=${status}`);

      // Determine alert level based on backup status
      let alertType = null;
      let severity = null;
      let message = null;

      if (status === 'FAILED') {
        alertType = 'BACKUP_FAILED';
        severity = 'CRITICAL';
        message = `Échec de la sauvegarde sur ${server?.name || serverId}`;
      } else if (status === 'LATE') {
        alertType = 'BACKUP_LATE';
        severity = 'WARNING';
        message = `Sauvegarde manquante ou en retard sur ${server?.name || serverId}`;
      }

      // No alert needed if backup is OK
      if (!alertType) {
        // Auto-resolve any ACTIVE backup alerts when backup returns to OK
        const resolved = await Alert.updateMany(
          {
            serverId,
            type: { $in: ['BACKUP_FAILED', 'BACKUP_LATE'] },
            status: 'ACTIVE'
          },
          { status: 'RESOLVED', resolvedAt: new Date() }
        );

        if (resolved.modifiedCount > 0) {
          console.log(
            `[BackupAlert] ✓ Auto-resolved ${resolved.modifiedCount} backup alert(s) for ${serverId} - backup OK`
          );
        }

        return null;
      }

      // Check if we already have an ACTIVE alert for this type
      const hasActive = await this.hasActiveBackupAlert(serverId);
      if (hasActive) {
        console.log(
          `[BackupAlert] ⊘ Skipping duplicate: ACTIVE ${alertType} alert already exists for ${serverId}`
        );
        return null;
      }

      // Create alert in database
      const alertDoc = new Alert({
        serverId,
        type: alertType,
        severity: severity,
        status: 'ACTIVE',
        metric: 'backup_status',
        value: status === 'FAILED' ? 0 : 1,
        threshold: 1,
        message: message,
        timestamp: new Date()
      });

      await alertDoc.save();
      console.log(
        `[BackupAlert] ✓ Created ${severity} alert for ${serverId}: ${message}`
      );

      // No email here — this function only keeps the Alert record (for the
      // dashboard/audit trail) up to date. The single email per backup is
      // sent by EmailService.sendBackupCompletionEmail, called once by
      // backupCronService.js right after this function returns. Sending
      // one here too used to mean a FAILED backup produced two separate
      // emails for the same event.
      console.log(`[BackupAlert] Alert logged (${severity}): ${message}`);

      return alertDoc;
    } catch (error) {
      console.error('[BackupAlert] Error in checkBackupAndAlert:', error);
      return null;
    }
  }

  /**
   * Resolve all backup alerts for a server
   */
  static async resolveBackupAlerts(serverId) {
    try {
      const resolved = await Alert.updateMany(
        {
          serverId,
          type: { $in: ['BACKUP_FAILED', 'BACKUP_LATE'] },
          status: 'ACTIVE'
        },
        { status: 'RESOLVED', resolvedAt: new Date() }
      );

      if (resolved.modifiedCount > 0) {
        console.log(
          `[BackupAlert] ✓ Resolved ${resolved.modifiedCount} alert(s) for ${serverId}`
        );
      }

      return resolved;
    } catch (error) {
      console.error('[BackupAlert] Error resolving alerts:', error);
      return null;
    }
  }
}

module.exports = BackupAlertService;
