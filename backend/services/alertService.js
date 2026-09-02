/**
 * Alert Generation and Management Service
 */

const Alert = require('../models/Alert');
const Server = require('../models/Server');
const Metric = require('../models/Metric');
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
        cpu: { warning: 70, critical: 80 },
        ram: { warning: 70, critical: 80 },
        disk: { warning: 70, critical: 80 }
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
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
          acknowledgedBy
        },
        { new: true }
      );
    } catch (error) {
      console.error('[AlertService] Error acknowledging alert:', error);
      return null;
    }
  }

  /**
   * Check for agent offline (no metrics received recently).
   *
   * The threshold is sized per server from the interval that agent itself
   * reports (server.collection_interval, set from metric.collection_interval
   * — see server.js's /metrics handler), with a margin, rather than one
   * hardcoded value for every agent: a fixed 30s threshold against agents
   * collecting every 5 minutes declared every one of them permanently
   * offline, since 30s always elapses well before the next real metric.
   */
  static async checkAgentConnectivity() {
    try {
      // Used only for a server whose agent hasn't reported its own
      // interval yet (older agent, or no metric received at all so far) —
      // matches the interval the agent's config.json currently ships with
      // in this fleet, not the 5s figure documented elsewhere as a
      // lighter-weight target.
      const DEFAULT_COLLECTION_INTERVAL_SECONDS = 300;
      const OFFLINE_MARGIN_MULTIPLIER = 2.5;
      const now = Date.now();

      const servers = await Server.find({ is_active: true });

      for (const server of servers) {
        const intervalSeconds = server.collection_interval || DEFAULT_COLLECTION_INTERVAL_SECONDS;
        const offlineThresholdMs = intervalSeconds * OFFLINE_MARGIN_MULTIPLIER * 1000;

        const lastMetricTime = server.last_metric_time
          ? server.last_metric_time.getTime()
          : 0;
        const elapsedMs = now - lastMetricTime;

        if (elapsedMs > offlineThresholdMs) {
          // Server is offline
          if (server.status !== 'OFFLINE') {
            server.status = 'OFFLINE';
            await server.save();

            const offlineSeconds = Math.round(elapsedMs / 1000);

            // Dashboard cards read Metric.status (see ServerCard.js), not
            // Server.status — with no new metric arriving while the agent
            // is down, the card would otherwise keep showing whatever
            // status its last real metric had, forever. Insert a synthetic
            // OFFLINE metric, exactly like the manual shutdown action
            // already does (remoteActions.js), so the dashboard reflects
            // this the same way it reflects a metrics-based status.
            try {
              await new Metric({
                server_id: server.server_id,
                server_name: server.name,
                cpu_percent: 0,
                ram_percent: 0,
                disk_percent: 0,
                network_in: 0,
                network_out: 0,
                uptime: 0,
                status: 'OFFLINE',
                location: server.location || 'Unknown',
                timestamp: new Date()
              }).save();
            } catch (metricError) {
              console.error('[AlertService] Error creating OFFLINE metric:', metricError);
            }

            // serverId here must be server.server_id (the app-level id used
            // everywhere else — servers.js, dashboard filters, resolution
            // by /metrics), not server._id — a prior version used the
            // Mongo ObjectId here, which meant these alerts could never be
            // resolved through the normal serverId-based flow and were
            // effectively invisible outside a raw, unfiltered query.
            await this.createOrUpdateAlert({
              serverId: server.server_id,
              type: 'CRITICAL',
              severity: 'CRITICAL',
              metric: 'agent_connectivity',
              threshold: intervalSeconds * OFFLINE_MARGIN_MULTIPLIER,
              value: offlineSeconds,
              message: `Agent hors ligne depuis ${offlineSeconds} secondes`
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
