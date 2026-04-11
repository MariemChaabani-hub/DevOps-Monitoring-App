/**
 * Alert Service
 * Checks CPU thresholds and manages alerts
 * Rules:
 *   - CPU > 80% → WARNING
 *   - CPU > 90% → CRITICAL
 *   - Avoid duplicate alerts (1 minute cooldown)
 */

const Alert = require('../models/Alert');
const EmailService = require('./emailService');

class AlertService {
  /**
   * Check if recent alert exists for this server and type
   * (within last 60 seconds)
   */
  static async hasRecentAlert(serverId, type) {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      const recentAlert = await Alert.findOne({
        serverId,
        type,
        timestamp: { $gte: oneMinuteAgo }
      });

      return !!recentAlert;
    } catch (error) {
      console.error('[AlertService] Error checking recent alert:', error);
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

      if (cpuPercent > 90) {
        alertType = 'CRITICAL';
        threshold = 90;
      } else if (cpuPercent > 80) {
        alertType = 'WARNING';
        threshold = 80;
      }

      // No alert needed if CPU is OK
      if (!alertType) {
        return null;
      }

      // Check if we already sent alert recently
      const hasRecent = await this.hasRecentAlert(serverId, alertType);
      if (hasRecent) {
        console.log(`[AlertService] Skipping duplicate alert for ${serverId} - ${alertType}`);
        return null;
      }

      // Create alert in database
      const alertDoc = new Alert({
        serverId,
        type: alertType,
        metric: 'cpu_percent',
        value: cpuPercent,
        threshold,
        message: `${alertType}: CPU usage is ${cpuPercent}% (threshold: ${threshold}%)`
      });

      await alertDoc.save();
      console.log(`[AlertService] Alert saved: ${serverId} - ${alertType} (CPU: ${cpuPercent}%)`);

      // Send email notification
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
