/**
 * Backups Monitoring Panel Component
 * Displays backup status for all servers with color-coded indicators
 * - Green (OK): Last backup successful
 * - Red (Failed): Last backup failed
 * - Orange (Missing): No backup found
 */

import React, { useEffect, useState } from 'react';
import './BackupsPanel.css';
import RefreshButton from './RefreshButton';
import BackupHistoryModal from './BackupHistoryModal';

const BackupsPanel = ({ servers = [], selectedServerId = null, onClearFilter = null }) => {
  const [backupStatuses, setBackupStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [historyModal, setHistoryModal] = useState({ isOpen: false, serverId: null, serverName: null });

  const API_BASE = 'http://localhost:3000';

  /**
   * Fetch backup status for all servers
   */
  const fetchBackupStatuses = async () => {
    setLoading(true);
    try {
      const statuses = {};

      // Fetch latest backup for each server
      for (const server of servers) {
        try {
          const serverId = server.serverId || server.server_id || server._id;
          const response = await fetch(
            `${API_BASE}/api/backups/latest/${serverId}`
          );

          if (response.ok) {
            const data = await response.json();
            statuses[serverId] = data;
          } else {
            // Server has no backups yet
            statuses[serverId] = {
              server_id: serverId,
              latest_backup: null,
              current_status: 'Missing',
              summary: {
                has_recent_backup: false,
                is_healthy: false,
                requires_attention: true
              }
            };
          }
        } catch (err) {
          console.error(`Error fetching backup status for ${server.server_id}:`, err);
          statuses[server.server_id] = {
            server_id: server.server_id,
            latest_backup: null,
            current_status: 'Missing',
            error: err.message
          };
        }
      }

      setBackupStatuses(statuses);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch backup statuses: ' + err.message);
      console.error('Error fetching backup statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (servers.length > 0) {
      fetchBackupStatuses();
    }
  }, [servers]);

  /**
   * Get color based on backup status
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'OK':
        return '#4CAF50'; // Green
      case 'Failed':
        return '#F44336'; // Red
      case 'Missing':
        return '#FF9800'; // Orange
      default:
        return '#9E9E9E'; // Gray
    }
  };

  /**
   * Get status badge class
   */
  const getStatusClass = (status) => {
    switch (status) {
      case 'OK':
        return 'status-ok';
      case 'Failed':
        return 'status-failed';
      case 'Missing':
        return 'status-missing';
      default:
        return 'status-unknown';
    }
  };

  /**
   * Format file size
   */
  const formatSize = (sizeInMB) => {
    if (!sizeInMB) return 'N/A';
    if (sizeInMB >= 1024) {
      return (sizeInMB / 1024).toFixed(2) + ' GB';
    }
    return sizeInMB.toFixed(2) + ' MB';
  };

  /**
   * Format duration in seconds
   */
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) {
      return seconds + 's';
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  /**
   * Format date/time
   */
  const formatDate = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Open backup history modal
   */
  const openBackupHistory = (serverId, serverName) => {
    setHistoryModal({ isOpen: true, serverId, serverName });
  };

  /**
   * Close backup history modal
   */
  const closeBackupHistory = () => {
    setHistoryModal({ isOpen: false, serverId: null, serverName: null });
  };

  if (servers.length === 0) {
    return (
      <div className="backups-panel">
        <div className="backups-header">
          <h2>Backup Monitoring</h2>
          <RefreshButton onRefresh={fetchBackupStatuses} />
        </div>
        <div className="no-data">No servers available</div>
      </div>
    );
  }

  return (
    <div className="backups-panel">
      {/* Header */}
      <div className="backups-header">
        <div className="title-area">
          <h2>Backup Monitoring</h2>
          <button 
            className="history-all-btn"
            onClick={() => openBackupHistory('all', 'All Servers')}
            title="View backup history for all servers"
          >
            📋 All Backups
          </button>
          {selectedServerId && (
            <div className="filter-badge">
              <span>Showing: <strong>{selectedServerId}</strong></span>
              {onClearFilter && (
                <button onClick={onClearFilter} className="clear-filter-btn" title="Show all servers">
                  ✕ Show All
                </button>
              )}
            </div>
          )}
        </div>
        <div className="header-controls">
          {lastUpdate && (
            <span className="last-update">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <RefreshButton onRefresh={fetchBackupStatuses} />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="error-message">
          <span>⚠ {error}</span>
          <button onClick={fetchBackupStatuses} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="loading-message">
          <span>Loading backup statuses...</span>
        </div>
      )}

      {/* Backup status grid */}
      {!loading && (
        <div className="backups-grid">
          {servers
            .filter((server) => {
              const serverId = server.serverId || server.server_id || server._id;
              return !selectedServerId || serverId === selectedServerId;
            })
            .map((server) => {
              const serverId = server.serverId || server.server_id || server._id;
            const backupInfo = backupStatuses[serverId] || {};
            const latestBackup = backupInfo.latest_backup;
            const currentStatus = backupInfo.current_status || 'Missing';
            const lastSuccessful = backupInfo.last_successful;
            const lastFailed = backupInfo.last_failed;

            return (
              <div
                key={serverId}
                className="backup-card"
                style={{
                  borderTopColor: getStatusColor(currentStatus)
                }}
              >
                {/* Server name and status indicator */}
                <div className="card-header">
                  <h3>{server.name || serverId}</h3>
                  <div className="header-actions">
                    <div className={`status-badge ${getStatusClass(currentStatus)}`}>
                      <span className="status-dot"></span>
                      <span className="status-text">{currentStatus}</span>
                    </div>
                    <button 
                      className="history-btn"
                      onClick={() => openBackupHistory(serverId, server.name || serverId)}
                      title="View backup history"
                    >
                      📋 History
                    </button>
                  </div>
                </div>

                {/* Latest backup info */}
                <div className="card-content">
                  {latestBackup ? (
                    <>
                      <div className="info-row">
                        <span className="label">Last Backup:</span>
                        <span className="value">
                          {formatDate(latestBackup.date)}
                        </span>
                      </div>

                      <div className="info-row">
                        <span className="label">Size:</span>
                        <span className="value">{formatSize(latestBackup.size)}</span>
                      </div>

                      <div className="info-row">
                        <span className="label">Duration:</span>
                        <span className="value">{formatDuration(latestBackup.duration)}</span>
                      </div>

                      {latestBackup.is_from_today && (
                        <div className="info-row today-badge">
                          <span className="label">✓ Today's Backup</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="no-backup">
                      <p>No backup found</p>
                    </div>
                  )}
                </div>

                {/* Additional info */}
                <div className="card-footer">
                  {lastSuccessful && (
                    <div className="footer-info">
                      <span className="label">Last Success:</span>
                      <span className="value">{formatDate(lastSuccessful.date)}</span>
                    </div>
                  )}

                  {lastFailed && (
                    <div className="footer-info footer-warning">
                      <span className="label">Last Failed:</span>
                      <span className="value">{formatDate(lastFailed.date)}</span>
                    </div>
                  )}

                  {!lastSuccessful && !lastFailed && (
                    <div className="footer-info">
                      <span className="text-gray">No backup history</span>
                    </div>
                  )}
                </div>

                {/* Health indicators */}
                <div className="card-health">
                  {backupInfo.summary && (
                    <>
                      {backupInfo.summary.is_healthy && (
                        <span className="health-indicator healthy">
                          ✓ Healthy
                        </span>
                      )}
                      {backupInfo.summary.requires_attention && (
                        <span className="health-indicator warning">
                          ⚠ Needs Attention
                        </span>
                      )}
                      {backupInfo.summary.has_recent_backup && (
                        <span className="health-indicator recent">
                          ◉ Recent
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Backup History Modal */}
      <BackupHistoryModal
        isOpen={historyModal.isOpen}
        onClose={closeBackupHistory}
        serverId={historyModal.serverId}
        serverName={historyModal.serverName}
      />
    </div>
  );
};

export default BackupsPanel;
