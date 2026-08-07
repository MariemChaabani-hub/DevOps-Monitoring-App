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
      const { status } = statusResult;

      // Skip if status is OK
      if (status === 'OK') {
        // Resolve any existing WARNING/CRITICAL alerts for this server
        await this.resolveAlertsForServer(metric.server_id);
        return null;
      }

      // Use the same DB-backed thresholds StatusService already computed,
      // instead of duplicating hardcoded numbers here (that's what caused
      // disk alerts to use the wrong 85/95 thresholds instead of 80/90).
      const defaultThresholds = {
        cpu: { warning: 70, critical: 90 },
        ram: { warning: 80, critical: 95 },
        disk: { warning: 80, critical: 90 }
      };
      const thresholds = { ...defaultThresholds, ...(statusResult.thresholds || {}) };

      const metricConfigs = [
        { key: 'cpu_percent', name: 'cpu', label: 'CPU' },
        { key: 'ram_percent', name: 'ram', label: 'RAM' },
        { key: 'disk_percent', name: 'disk', label: 'disque' }
      ];

      const alerts = [];

      for (const { key, name, label } of metricConfigs) {
        const value = metric[key];
        const { warning, critical } = thresholds[name];

        if (value >= critical) {
          alerts.push(await this.createOrUpdateAlert({
            serverId: metric.server_id,
            type: 'CRITICAL',
            severity: 'CRITICAL',
            metric: key,
            threshold: critical,
            value,
            message: `Utilisation ${label} critique : ${value}%`
          }, server));
        } else if (value >= warning) {
          alerts.push(await this.createOrUpdateAlert({
            serverId: metric.server_id,
            type: 'WARNING',
            severity: 'WARNING',
            metric: key,
            threshold: warning,
            value,
            message: `Utilisation ${label} élevée : ${value}%`
          }, server));
        }
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
      // Check if alert already exists. Filtering by `metric` too is required —
      // without it, an ACTIVE CPU alert would make this query match and skip
      // creating/emailing a separate RAM or Disk alert on the same server.
      const existingAlert = await Alert.findOne({
        serverId: alertData.serverId,
        type: alertData.type,
        metric: alertData.metric,
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

      // Send email notification. `server.alert_email` is a per-server
      // override set manually via the API; it is never populated for
      // servers auto-registered by the monitoring agent, so we must fall
      // back to a global admin address instead of silently skipping the email.
      const adminEmail = (server && server.alert_email) || process.env.ADMIN_EMAIL || 'mariemchaabani39@gmail.com';

      const emailResult = await EmailService.sendAlertEmail({
        serverId: alertData.serverId,
        serverName: server && server.name,
        type: alertData.type,
        metric: alertData.metric,
        value: alertData.value,
        threshold: alertData.threshold,
        timestamp: new Date(),
        adminEmail
      });

      if (emailResult.success) {
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
              message: `Agent hors ligne depuis ${Math.round((now - lastMetricTime) / 1000)} secondes`
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
