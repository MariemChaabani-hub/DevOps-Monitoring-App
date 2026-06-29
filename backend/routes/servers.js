/**
 * Server Management API Routes
 */

const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const Metric = require('../models/Metric');
const StatusService = require('../services/statusService');

// Get all servers with current status
router.get('/', async (req, res) => {
  try {
    const servers = await Server.find({ is_active: true })
      .sort({ created_at: -1 });

    const serversWithStatus = await Promise.all(
      servers.map(async (server) => {
        const latestMetric = await Metric.findOne({ server_id: server.server_id })
          .sort({ timestamp: -1 })
          .exec();

        return {
          ...server.toObject(),
          last_metric: latestMetric || null
        };
      })
    );

    res.json(serversWithStatus);
  } catch (error) {
    console.error('[Servers API] Error fetching servers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get server metrics (last N records or time range)
router.get('/*server_id/metrics', async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }
    const { limit = 100, minutes = 60 } = req.query;

    const timeThreshold = new Date(Date.now() - minutes * 60 * 1000);

    const metrics = await Metric.find({
      server_id,
      timestamp: { $gte: timeThreshold }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .exec();

    res.json(metrics);
  } catch (error) {
    console.error('[Servers API] Error fetching metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get server alerts
router.get('/*server_id/alerts', async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }
    const { status = 'ACTIVE' } = req.query;

    const Alert = require('../models/Alert');
    const alerts = await Alert.find({
      server_id,
      status
    })
      .sort({ created_at: -1 })
      .limit(50)
      .exec();

    res.json(alerts);
  } catch (error) {
    console.error('[Servers API] Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single server with latest metrics
router.get('/*server_id', async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }

    const server = await Server.findOne({ server_id });
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const latestMetric = await Metric.findOne({ server_id })
      .sort({ timestamp: -1 })
      .exec();

    res.json({
      ...server.toObject(),
      latest_metric: latestMetric || null
    });
  } catch (error) {
    console.error('[Servers API] Error fetching server:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register new server
router.post('/', async (req, res) => {
  try {
    const { server_id, name, location, description, alert_email } = req.body;

    if (!server_id || !name) {
      return res.status(400).json({ error: 'server_id and name are required' });
    }

    const existingServer = await Server.findOne({ server_id });
    if (existingServer) {
      return res.status(409).json({ error: 'Server already exists' });
    }

    const newServer = new Server({
      server_id,
      name,
      location: location || 'Unknown',
      description: description || '',
      alert_email: alert_email || null,
      status: 'OK'
    });

    await newServer.save();
    res.status(201).json(newServer);
  } catch (error) {
    console.error('[Servers API] Error creating server:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update server
router.put('/*server_id', async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }
    const { name, location, description, alert_email, is_active } = req.body;

    const server = await Server.findOne({ server_id });
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (name) server.name = name;
    if (location) server.location = location;
    if (description) server.description = description;
    if (alert_email) server.alert_email = alert_email;
    if (is_active !== undefined) server.is_active = is_active;

    await server.save();
    res.json(server);
  } catch (error) {
    console.error('[Servers API] Error updating server:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete server
router.delete('/*server_id', async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }

    const result = await Server.findOneAndDelete({ server_id });
    if (!result) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Also delete associated metrics and alerts
    await Metric.deleteMany({ server_id });
    const Alert = require('../models/Alert');
    await Alert.deleteMany({ server_id });

    res.json({ message: 'Server and associated data deleted' });
  } catch (error) {
    console.error('[Servers API] Error deleting server:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
