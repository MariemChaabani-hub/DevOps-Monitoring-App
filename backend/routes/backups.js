/**
 * Backups API Routes
 * Handles backup monitoring and CRUD operations
 */

const express = require('express');
const router = express.Router();
const Backup = require('../models/Backup');
const Server = require('../models/Server');
const BackupService = require('../services/backupService');
const BackupSocketService = require('../services/backupSocketService');
const BackupAlertService = require('../services/backupAlertService');

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

    if (server_id) query.serverId = server_id;
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

// GET /api/backups/server/*server_id
// Returns all backups for a specific server
router.get('/server/*server_id', async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }
    const { limit = 50, skip = 0 } = req.query;

    const backups = await Backup.find({ serverId: server_id })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .exec();

    const total = await Backup.countDocuments({ serverId: server_id });

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
    if (server_id) matchStage.serverId = server_id;

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
            $sum: { $cond: [{ $eq: ['$status', 'OK'] }, 1, 0] }
          },
          failed_backups: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
          },
          late_backups: {
            $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] }
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
          late_backups: 1,
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

// POST /api/backups/test/run-daily-check
// Manually trigger daily backup check (for testing)
router.post('/test/run-daily-check', async (req, res) => {
  try {
    console.log('[Backups API] Manually triggering daily backup check');

    const results = await BackupService.runDailyBackupCheck();

    res.json({
      success: true,
      message: 'Daily backup check executed successfully',
      timestamp: new Date(),
      results: results
    });
  } catch (error) {
    console.error('[Backups API] Error running daily backup check:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET /api/backups/latest/*server_id
// Returns latest backup with detailed status information for a specific server
router.get('/latest/*server_id', async (req, res) => {
  try {
    let server_id = req.params.server_id;
    if (Array.isArray(server_id)) {
      server_id = server_id.join('/');
    }

    // Get latest backup for the server
    const latestBackup = await Backup.findOne({ serverId: server_id })
      .sort({ date: -1 })
      .exec();

    // Get last successful backup
    const lastSuccessful = await Backup.findOne({
      serverId: server_id,
      status: 'OK'
    })
      .sort({ date: -1 })
      .exec();

    // Get last failed backup
    const lastFailed = await Backup.findOne({
      serverId: server_id,
      status: 'FAILED'
    })
      .sort({ date: -1 })
      .exec();

    // Determine current status
    let currentStatus = 'Missing';
    if (latestBackup) {
      if (latestBackup.status === 'OK') {
        currentStatus = 'OK';
      } else if (latestBackup.status === 'FAILED') {
        currentStatus = 'Failed';
      } else if (latestBackup.status === 'LATE') {
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

// GET /api/backups/*serverId/latest
// Returns the latest backup for a specific server
router.get('/*serverId/latest', async (req, res) => {
  try {
    let serverId = req.params.serverId;
    if (Array.isArray(serverId)) {
      serverId = serverId.join('/');
    }

    // Get latest backup for the server
    const latestBackup = await Backup.findOne({ serverId })
      .sort({ date: -1 })
      .exec();

    if (!latestBackup) {
      return res.status(404).json({
        error: 'No backup found for this server',
        serverId
      });
    }

    console.log(
      `[Backups API] GET /:serverId/latest - Server ${serverId}, Latest: ${latestBackup.status}`
    );

    res.json({
      serverId,
      latest_backup: {
        _id: latestBackup._id,
        date: latestBackup.date,
        status: latestBackup.status,
        duration: latestBackup.duration,
        size: latestBackup.size,
        createdAt: latestBackup.createdAt
      }
    });
  } catch (error) {
    console.error('[Backups API] Error fetching latest backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backups/*serverId/status
// Returns backup status information for a specific server
router.get('/*serverId/status', async (req, res) => {
  try {
    let serverId = req.params.serverId;
    if (Array.isArray(serverId)) {
      serverId = serverId.join('/');
    }

    // Get last backup (any status)
    const lastBackup = await Backup.findOne({ serverId })
      .sort({ date: -1 })
      .exec();

    // Get last successful backup
    const lastSuccessful = await Backup.findOne({
      serverId,
      status: 'OK'
    })
      .sort({ date: -1 })
      .exec();

    // Get last failed backup
    const lastFailed = await Backup.findOne({
      serverId,
      status: 'FAILED'
    })
      .sort({ date: -1 })
      .exec();

    // Determine overall status
    let overallStatus = 'NO_BACKUP';
    if (lastBackup) {
      if (lastBackup.status === 'OK') {
        overallStatus = 'HEALTHY';
      } else if (lastBackup.status === 'FAILED') {
        overallStatus = 'FAILED';
      } else if (lastBackup.status === 'LATE') {
        overallStatus = 'LATE';
      }
    }

    console.log(
      `[Backups API] GET /:serverId/status - Server ${serverId}, Overall: ${overallStatus}`
    );

    res.json({
      serverId,
      overall_status: overallStatus,
      last_backup: lastBackup ? {
        date: lastBackup.date,
        status: lastBackup.status,
        duration: lastBackup.duration,
        size: lastBackup.size
      } : null,
      last_successful_backup: lastSuccessful ? {
        date: lastSuccessful.date,
        duration: lastSuccessful.duration,
        size: lastSuccessful.size
      } : null,
      last_failed_backup: lastFailed ? {
        date: lastFailed.date,
        duration: lastFailed.duration,
        size: lastFailed.size
      } : null,
      summary: {
        has_backup: !!lastBackup,
        is_healthy: overallStatus === 'HEALTHY',
        needs_attention: overallStatus === 'FAILED' || overallStatus === 'LATE' || overallStatus === 'NO_BACKUP'
      }
    });
  } catch (error) {
    console.error('[Backups API] Error fetching backup status:', error);
    res.status(500).json({ error: error.message });
  }
});



// POST /api/backups
// Creates a new backup record
router.post('/', async (req, res) => {
  try {
    const { serverId, server_id, date, status, size, duration, notes } = req.body;
    
    // Support both serverId and server_id for backward compatibility
    const finalServerId = serverId || server_id;

    // Validation
    if (!finalServerId || !date || !status || size === undefined || duration === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: serverId, date, status, size, duration'
      });
    }

    if (!['OK', 'FAILED', 'LATE'].includes(status)) {
      return res.status(400).json({
        error: 'Status must be one of: OK, FAILED, LATE'
      });
    }

    if (size < 0 || duration < 0) {
      return res.status(400).json({
        error: 'Size and duration must be non-negative numbers'
      });
    }

    const backup = new Backup({
      serverId: finalServerId,
      date: new Date(date),
      status,
      size,
      duration,
      createdAt: new Date()
    });

    await backup.save();

    console.log('[Backups API] POST /api/backups - Created backup:', backup._id);

    // Emit socket.io event for real-time update
    try {
      BackupSocketService.emitBackupUpdate(finalServerId, {
        status: backup.status,
        duration: backup.duration,
        size: backup.size,
        date: backup.date
      });
    } catch (error) {
      console.error('[Backups API] Error emitting socket event:', error);
    }

    // Check backup status and create alerts if needed (FAILED or LATE)
    try {
      const server = await Server.findById(finalServerId);
      await BackupAlertService.checkBackupAndAlert(backup, server);
    } catch (error) {
      console.error('[Backups API] Error checking backup alerts:', error);
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
    const { status, size, duration, date } = req.body;

    // Prepare update object
    const updateData = {};
    let oldStatus = null;

    if (status !== undefined) {
      if (!['OK', 'FAILED', 'LATE'].includes(status)) {
        return res.status(400).json({
          error: 'Status must be one of: OK, FAILED, LATE'
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

    if (date !== undefined) {
      updateData.date = new Date(date);
    }

    // Get the backup before updating to capture old status
    const oldBackup = await Backup.findById(id);
    if (oldBackup) {
      oldStatus = oldBackup.status;
    }

    const backup = await Backup.findByIdAndUpdate(id, updateData, { new: true });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    console.log('[Backups API] PUT /api/backups/:id - Updated backup:', backup._id);

    // Emit socket.io event for real-time update
    try {
      BackupSocketService.emitBackupUpdate(backup.serverId, {
        status: backup.status,
        duration: backup.duration,
        size: backup.size,
        date: backup.date
      });

      // If status changed, emit status change event
      if (status !== undefined && oldStatus && oldStatus !== status) {
        BackupSocketService.emitBackupStatusChange(backup.serverId, oldStatus, status);
      }
    } catch (error) {
      console.error('[Backups API] Error emitting socket event:', error);
    }

    // Check backup status and create alerts if needed (especially if status was updated)
    if (status !== undefined) {
      try {
        const server = await Server.findById(backup.serverId);
        await BackupAlertService.checkBackupAndAlert(backup, server);
      } catch (error) {
        console.error('[Backups API] Error checking backup alerts:', error);
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

// POST /api/backups/test/trigger
// Manual endpoint for testing - triggers backup immediately
router.post('/test/trigger', async (req, res) => {
  try {
    const BackupCronService = require('../services/backupCronService');
    
    console.log('[Backups API] Manual backup trigger requested');
    
    // Trigger backup immediately
    await BackupCronService.triggerBackupNow();
    
    // Fetch the latest backups to return as confirmation
    const recentBackups = await Backup.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    res.json({
      message: 'Backup triggered successfully',
      timestamp: new Date(),
      recent_backups: recentBackups
    });
  } catch (error) {
    console.error('[Backups API] Error triggering backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/backups/test/check-late
// Manual endpoint for testing - checks for late backups
router.post('/test/check-late', async (req, res) => {
  try {
    const BackupCronService = require('../services/backupCronService');
    
    console.log('[Backups API] Manual late backup check requested');
    
    // Trigger late backup check immediately
    await BackupCronService.checkAndCreateLateBackups();
    
    // Get today's backups for reference
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysBackups = await Backup.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ createdAt: -1 });

    res.json({
      message: 'Late backup check completed successfully',
      timestamp: new Date(),
      todays_backup_count: todaysBackups.length,
      late_backups: todaysBackups.filter(b => b.status === 'LATE'),
      all_todays_backups: todaysBackups
    });
  } catch (error) {
    console.error('[Backups API] Error checking late backups:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backups/*serverId/indicators
// Returns backup health indicators and metrics for a specific server
router.get('/*serverId/indicators', async (req, res) => {
  try {
    let serverId = req.params.serverId;
    if (Array.isArray(serverId)) {
      serverId = serverId.join('/');
    }

    console.log('[Backups API] GET /:serverId/indicators - Calculating for server:', serverId);

    // Calculate backup indicators
    const indicators = await BackupService.calculateBackupIndicators(serverId);

    res.json({
      serverId,
      timestamp: new Date(),
      indicators
    });
  } catch (error) {
    console.error('[Backups API] Error calculating backup indicators:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backups/*id
// Intelligently handles both:
// - MongoDB backup _id (returns single backup document)
// - server_id (returns all backups for that server)
router.get('/*id', async (req, res) => {
  try {
    let id = req.params.id;
    if (Array.isArray(id)) {
      id = id.join('/');
    }
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
      // Treat as serverId - return all backups for this server
      const backups = await Backup.find({ serverId: id })
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .exec();

      const total = await Backup.countDocuments({ serverId: id });

      console.log(`[Backups API] GET /api/backups/:serverId - Found ${backups.length} backups for server ${id}`);

      res.json({
        serverId: id,
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

module.exports = router;
