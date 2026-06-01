/**
 * Socket.io Service for Real-Time Backup Updates
 * Manages WebSocket connections and emits backup events
 */

let io = null;

class BackupSocketService {
  /**
   * Initialize Socket.io instance
   * @param {object} socketIoInstance - The socket.io instance from server.js
   */
  static initialize(socketIoInstance) {
    io = socketIoInstance;
    
    io.on('connection', (socket) => {
      console.log('[Socket.io] Client connected:', socket.id);

      // Handle client disconnect
      socket.on('disconnect', () => {
        console.log('[Socket.io] Client disconnected:', socket.id);
      });

      // Handle subscription to backup updates
      socket.on('subscribe_backup_updates', (serverId) => {
        const room = `backup_${serverId}`;
        socket.join(room);
        console.log(`[Socket.io] Client ${socket.id} subscribed to ${room}`);
      });

      // Handle unsubscription
      socket.on('unsubscribe_backup_updates', (serverId) => {
        const room = `backup_${serverId}`;
        socket.leave(room);
        console.log(`[Socket.io] Client ${socket.id} unsubscribed from ${room}`);
      });

      // Error handler
      socket.on('error', (error) => {
        console.error('[Socket.io] Socket error:', error);
      });
    });

    console.log('[Socket.io] Server initialized and ready for connections');
  }

  /**
   * Emit backup update event to all connected clients
   * @param {string} serverId - The server ID
   * @param {object} backupData - Backup information { status, duration, size, date }
   */
  static emitBackupUpdate(serverId, backupData) {
    if (!io) {
      console.warn('[Socket.io] Socket.io not initialized, cannot emit update');
      return;
    }

    const event = {
      event: 'backup_update',
      serverId,
      status: backupData.status,
      duration: backupData.duration,
      size: backupData.size,
      date: backupData.date,
      timestamp: new Date()
    };

    // Emit to all clients subscribed to this server's backup updates
    const room = `backup_${serverId}`;
    io.to(room).emit('backup_update', event);

    // Also broadcast to all connected clients (for dashboard updates)
    io.emit('backup_update_global', event);

    console.log(
      `[Socket.io] Emitted backup_update for server ${serverId}: ` +
      `status=${backupData.status}, duration=${backupData.duration}s, size=${backupData.size}MB`
    );
  }

  /**
   * Emit backup status change event
   * @param {string} serverId - The server ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   */
  static emitBackupStatusChange(serverId, oldStatus, newStatus) {
    if (!io) {
      console.warn('[Socket.io] Socket.io not initialized, cannot emit status change');
      return;
    }

    const event = {
      event: 'backup_status_change',
      serverId,
      old_status: oldStatus,
      new_status: newStatus,
      timestamp: new Date()
    };

    const room = `backup_${serverId}`;
    io.to(room).emit('backup_status_change', event);
    io.emit('backup_status_change_global', event);

    console.log(
      `[Socket.io] Emitted backup_status_change for server ${serverId}: ` +
      `${oldStatus} → ${newStatus}`
    );
  }

  /**
   * Emit late backup alert
   * @param {string} serverId - The server ID
   */
  static emitLateBackupAlert(serverId) {
    if (!io) {
      console.warn('[Socket.io] Socket.io not initialized, cannot emit alert');
      return;
    }

    const event = {
      event: 'late_backup_alert',
      serverId,
      message: `Backup is late for server ${serverId}`,
      timestamp: new Date()
    };

    const room = `backup_${serverId}`;
    io.to(room).emit('late_backup_alert', event);
    io.emit('late_backup_alert_global', event);

    console.log(
      `[Socket.io] Emitted late_backup_alert for server ${serverId}`
    );
  }

  /**
   * Emit backup statistics update
   * @param {string} serverId - The server ID
   * @param {object} stats - Statistics data { total, ok, failed, late, health_score }
   */
  static emitBackupStatsUpdate(serverId, stats) {
    if (!io) {
      console.warn('[Socket.io] Socket.io not initialized, cannot emit stats');
      return;
    }

    const event = {
      event: 'backup_stats_update',
      serverId,
      stats: stats,
      timestamp: new Date()
    };

    const room = `backup_${serverId}`;
    io.to(room).emit('backup_stats_update', event);
    io.emit('backup_stats_update_global', event);

    console.log(
      `[Socket.io] Emitted backup_stats_update for server ${serverId}`
    );
  }

  /**
   * Get Socket.io instance
   * @returns {object} - Socket.io instance
   */
  static getInstance() {
    return io;
  }

  /**
   * Check if Socket.io is initialized
   * @returns {boolean}
   */
  static isInitialized() {
    return io !== null;
  }
}

module.exports = BackupSocketService;
