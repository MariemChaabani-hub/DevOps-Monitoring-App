/**
 * Backup History Modal Component
 * Displays complete backup history for a specific server
 */

import React, { useEffect, useState } from 'react';
import './BackupHistory.css';

const BackupHistory = ({ serverId, serverName, onClose }) => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });

  const API_BASE = '';

  useEffect(() => {
    if (serverId) {
      fetchBackupHistory();
    }
  }, [serverId]);

  const fetchBackupHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/backups/server/${serverId}?limit=50&skip=0`
      );
      
      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
        setPagination(data.pagination || { total: 0, limit: 50, skip: 0 });
        setError(null);
      } else {
        throw new Error('Failed to fetch backup history');
      }
    } catch (err) {
      setError('Failed to fetch backup history: ' + err.message);
      console.error('Error fetching backup history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OK':
        return '✅';
      case 'FAILED':
        return '❌';
      case 'LATE':
        return '⏰';
      default:
        return '❓';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'OK':
        return 'status-ok';
      case 'FAILED':
        return 'status-failed';
      case 'LATE':
        return 'status-late';
      default:
        return 'status-unknown';
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  const formatSize = (sizeInMB) => {
    if (!sizeInMB) return 'N/A';
    if (sizeInMB >= 1024) {
      return (sizeInMB / 1024).toFixed(2) + ' GB';
    }
    return sizeInMB.toFixed(2) + ' MB';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) {
      return seconds + 's';
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getStats = () => {
    if (backups.length === 0) return { ok: 0, failed: 0, late: 0, total: 0 };
    
    const stats = {
      ok: backups.filter(b => b.status === 'OK').length,
      failed: backups.filter(b => b.status === 'FAILED').length,
      late: backups.filter(b => b.status === 'LATE').length,
      total: backups.length
    };
    
    return stats;
  };

  const stats = getStats();

  return (
    <div className="backup-history-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <h2>📋 Backup History</h2>
          <h3>{serverName || serverId}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Stats Summary */}
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item status-ok">
            <span className="stat-label">✅ Success:</span>
            <span className="stat-value">{stats.ok}</span>
          </div>
          <div className="stat-item status-failed">
            <span className="stat-label">❌ Failed:</span>
            <span className="stat-value">{stats.failed}</span>
          </div>
          <div className="stat-item status-late">
            <span className="stat-label">⏰ Late:</span>
            <span className="stat-value">{stats.late}</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-message">
            <span>⚠ {error}</span>
            <button onClick={fetchBackupHistory} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="loading-message">
            <div className="loading-spinner"></div>
            <span>Loading backup history...</span>
          </div>
        )}

        {/* Backup history list */}
        {!loading && !error && (
          <div className="history-list">
            {backups.length === 0 ? (
              <div className="no-data">
                <p>No backup history found for this server</p>
              </div>
            ) : (
              backups.map((backup, index) => (
                <div key={backup._id} className="history-item">
                  <div className="item-header">
                    <span className={`status-badge ${getStatusClass(backup.status)}`}>
                      {getStatusIcon(backup.status)} {backup.status}
                    </span>
                    <span className="backup-date">
                      {formatDate(backup.date)}
                    </span>
                  </div>
                  
                  <div className="item-details">
                    <div className="detail-item">
                      <span className="label">Size:</span>
                      <span className="value">{formatSize(backup.size)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Duration:</span>
                      <span className="value">{formatDuration(backup.duration)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Created:</span>
                      <span className="value">{formatDate(backup.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <div className="pagination-info">
            Showing {backups.length} of {pagination.total} backups
          </div>
          <button className="refresh-btn" onClick={fetchBackupHistory}>
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupHistory;
