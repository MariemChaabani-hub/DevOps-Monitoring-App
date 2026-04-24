/**
 * Backups API Routes
 * Handles backup monitoring and CRUD operations
 */

const express = require('express');
const router = express.Router();
const Backup = require('../models/Backup');
const BackupService = require('../services/backupService');

// GET /api/backups
// Returns all backups with optional filters and pagination
router.get('/', async (req, res) => {
  try {
    const {
      server_id,
      status,
      start_date,
      end_date,
      limit = 100,
      skip = 0,
      sort = '-created_at'
    } = req.query;

    const query = {};

    if (server_id) query.server_id = server_id;
    if (status) query.status = status;

    // Date range filtering
    if (start_date || end_date) {
      query.date = {};
      if (start_date) query.date.$gte = new Date(start_date);
      if (end_date) query.date.$lte = new Date(end_date);
    }

    console.log('[Backups API] GET /api/backups - Query:', query);

    const backups = await Backup.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .exec();

    // Get total count for pagination metadata
    const total = await Backup.countDocuments(query);

    console.log(`[Backups API] Found ${backups.length} backups (total: ${total})`);

    res.json({
      backups,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('[Backups API] Error fetching backups:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backups/server/:server_id
// Returns all backups for a specific server
router.get('/server/:server_id', async (req, res) => {
  try {
    const { server_id } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const backups = await Backup.find({ server_id })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .exec();

    const total = await Backup.countDocuments({ server_id });

    console.log(`[Backups API] Found ${backups.length} backups for server ${server_id}`);

    res.json({
      server_id,
      backups,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('[Backups API] Error fetching server backups:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backups/stats/summary
// Returns backup statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { server_id, start_date, end_date } = req.query;

    const matchStage = {};
    if (server_id) matchStage.server_id = server_id;

    if (start_date || end_date) {
      matchStage.date = {};
      if (start_date) matchStage.date.$gte = new Date(start_date);
      if (end_date) matchStage.date.$lte = new Date(end_date);
    }

    const stats = await Backup.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total_backups: { $sum: 1 },
          successful_backups: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failed_backups: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          missing_backups: {
            $sum: { $cond: [{ $eq: ['$status', 'missing'] }, 1, 0] }
          },
          total_size_mb: { $sum: '$size' },
          avg_size_mb: { $avg: '$size' },
          avg_duration_sec: { $avg: '$duration' },
          min_duration_sec: { $min: '$duration' },
          max_duration_sec: { $max: '$duration' }
        }
      },
      {
        $project: {
          _id: 0,
          total_backups: 1,
          successful_backups: 1,
          failed_backups: 1,
          missing_backups: 1,
          success_rate: {
            $cond: [
              { $eq: ['$total_backups', 0] },
              0,
              { $multiply: [{ $divide: ['$successful_backups', '$total_backups'] }, 100] }
            ]
          },
          total_size_mb: 1,
          avg_size_mb: { $round: ['$avg_size_mb', 2] },
          avg_duration_sec: { $round: ['$avg_duration_sec', 2] },
          min_duration_sec: 1,
          max_duration_sec: 1
        }
      }
    ]);

    const summary = stats.length > 0 ? stats[0] : {
      total_backups: 0,
      successful_backups: 0,
      failed_backups: 0,
      missing_backups: 0,
      success_rate: 0,
      total_size_mb: 0,
      avg_size_mb: 0,
      avg_duration_sec: 0,
      min_duration_sec: 0,
      max_duration_sec: 0
    };

    console.log('[Backups API] GET /stats/summary - Results:', summary);

    res.json(summary);
  } catch (error) {
    console.error('[Backups API] Error fetching backup statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backups/latest/:server_id
// Returns latest backup with detailed status information for a specific server
router.get('/latest/:server_id', async (req, res) => {
  try {
    const { server_id } = req.params;

    // Get latest backup for the server
    const latestBackup = await Backup.findOne({ server_id })
      .sort({ date: -1 })
      .exec();

    // Get last successful backup
    const lastSuccessful = await Backup.findOne({
      server_id,
      status: 'success'
    })
      .sort({ date: -1 })
      .exec();

    // Get last failed backup
    const lastFailed = await Backup.findOne({
      server_id,
      status: 'failed'
    })
      .sort({ date: -1 })
      .exec();

    // Determine current status
    let currentStatus = 'Missing';
    if (latestBackup) {
      if (latestBackup.status === 'success') {
        currentStatus = 'OK';
      } else if (latestBackup.status === 'failed') {
        currentStatus = 'Failed';
      } else if (latestBackup.status === 'missing') {
        currentStatus = 'Missing';
      }
    }

    // Check if backup is from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFromToday = latestBackup && latestBackup.date >= today;

    console.log(`[Backups API] GET /latest/${server_id} - Status: ${currentStatus}, Latest: ${latestBackup ? latestBackup.status : 'none'}`);

    res.json({
      server_id,
      latest_backup: latestBackup ? {
        _id: latestBackup._id,
        date: latestBackup.date,
        status: latestBackup.status,
        size: latestBackup.size,
        duration: latestBackup.duration,
        is_from_today: isFromToday
      } : null,
      last_successful: lastSuccessful ? {
        _id: lastSuccessful._id,
        date: lastSuccessful.date,
        size: lastSuccessful.size,
        duration: lastSuccessful.duration
      } : null,
      last_failed: lastFailed ? {
        _id: lastFailed._id,
        date: lastFailed.date,
        size: lastFailed.size,
        duration: lastFailed.duration
      } : null,
      current_status: currentStatus,
      summary: {
        has_recent_backup: !!latestBackup,
        is_healthy: currentStatus === 'OK',
        requires_attention: currentStatus === 'Failed' || currentStatus === 'Missing'
      }
    });
  } catch (error) {
    console.error('[Backups API] Error fetching latest backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backups/:id
// Intelligently handles both:
// - MongoDB backup _id (returns single backup document)
// - server_id (returns all backups for that server)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Check if id is a valid MongoDB ObjectId
    const isValidObjectId = id.match(/^[0-9a-fA-F]{24}$/);

    if (isValidObjectId) {
      // Treat as MongoDB backup _id
      const backup = await Backup.findById(id);
      if (!backup) {
        return res.status(404).json({ error: 'Backup not found' });
      }

      console.log('[Backups API] GET /api/backups/:id - Found backup:', backup._id);
      res.json(backup);
    } else {
      // Treat as server_id - return all backups for this server
      const backups = await Backup.find({ server_id: id })
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .exec();

      const total = await Backup.countDocuments({ server_id: id });

      console.log(`[Backups API] GET /api/backups/:serverId - Found ${backups.length} backups for server ${id}`);

      res.json({
        server_id: id,
        backups,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      });
    }
  } catch (error) {
    console.error('[Backups API] Error fetching backup(s):', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/backups
// Creates a new backup record
router.post('/', async (req, res) => {
  try {
    const { server_id, date, status, size, duration, notes } = req.body;

    // Validation
    if (!server_id || !date || !status || size === undefined || duration === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: server_id, date, status, size, duration'
      });
    }

    if (!['success', 'failed', 'missing'].includes(status)) {
      return res.status(400).json({
        error: 'Status must be one of: success, failed, missing'
      });
    }

    if (size < 0 || duration < 0) {
      return res.status(400).json({
        error: 'Size and duration must be non-negative numbers'
      });
    }

    const backup = new Backup({
      server_id,
      date: new Date(date),
      status,
      size,
      duration,
      notes: notes || ''
    });

    await backup.save();

    console.log('[Backups API] POST /api/backups - Created backup:', backup._id);

    // Check backup status and create alerts if needed
    try {
      await BackupService.checkBackupStatusAndCreateAlert(backup);
    } catch (error) {
      console.error('[Backups API] Error checking backup status:', error);
      // Continue even if alert creation fails
    }

    res.status(201).json(backup);
  } catch (error) {
    console.error('[Backups API] Error creating backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/backups/:id
// Updates a backup record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, size, duration, notes, date } = req.body;

    // Prepare update object
    const updateData = {};
    if (status !== undefined) {
      if (!['success', 'failed', 'missing'].includes(status)) {
        return res.status(400).json({
          error: 'Status must be one of: success, failed, missing'
        });
      }
      updateData.status = status;
    }

    if (size !== undefined) {
      if (size < 0) {
        return res.status(400).json({ error: 'Size must be non-negative' });
      }
      updateData.size = size;
    }

    if (duration !== undefined) {
      if (duration < 0) {
        return res.status(400).json({ error: 'Duration must be non-negative' });
      }
      updateData.duration = duration;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (date !== undefined) {
      updateData.date = new Date(date);
    }

    updateData.updated_at = new Date();

    const backup = await Backup.findByIdAndUpdate(id, updateData, { new: true });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    console.log('[Backups API] PUT /api/backups/:id - Updated backup:', backup._id);

    // Check backup status and create alerts if needed (especially if status was updated)
    if (status !== undefined) {
      try {
        await BackupService.checkBackupStatusAndCreateAlert(backup);
      } catch (error) {
        console.error('[Backups API] Error checking backup status:', error);
        // Continue even if alert creation fails
      }
    }

    res.json(backup);
  } catch (error) {
    console.error('[Backups API] Error updating backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/backups/:id
// Deletes a backup record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const backup = await Backup.findByIdAndDelete(id);

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    console.log('[Backups API] DELETE /api/backups/:id - Deleted backup:', backup._id);

    res.json({ message: 'Backup deleted successfully', backup });
  } catch (error) {
    console.error('[Backups API] Error deleting backup:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
