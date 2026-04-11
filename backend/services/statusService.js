/**
 * Status Classification Service
 * Determines server status based on metric thresholds
 */

const Threshold = require('../models/Threshold');

class StatusService {
  /**
   * Calculate server status based on current metrics
   */
  static async calculateStatus(metrics) {
    try {
      // Get thresholds from database
      const thresholds = {};
      const dbThresholds = await Threshold.find({ enabled: true });
      
      for (const threshold of dbThresholds) {
        thresholds[threshold.metric_name] = {
          warning: threshold.warning_level,
          critical: threshold.critical_level
        };
      }

      // Default thresholds if not found in DB
      const defaultThresholds = {
        cpu: { warning: 70, critical: 90 },
        ram: { warning: 80, critical: 95 },
        disk: { warning: 85, critical: 95 }
      };

      const finalThresholds = { ...defaultThresholds, ...thresholds };

      // Evaluate status
      let status = 'OK';
      let statusReasons = [];

      // CPU Check
      if (metrics.cpu_percent >= finalThresholds.cpu.critical) {
        status = 'CRITICAL';
        statusReasons.push(`CPU ${metrics.cpu_percent}% exceeds critical (${finalThresholds.cpu.critical}%)`);
      } else if (metrics.cpu_percent >= finalThresholds.cpu.warning) {
        if (status !== 'CRITICAL') status = 'WARNING';
        statusReasons.push(`CPU ${metrics.cpu_percent}% exceeds warning (${finalThresholds.cpu.warning}%)`);
      }

      // RAM Check
      if (metrics.ram_percent >= finalThresholds.ram.critical) {
        status = 'CRITICAL';
        statusReasons.push(`RAM ${metrics.ram_percent}% exceeds critical (${finalThresholds.ram.critical}%)`);
      } else if (metrics.ram_percent >= finalThresholds.ram.warning) {
        if (status !== 'CRITICAL') status = 'WARNING';
        statusReasons.push(`RAM ${metrics.ram_percent}% exceeds warning (${finalThresholds.ram.warning}%)`);
      }

      // Disk Check
      if (metrics.disk_percent >= finalThresholds.disk.critical) {
        status = 'CRITICAL';
        statusReasons.push(`Disk ${metrics.disk_percent}% exceeds critical (${finalThresholds.disk.critical}%)`);
      } else if (metrics.disk_percent >= finalThresholds.disk.warning) {
        if (status !== 'CRITICAL') status = 'WARNING';
        statusReasons.push(`Disk ${metrics.disk_percent}% exceeds warning (${finalThresholds.disk.warning}%)`);
      }

      return {
        status,
        reasons: statusReasons,
        thresholds: finalThresholds
      };
    } catch (error) {
      console.error('[StatusService] Error calculating status:', error);
      return {
        status: 'UNKNOWN',
        reasons: [error.message],
        thresholds: {}
      };
    }
  }

  /**
   * Get health summary for dashboard
   */
  static async getHealthSummary(servers) {
    const summary = {
      total_servers: servers.length,
      ok_count: 0,
      warning_count: 0,
      critical_count: 0,
      offline_count: 0,
      timestamp: new Date()
    };

    for (const server of servers) {
      switch (server.status) {
        case 'OK':
          summary.ok_count++;
          break;
        case 'WARNING':
          summary.warning_count++;
          break;
        case 'CRITICAL':
          summary.critical_count++;
          break;
        case 'OFFLINE':
          summary.offline_count++;
          break;
      }
    }

    summary.health_percentage = servers.length > 0 
      ? ((summary.ok_count / servers.length) * 100).toFixed(2)
      : 0;

    return summary;
  }
}

module.exports = StatusService;
