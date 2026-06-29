/**
 * Metrics API Routes
 * Handles multi-server metric retrieval and history
 */

const express = require('express');
const router = express.Router();
const Metric = require('../models/Metric');

// GET /api/metrics/latest
// Returns latest metric from each server
router.get('/latest', async (req, res) => {
  try {
    // Get the latest metric for each server using aggregation
    const latestMetrics = await Metric.aggregate([
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$server_id',
          serverId: { $first: '$server_id' },
          server_name: { $first: '$server_name' },
          cpu_percent: { $first: '$cpu_percent' },
          ram_percent: { $first: '$ram_percent' },
          disk_percent: { $first: '$disk_percent' },
          status: { $first: '$status' },
          timestamp: { $first: '$timestamp' },
          network_io: { $first: '$network_io' },
          uptime: { $first: '$uptime' },
          location: { $first: '$location' }
        }
      },
      {
        $sort: { serverId: 1 }
      }
    ]);

    // Transform response to include serverId at top level
    const formattedMetrics = latestMetrics.map(metric => ({
      serverId: metric.serverId,
      server_name: metric.server_name,
      cpu_percent: metric.cpu_percent,
      ram_percent: metric.ram_percent,
      disk_percent: metric.disk_percent,
      status: metric.status,
      timestamp: metric.timestamp,
      network_io: metric.network_io,
      uptime: metric.uptime,
      location: metric.location
    }));

    res.json({
      count: formattedMetrics.length,
      data: formattedMetrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[Metrics API] Error fetching latest metrics:', error);
    res.status(500).json({ 
      error: error.message,
      endpoint: '/api/metrics/latest'
    });
  }
});

// GET /api/metrics/history/*serverId or query parameter serverId
// Returns historical metrics for a specific server (for charts)
router.get(['/history/*serverId', '/history'], async (req, res) => {
  try {
    let serverId = req.params.serverId || req.query.serverId;
    if (Array.isArray(serverId)) {
      serverId = serverId.join('/');
    }

    if (!serverId) {
      return res.status(400).json({ error: 'serverId is required' });
    }

    const { limit = 100, minutes = 60 } = req.query;

    // Calculate time threshold
    const timeThreshold = new Date(Date.now() - parseInt(minutes) * 60 * 1000);

    // Fetch metrics for the specific server
    const metrics = await Metric.find({
      server_id: serverId,
      timestamp: { $gte: timeThreshold }
    })
      .sort({ timestamp: 1 })
      .limit(parseInt(limit))
      .select({
        _id: 1,
        server_id: 1,
        serverId: 1,
        server_name: 1,
        timestamp: 1,
        cpu_percent: 1,
        ram_percent: 1,
        disk_percent: 1,
        status: 1,
        network_io: 1,
        uptime: 1
      })
      .exec();

    if (metrics.length === 0) {
      return res.json({
        serverId: serverId,
        count: 0,
        timeRange: {
          from: timeThreshold,
          to: new Date(),
          minutes: parseInt(minutes)
        },
        data: [],
        timestamp: new Date()
      });
    }

    res.json({
      serverId: serverId,
      count: metrics.length,
      timeRange: {
        from: timeThreshold,
        to: new Date(),
        minutes: parseInt(minutes)
      },
      data: metrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[Metrics API] Error fetching metric history:', error);
    res.status(500).json({ 
      error: error.message,
      serverId: req.params.serverId,
      endpoint: '/api/metrics/history/:serverId'
    });
  }
});

// GET /api/metrics/server/:serverId/latest
// Alternative endpoint for latest metric of a specific server
router.get('/server/:serverId/latest', async (req, res) => {
  try {
    const { serverId } = req.params;

    const latestMetric = await Metric.findOne({ server_id: serverId })
      .sort({ timestamp: -1 })
      .exec();

    if (!latestMetric) {
      return res.status(404).json({
        error: 'No metrics found for this server',
        serverId: serverId
      });
    }

    res.json({
      serverId: latestMetric.server_id,
      ...latestMetric.toObject(),
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[Metrics API] Error fetching latest metric:', error);
    res.status(500).json({ 
      error: error.message,
      serverId: req.params.serverId
    });
  }
});

// GET /api/metrics/stats
// Returns aggregated stats across all servers
router.get('/stats', async (req, res) => {
  try {
    const { minutes = 60 } = req.query;
    const timeThreshold = new Date(Date.now() - parseInt(minutes) * 60 * 1000);

    // Get stats by server
    const stats = await Metric.aggregate([
      {
        $match: {
          timestamp: { $gte: timeThreshold }
        }
      },
      {
        $group: {
          _id: '$server_id',
          serverId: { $first: '$server_id' },
          avg_cpu: { $avg: '$cpu_percent' },
          max_cpu: { $max: '$cpu_percent' },
          min_cpu: { $min: '$cpu_percent' },
          avg_ram: { $avg: '$ram_percent' },
          max_ram: { $max: '$ram_percent' },
          min_ram: { $min: '$ram_percent' },
          avg_disk: { $avg: '$disk_percent' },
          max_disk: { $max: '$disk_percent' },
          min_disk: { $min: '$disk_percent' },
          metric_count: { $sum: 1 },
          latest_status: { $last: '$status' }
        }
      },
      {
        $sort: { serverId: 1 }
      }
    ]);

    res.json({
      timeRange: {
        minutes: parseInt(minutes),
        from: timeThreshold,
        to: new Date()
      },
      server_count: stats.length,
      data: stats,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[Metrics API] Error fetching stats:', error);
    res.status(500).json({ 
      error: error.message,
      endpoint: '/api/metrics/stats'
    });
  }
});

module.exports = router;
