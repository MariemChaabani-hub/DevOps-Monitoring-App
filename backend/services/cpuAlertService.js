/**
 * Alert Service
 * Checks CPU thresholds and manages alerts
 * Production Rules:
 *   - CPU > 80% → WARNING alert
 *   - CPU > 90% → CRITICAL alert (triggers email notification)
 *   - Auto-resolves when CPU returns to normal
 */

const Alert = require('../models/Alert');
const EmailService = require('./emailService');

class AlertService {
  /**
   * Check if an active (unresolved) alert exists for this server and type
   * Only skip if alert is already ACTIVE - allow new alerts for resolved cases
   */
  static async hasActiveAlert(serverId, type) {
    try {
      const activeAlert = await Alert.findOne({
        serverId,
        type,
        status: 'ACTIVE'  // Only check for ACTIVE alerts
      });

      if (activeAlert) {
        console.log(`[AlertService] ✓ Found existing ACTIVE ${type} alert for ${serverId} (created ${new Date(activeAlert.timestamp).toISOString()})`);
        return true;
      }
      
      console.log(`[AlertService] ✓ No existing ACTIVE ${type} alert for ${serverId} - will create new alert`);
      return false;
    } catch (error) {
      console.error('[AlertService] Error checking active alert:', error);
      return false;
    }
  }

  /**
   * Check CPU metrics and trigger alerts if needed
   */
  static async checkCpuAndAlert(metric, adminEmail = 'mariemchaabani39@gmail.com') {
    try {
      const serverId = metric.server_id || metric.serverId || 'unknown';
      const cpuPercent = metric.cpu_percent;

      // Determine alert level
      let alertType = null;
      let threshold = null;

      // Production thresholds
      if (cpuPercent > 90) {
        alertType = 'CRITICAL';
        threshold = 90;
      } else if (cpuPercent > 80) {
        alertType = 'WARNING';
        threshold = 80;
      }

      // No alert needed if CPU is OK
      if (!alertType) {
        // Auto-resolve any ACTIVE CRITICAL alerts when CPU returns to normal
        const resolvedCritical = await Alert.updateMany(
          { serverId, type: 'CRITICAL', status: 'ACTIVE' },
          { status: 'RESOLVED', resolvedAt: new Date() }
        );
        
        if (resolvedCritical.modifiedCount > 0) {
          console.log(`[AlertService] ✓ Auto-resolved ${resolvedCritical.modifiedCount} CRITICAL alert(s) for ${serverId} - CPU returned to normal (${cpuPercent}%)`);
        }

        // Auto-resolve any ACTIVE WARNING alerts when CPU returns to normal
        const resolvedWarning = await Alert.updateMany(
          { serverId, type: 'WARNING', status: 'ACTIVE' },
          { status: 'RESOLVED', resolvedAt: new Date() }
        );
        
        if (resolvedWarning.modifiedCount > 0) {
          console.log(`[AlertService] ✓ Auto-resolved ${resolvedWarning.modifiedCount} WARNING alert(s) for ${serverId} - CPU returned to normal (${cpuPercent}%)`);
        }

        return null;
      }

      // Check if we already have an ACTIVE alert for this type
      const hasActive = await this.hasActiveAlert(serverId, alertType);
      if (hasActive) {
        console.log(`[AlertService] ⊘ Skipping duplicate: ACTIVE ${alertType} alert already exists for ${serverId}`);
        console.log(`[AlertService]   (Will create new alert only if current alert is RESOLVED)`);
        return null;
      }

      // Create alert in database
      const alertDoc = new Alert({
        serverId,
        type: alertType,
        severity: alertType,  // Map type to severity for frontend compatibility
        status: 'ACTIVE',     // New alerts are always ACTIVE
        metric: 'cpu_percent',
        value: cpuPercent,
        threshold,
        message: `${alertType}: CPU usage is ${cpuPercent}% (threshold: ${threshold}%)`
      });

      await alertDoc.save();
      console.log(`\n[AlertService] ✅ ALERT SAVED TO DATABASE`);
      console.log(`[AlertService]    ID: ${alertDoc._id}`);
      console.log(`[AlertService]    Server: ${serverId}`);
      console.log(`[AlertService]    Severity: ${alertDoc.severity} | Status: ${alertDoc.status}`);
      console.log(`[AlertService]    CPU: ${cpuPercent}% (threshold: ${threshold}%)`);
      console.log(`[AlertService]    Time: ${new Date(alertDoc.timestamp).toISOString()}\n`);

      const emailData = {
        serverId,
        type: alertType,
        metric: 'cpu_percent',
        value: cpuPercent,
        threshold,
        timestamp: alertDoc.timestamp,
        adminEmail
      };

      const emailResult = await EmailService.sendAlertEmail(emailData);
      
      // Update alert with email status
      if (emailResult.success) {
        alertDoc.emailSent = true;
        alertDoc.emailSentAt = new Date();
        await alertDoc.save();
        console.log(`[AlertService] Email notification sent and logged in alert record`);
      }

      return alertDoc;

    } catch (error) {
      console.error('[AlertService] Error checking CPU:', error);
      return null;
    }
  }

  /**
   * Get all alerts for a server
   */
  static async getAlerts(serverId, limit = 50) {
    try {
      return await Alert.find({ serverId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error('[AlertService] Error fetching alerts:', error);
      return [];
    }
  }

  /**
   * Get recent alerts (last 24 hours)
   */
  static async getRecentAlerts(limit = 100) {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return await Alert.find({ timestamp: { $gte: oneDayAgo } })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error('[AlertService] Error fetching recent alerts:', error);
      return [];
    }
  }

  /**
   * Get alert count by type
   */
  static async getAlertStats() {
    try {
      const stats = await Alert.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('[AlertService] Error getting stats:', error);
      return [];
    }
  }
}

module.exports = AlertService;
