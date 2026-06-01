/**
 * Alert Generation and Management Service
 */

const Alert = require('../models/Alert');
const Server = require('../models/Server');
const EmailService = require('./emailService');

class AlertService {
  /**
   * Check metrics and generate alerts if needed
   */
  static async checkAndGenerateAlerts(metric, server, statusResult) {
    try {
      const { status, reasons } = statusResult;

      // Skip if status is OK
      if (status === 'OK') {
        // Resolve any existing WARNING/CRITICAL alerts for this server
        await this.resolveAlertsForServer(metric.server_id);
        return null;
      }

      // Generate new alerts based on status
      const alerts = [];

      // CPU Alert
      if (metric.cpu_percent >= 90) {
        alerts.push(await this.createOrUpdateAlert({
          serverId: metric.server_id,
          type: 'CRITICAL',
          severity: 'CRITICAL',
          metric: 'cpu_percent',
          threshold: 90,
          value: metric.cpu_percent,
          message: `Critical CPU usage: ${metric.cpu_percent}%`
        }, server));
      } else if (metric.cpu_percent >= 70) {
        alerts.push(await this.createOrUpdateAlert({
          serverId: metric.server_id,
          type: 'WARNING',
          severity: 'WARNING',
          metric: 'cpu_percent',
          threshold: 70,
          value: metric.cpu_percent,
          message: `High CPU usage: ${metric.cpu_percent}%`
        }, server));
      }

      // RAM Alert
      if (metric.ram_percent >= 95) {
        alerts.push(await this.createOrUpdateAlert({
          serverId: metric.server_id,
          type: 'CRITICAL',
          severity: 'CRITICAL',
          metric: 'ram_percent',
          threshold: 95,
          value: metric.ram_percent,
          message: `Critical RAM usage: ${metric.ram_percent}%`
        }, server));
      } else if (metric.ram_percent >= 80) {
        alerts.push(await this.createOrUpdateAlert({
          serverId: metric.server_id,
          type: 'WARNING',
          severity: 'WARNING',
          metric: 'ram_percent',
          threshold: 80,
          value: metric.ram_percent,
          message: `High RAM usage: ${metric.ram_percent}%`
        }, server));
      }

      // Disk Alert
      if (metric.disk_percent >= 95) {
        alerts.push(await this.createOrUpdateAlert({
          serverId: metric.server_id,
          type: 'CRITICAL',
          severity: 'CRITICAL',
          metric: 'disk_percent',
          threshold: 95,
          value: metric.disk_percent,
          message: `Critical disk usage: ${metric.disk_percent}%`
        }, server));
      } else if (metric.disk_percent >= 85) {
        alerts.push(await this.createOrUpdateAlert({
          serverId: metric.server_id,
          type: 'WARNING',
          severity: 'WARNING',
          metric: 'disk_percent',
          threshold: 85,
          value: metric.disk_percent,
          message: `High disk usage: ${metric.disk_percent}%`
        }, server));
      }

      return alerts;
    } catch (error) {
      console.error('[AlertService] Error checking alerts:', error);
      return null;
    }
  }

  /**
   * Create or update alert (avoid duplicates)
   */
  static async createOrUpdateAlert(alertData, server) {
    try {
      // Check if alert already exists
      const existingAlert = await Alert.findOne({
        serverId: alertData.serverId,
        type: alertData.type,
        status: 'ACTIVE'
      });

      if (existingAlert) {
        // Update existing alert
        existingAlert.value = alertData.value;
        existingAlert.message = alertData.message;
        await existingAlert.save();
        return existingAlert;
      }

      // Create new alert
      const newAlert = new Alert({
        ...alertData,
        status: 'ACTIVE'
      });

      await newAlert.save();

      // Send email notification
      if (server && server.alert_email) {
        await EmailService.sendAlertEmail({
          serverId: alertData.serverId,
          type: alertData.type,
          metric: alertData.metric,
          value: alertData.value,
          threshold: alertData.threshold,
          timestamp: new Date(),
          adminEmail: server.alert_email
        });
        newAlert.emailSent = true;
        newAlert.emailSentAt = new Date();
        await newAlert.save();
      }

      return newAlert;
    } catch (error) {
      console.error('[AlertService] Error creating alert:', error);
      return null;
    }
  }

  /**
   * Resolve alerts for a server (when status returns to OK)
   */
  static async resolveAlertsForServer(serverId) {
    try {
      await Alert.updateMany(
        {
          serverId: serverId,
          status: 'ACTIVE'
        },
        {
          status: 'RESOLVED',
          resolvedAt: new Date()
        }
      );
    } catch (error) {
      console.error('[AlertService] Error resolving alerts:', error);
    }
  }

  /**
   * Get active alerts
   */
  static async getActiveAlerts(serverId = null) {
    try {
      const query = { status: 'ACTIVE' };
      if (serverId) query.serverId = serverId;

      return await Alert.find(query)
        .sort({ severity: -1, timestamp: -1 })
        .exec();
    } catch (error) {
      console.error('[AlertService] Error fetching alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  static async acknowledgeAlert(alertId, acknowledgedBy) {
    try {
      return await Alert.findByIdAndUpdate(
        alertId,
        {
          status: 'ACKNOWLEDGED'
        },
        { new: true }
      );
    } catch (error) {
      console.error('[AlertService] Error acknowledging alert:', error);
      return null;
    }
  }

  /**
   * Check for agent offline (no metrics received in X seconds)
   */
  static async checkAgentConnectivity() {
    try {
      const OFFLINE_THRESHOLD = 30000; // 30 seconds
      const now = Date.now();

      const servers = await Server.find({ is_active: true });

      for (const server of servers) {
        const lastMetricTime = server.last_metric_time 
          ? server.last_metric_time.getTime() 
          : 0;

        if (now - lastMetricTime > OFFLINE_THRESHOLD) {
          // Server is offline
          if (server.status !== 'OFFLINE') {
            server.status = 'OFFLINE';
            await server.save();

            // Create alert
            await this.createOrUpdateAlert({
              serverId: server._id.toString(),
              type: 'CRITICAL',
              severity: 'CRITICAL',
              metric: 'agent_connectivity',
              threshold: 30,
              value: Math.round((now - lastMetricTime) / 1000),
              message: `Agent offline for ${Math.round((now - lastMetricTime) / 1000)} seconds`
            }, server);
          }
        }
      }
    } catch (error) {
      console.error('[AlertService] Error checking connectivity:', error);
    }
  }
}

module.exports = AlertService;
