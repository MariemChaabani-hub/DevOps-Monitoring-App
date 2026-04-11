/**
 * Alerts API Routes
 */

const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const AlertService = require('../services/alertService');

// Get all alerts (with filtering)
router.get('/', async (req, res) => {
  try {
    const { status = 'ACTIVE', severity, server_id, limit = 100 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (server_id) query.server_id = server_id;

    const alerts = await Alert.find(query)
      .sort({ severity: -1, created_at: -1 })
      .limit(parseInt(limit))
      .exec();

    res.json(alerts);
  } catch (error) {
    console.error('[Alerts API] Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get alert by ID
router.get('/:alert_id', async (req, res) => {
  try {
    const { alert_id } = req.params;

    const alert = await Alert.findById(alert_id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('[Alerts API] Error fetching alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// Acknowledge alert
router.put('/:alert_id/acknowledge', async (req, res) => {
  try {
    const { alert_id } = req.params;
    const { acknowledged_by = 'system' } = req.body;

    const alert = await AlertService.acknowledgeAlert(alert_id, acknowledged_by);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('[Alerts API] Error acknowledging alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve alert
router.put('/:alert_id/resolve', async (req, res) => {
  try {
    const { alert_id } = req.params;

    const alert = await Alert.findByIdAndUpdate(
      alert_id,
      {
        status: 'RESOLVED',
        resolved_at: new Date()
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('[Alerts API] Error resolving alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get alert statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = {
      active_total: 0,
      critical_count: 0,
      warning_count: 0,
      acknowledged_count: 0,
      by_server: {}
    };

    const alerts = await Alert.find({ status: 'ACTIVE' });

    for (const alert of alerts) {
      stats.active_total++;
      if (alert.severity === 'CRITICAL') stats.critical_count++;
      if (alert.severity === 'WARNING') stats.warning_count++;

      if (!stats.by_server[alert.server_id]) {
        stats.by_server[alert.server_id] = 0;
      }
      stats.by_server[alert.server_id]++;
    }

    const acknowledged = await Alert.find({ status: 'ACKNOWLEDGED' });
    stats.acknowledged_count = acknowledged.length;

    res.json(stats);
  } catch (error) {
    console.error('[Alerts API] Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk acknowledge alerts
router.post('/bulk/acknowledge', async (req, res) => {
  try {
    const { alert_ids, acknowledged_by = 'system' } = req.body;

    if (!alert_ids || !Array.isArray(alert_ids)) {
      return res.status(400).json({ error: 'alert_ids must be an array' });
    }

    const result = await Alert.updateMany(
      { _id: { $in: alert_ids } },
      {
        status: 'ACKNOWLEDGED',
        acknowledged_at: new Date(),
        acknowledged_by
      }
    );

    res.json({
      message: `${result.modifiedCount} alerts acknowledged`,
      modified_count: result.modifiedCount
    });
  } catch (error) {
    console.error('[Alerts API] Error bulk acknowledging:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
