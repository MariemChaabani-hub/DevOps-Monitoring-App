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

  const API_BASE = '';

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
      setError('Échec de la récupération des statuts de sauvegarde : ' + err.message);
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
    // A genuine 0 MB (e.g. a real backup that failed before writing any
    // data) is a real value, not missing data — only null/undefined mean
    // "we don't actually know". `!sizeInMB` was treating both the same
    // way, hiding a 0-byte failed backup behind "Indisponible".
    if (sizeInMB === null || sizeInMB === undefined) return 'Indisponible';
    if (sizeInMB >= 1024) {
      return (sizeInMB / 1024).toFixed(2) + ' GB';
    }
    return sizeInMB.toFixed(2) + ' MB';
  };

  /**
   * Format duration in seconds
   */
  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return 'Indisponible';
    if (seconds < 60) {
      return seconds + 's';
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}min ${secs}s`;
  };

  /**
   * Format date/time
   */
  const formatDate = (date) => {
    if (!date) return 'Jamais';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `il y a ${diffMins}min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;

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

  const translateBackupStatus = (status) => {
    switch (status) {
      case 'OK': return 'OK';
      case 'Failed': return 'Échouée';
      case 'Missing': return 'Manquante';
      default: return status;
    }
  };

  if (servers.length === 0) {
    return (
      <div className="backups-panel">
        <div className="backups-header">
          <h2>Surveillance des Sauvegardes</h2>
          <RefreshButton onRefresh={fetchBackupStatuses} />
        </div>
        <div className="no-data">Aucun serveur disponible</div>
      </div>
    );
  }

  return (
    <div className="backups-panel">
      {/* Header */}
      <div className="backups-header">
        <div className="title-area">
          <h2>Surveillance des Sauvegardes</h2>
          <button
            className="history-all-btn"
            onClick={() => {
              if (selectedServerId) {
                openBackupHistory(selectedServerId, selectedServerId);
              } else {
                openBackupHistory('all', 'All Servers');
              }
            }}
            title={selectedServerId ? `Voir l'historique de sauvegarde pour ${selectedServerId}` : "Voir l'historique de sauvegarde pour tous les serveurs"}
          >
            {selectedServerId ? "Voir les Sauvegardes" : "Toutes les Sauvegardes"}
          </button>
          {selectedServerId && (
            <div className="filter-badge">
              <span>Affichage : <strong>{selectedServerId}</strong></span>
              {onClearFilter && (
                <button onClick={onClearFilter} className="clear-filter-btn" title="Afficher tous les serveurs">
                  Tout Afficher
                </button>
              )}
            </div>
          )}
        </div>
        <div className="header-controls">
          {lastUpdate && (
            <span className="last-update">
              Dernière mise à jour : {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <RefreshButton onRefresh={fetchBackupStatuses} />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={fetchBackupStatuses} className="retry-btn">
            Réessayer
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="loading-message">
          <span>Chargement des statuts de sauvegarde...</span>
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
                      <span className="status-text">{translateBackupStatus(currentStatus)}</span>
                    </div>
                    <button
                      className="history-btn"
                      onClick={() => openBackupHistory(serverId, server.name || serverId)}
                      title="Voir l'historique de sauvegarde"
                    >
                      Historique
                    </button>
                  </div>
                </div>

                {/* Latest backup info */}
                <div className="card-content">
                  {latestBackup ? (
                    <>
                      <div className="info-row">
                        <span className="label">Dernière Sauvegarde :</span>
                        <span className="value">
                          {formatDate(latestBackup.date)}
                        </span>
                      </div>

                      <div className="info-row">
                        <span className="label">Taille :</span>
                        <span className="value">{formatSize(latestBackup.size)}</span>
                      </div>

                      <div className="info-row">
                        <span className="label">Durée :</span>
                        <span className="value">{formatDuration(latestBackup.duration)}</span>
                      </div>

                      {latestBackup.is_from_today && (
                        <div className="info-row today-badge">
                          <span className="label">Sauvegarde d'Aujourd'hui</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="no-backup">
                      <p>Aucune sauvegarde trouvée</p>
                    </div>
                  )}
                </div>

                {/* Additional info */}
                <div className="card-footer">
                  {lastSuccessful && (
                    <div className="footer-info">
                      <span className="label">Dernier Succès :</span>
                      <span className="value">{formatDate(lastSuccessful.date)}</span>
                    </div>
                  )}

                  {lastFailed && (
                    <div className="footer-info footer-warning">
                      <span className="label">Dernier Échec :</span>
                      <span className="value">{formatDate(lastFailed.date)}</span>
                    </div>
                  )}

                  {!lastSuccessful && !lastFailed && (
                    <div className="footer-info">
                      <span className="text-gray">Aucun historique de sauvegarde</span>
                    </div>
                  )}
                </div>

                {/* Health indicators */}
                <div className="card-health">
                  {backupInfo.summary && (
                    <>
                      {backupInfo.summary.is_healthy && (
                        <span className="health-indicator healthy">
                          Saine
                        </span>
                      )}
                      {backupInfo.summary.requires_attention && (
                        <span className="health-indicator warning">
                          Attention Requise
                        </span>
                      )}
                      {backupInfo.summary.has_recent_backup && (
                        <span className="health-indicator recent">
                          Récente
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
