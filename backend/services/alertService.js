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
          server_id: metric.server_id,
          server_name: metric.server_name,
          alert_type: 'CPU_HIGH',
          severity: 'CRITICAL',
          metric_name: 'cpu_percent',
          threshold_value: 90,
          current_value: metric.cpu_percent,
          message: `Critical CPU usage: ${metric.cpu_percent}%`
        }, server));
      } else if (metric.cpu_percent >= 70) {
        alerts.push(await this.createOrUpdateAlert({
          server_id: metric.server_id,
          server_name: metric.server_name,
          alert_type: 'CPU_HIGH',
          severity: 'WARNING',
          metric_name: 'cpu_percent',
          threshold_value: 70,
          current_value: metric.cpu_percent,
          message: `High CPU usage: ${metric.cpu_percent}%`
        }, server));
      }

      // RAM Alert
      if (metric.ram_percent >= 95) {
        alerts.push(await this.createOrUpdateAlert({
          server_id: metric.server_id,
          server_name: metric.server_name,
          alert_type: 'RAM_HIGH',
          severity: 'CRITICAL',
          metric_name: 'ram_percent',
          threshold_value: 95,
          current_value: metric.ram_percent,
          message: `Critical RAM usage: ${metric.ram_percent}%`
        }, server));
      } else if (metric.ram_percent >= 80) {
        alerts.push(await this.createOrUpdateAlert({
          server_id: metric.server_id,
          server_name: metric.server_name,
          alert_type: 'RAM_HIGH',
          severity: 'WARNING',
          metric_name: 'ram_percent',
          threshold_value: 80,
          current_value: metric.ram_percent,
          message: `High RAM usage: ${metric.ram_percent}%`
        }, server));
      }

      // Disk Alert
      if (metric.disk_percent >= 95) {
        alerts.push(await this.createOrUpdateAlert({
          server_id: metric.server_id,
          server_name: metric.server_name,
          alert_type: 'DISK_HIGH',
          severity: 'CRITICAL',
          metric_name: 'disk_percent',
          threshold_value: 95,
          current_value: metric.disk_percent,
          message: `Critical disk usage: ${metric.disk_percent}%`
        }, server));
      } else if (metric.disk_percent >= 85) {
        alerts.push(await this.createOrUpdateAlert({
          server_id: metric.server_id,
          server_name: metric.server_name,
          alert_type: 'DISK_HIGH',
          severity: 'WARNING',
          metric_name: 'disk_percent',
          threshold_value: 85,
          current_value: metric.disk_percent,
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
        server_id: alertData.server_id,
        alert_type: alertData.alert_type,
        status: 'ACTIVE'
      });

      if (existingAlert) {
        // Update existing alert
        existingAlert.current_value = alertData.current_value;
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
          server_name: server.name,
          alert_message: alertData.message,
          severity: alertData.severity,
          email: server.alert_email,
          metric_name: alertData.metric_name,
          current_value: alertData.current_value,
          threshold_value: alertData.threshold_value
        });
        newAlert.email_sent = true;
        newAlert.email_sent_at = new Date();
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
          server_id: serverId,
          status: 'ACTIVE'
        },
        {
          status: 'RESOLVED',
          resolved_at: new Date()
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
      if (serverId) query.server_id = serverId;

      return await Alert.find(query)
        .sort({ severity: -1, created_at: -1 })
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
          status: 'ACKNOWLEDGED',
          acknowledged_at: new Date(),
          acknowledged_by: acknowledgedBy
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
              server_id: server.server_id,
              server_name: server.name,
              alert_type: 'AGENT_OFFLINE',
              severity: 'CRITICAL',
              metric_name: 'agent_connectivity',
              threshold_value: 30,
              current_value: Math.round((now - lastMetricTime) / 1000),
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
