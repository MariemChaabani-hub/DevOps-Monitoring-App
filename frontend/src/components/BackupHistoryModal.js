/**
 * Backup History Modal Component
 * Beautiful modal design for displaying backup history
 */

import React, { useEffect, useState } from 'react';
import './BackupHistoryModal.css';

const BackupHistoryModal = ({ isOpen, onClose, serverId, serverName }) => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const API_BASE = 'http://localhost:3000';

  useEffect(() => {
    if (isOpen) {
      setStatusFilter('ALL');
      fetchBackupHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, serverId]);

  const fetchBackupHistory = async () => {
    setLoading(true);
    try {
      const url = serverId && serverId !== 'all'
        ? `${API_BASE}/api/backups/server/${serverId}?limit=50`
        : `${API_BASE}/api/backups?limit=100`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
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
        return 'status-success';
      case 'FAILED':
        return 'status-error';
      case 'LATE':
        return 'status-warning';
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

  const filteredBackups = statusFilter === 'ALL'
    ? backups
    : backups.filter(b => b.status === statusFilter);

  // Sort by date descending (newest first)
  const sortedBackups = [...filteredBackups].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!isOpen) return null;

  return (
    <div className="backup-history-modal-overlay" onClick={onClose}>
      <div className="backup-history-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-content">
            <h2>📋 Backup History</h2>
            <h3>{serverName || serverId}</h3>
          </div>
          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-container">
          <div 
            className={`stat-card total ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
            title="Show all backups"
          >
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Backups</div>
            </div>
          </div>
          <div 
            className={`stat-card success ${statusFilter === 'OK' ? 'active' : ''}`}
            onClick={() => setStatusFilter('OK')}
            title="Show successful backups"
          >
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <div className="stat-number">{stats.ok}</div>
              <div className="stat-label">Successful</div>
            </div>
          </div>
          <div 
            className={`stat-card error ${statusFilter === 'FAILED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('FAILED')}
            title="Show failed backups"
          >
            <div className="stat-icon">❌</div>
            <div className="stat-info">
              <div className="stat-number">{stats.failed}</div>
              <div className="stat-label">Failed</div>
            </div>
          </div>
          <div 
            className={`stat-card warning ${statusFilter === 'LATE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('LATE')}
            title="Show late backups"
          >
            <div className="stat-icon">⏰</div>
            <div className="stat-info">
              <div className="stat-number">{stats.late}</div>
              <div className="stat-label">Late</div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{error}</div>
            <button className="retry-button" onClick={fetchBackupHistory}>
              🔄 Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading backup history...</div>
          </div>
        )}

        {/* Backup History List */}
        {!loading && !error && (
          <div className="history-container">
            {sortedBackups.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No Backup History</h3>
                <p>
                  {statusFilter === 'ALL' 
                    ? 'No backup records found for this server.' 
                    : `No ${statusFilter === 'OK' ? 'successful' : statusFilter.toLowerCase()} backup records found.`}
                </p>
              </div>
            ) : (
              <div className="backup-list">
                {sortedBackups.map((backup, index) => (
                  <div key={backup._id} className="backup-item">
                    <div className="backup-header">
                      <div className={`backup-status ${getStatusClass(backup.status)}`}>
                        <span className="status-icon">{getStatusIcon(backup.status)}</span>
                        <span className="status-text">{backup.status}</span>
                      </div>
                      <div className="backup-date">
                        {formatDate(backup.date)}
                      </div>
                    </div>
                    
                    <div className="backup-details">
                      <div className="detail-grid">
                        {serverId === 'all' && (
                          <div className="detail-item">
                            <span className="detail-label">Server</span>
                            <span className="detail-value" style={{ color: '#60a5fa', fontWeight: 'bold' }}>
                              {backup.serverId || backup.server_id}
                            </span>
                          </div>
                        )}
                        <div className="detail-item">
                          <span className="detail-label">Size</span>
                          <span className="detail-value">{formatSize(backup.size)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Duration</span>
                          <span className="detail-value">{formatDuration(backup.duration)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Created</span>
                          <span className="detail-value">{formatDate(backup.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-info">
            <span className="backup-count">
              Showing {sortedBackups.length} {statusFilter !== 'ALL' ? (statusFilter === 'OK' ? 'successful' : statusFilter.toLowerCase()) : ''} backups
              {statusFilter !== 'ALL' && ` (out of ${backups.length})`}
            </span>
            <span className="server-id">Server: {serverId === 'all' ? 'All Servers' : serverId}</span>
          </div>
          <button className="refresh-button" onClick={fetchBackupHistory}>
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupHistoryModal;
