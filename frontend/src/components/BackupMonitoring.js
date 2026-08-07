/**
 * Backup Monitoring Dashboard Component
 * Displays real-time backup status with history and WebSocket updates
 */

import React, { useEffect, useState, useRef } from 'react';
import BackupStatusBadge from './BackupStatusBadge';
import BackupStatusIndicator from './BackupStatusIndicator';
import './BackupMonitoring.css';

const BackupMonitoring = ({ serverId }) => {
  // State for current backup status
  const [latestBackup, setLatestBackup] = useState(null);
  const [indicators, setIndicators] = useState(null);
  const [backupHistory, setBackupHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState('disconnected');

  const socketRef = useRef(null);
  const API_BASE = 'http://localhost:5000';

  /**
   * Fetch initial backup data
   */
  const fetchBackupData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch latest backup
      const latestRes = await fetch(
        `${API_BASE}/api/backups/${serverId}/latest`
      );
      if (latestRes.ok) {
        const latest = await latestRes.json();
        setLatestBackup(latest.latest_backup);
      }

      // Fetch backup indicators (stats)
      const indicatorsRes = await fetch(
        `${API_BASE}/api/backups/${serverId}/indicators`
      );
      if (indicatorsRes.ok) {
        const data = await indicatorsRes.json();
        setIndicators(data.indicators);
      }

      // Fetch backup history
      const historyRes = await fetch(
        `${API_BASE}/api/backups/${serverId}?limit=20&skip=0`
      );
      if (historyRes.ok) {
        const data = await historyRes.json();
        setBackupHistory(data.backups || []);
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching backup data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  /**
   * Initialize WebSocket connection for real-time updates
   */
  const initializeWebSocket = () => {
    try {
      // Check if socket.io is available
      const script = document.createElement('script');
      script.src = `${API_BASE}/socket.io/socket.io.js`;
      script.onload = () => {
        // @ts-ignore
        if (window.io) {
          // @ts-ignore
          const socket = window.io(API_BASE, {
            transports: ['websocket', 'polling']
          });

          socket.on('connect', () => {
            console.log('[Backup Monitor] Connected to WebSocket');
            setRealtimeStatus('connected');

            // Subscribe to this server's backup updates
            socket.emit('subscribe_backup_updates', serverId);
          });

          socket.on('disconnect', () => {
            console.log('[Backup Monitor] Disconnected from WebSocket');
            setRealtimeStatus('disconnected');
          });

          // Listen for backup updates
          socket.on('backup_update', (event) => {
            console.log('[Backup Monitor] Received backup update:', event);
            if (event.serverId === serverId) {
              setLatestBackup({
                status: event.status,
                duration: event.duration,
                size: event.size,
                date: event.date
              });

              // Refresh history to include new backup
              fetchBackupData();
            }
          });

          // Listen for status changes
          socket.on('backup_status_change', (event) => {
            console.log('[Backup Monitor] Status changed:', event);
            if (event.serverId === serverId) {
              fetchBackupData();
            }
          });

          // Listen for late backup alerts
          socket.on('late_backup_alert', (event) => {
            console.log('[Backup Monitor] Late backup alert:', event);
            if (event.serverId === serverId) {
              fetchBackupData();
            }
          });

          socket.on('error', (error) => {
            console.error('[Backup Monitor] Socket error:', error);
            setRealtimeStatus('error');
          });

          socketRef.current = socket;
        }
      };
      document.head.appendChild(script);
    } catch (err) {
      console.warn('WebSocket initialization failed:', err);
      setRealtimeStatus('error');
    }
  };

  /**
   * Get status badge color
   */
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'OK':
        return 'badge-success';
      case 'FAILED':
        return 'badge-danger';
      case 'LATE':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Indisponible';
    return new Date(dateString).toLocaleString();
  };

  /**
   * Format bytes to human readable
   */
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 MB';
    return `${bytes} MB`;
  };

  /**
   * Format seconds to human readable
   */
  const formatDuration = (seconds) => {
    if (seconds === 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}min ${secs}s`;
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchBackupData();
    initializeWebSocket();

    return () => {
      // Cleanup WebSocket connection
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe_backup_updates', serverId);
        socketRef.current.disconnect();
      }
    };
  }, [serverId]);

  if (loading && !latestBackup) {
    return (
      <div className="backup-monitor">
        <div className="loading">Chargement des données de sauvegarde...</div>
      </div>
    );
  }

  return (
    <div className="backup-monitor">
      {/* Header */}
      <div className="backup-header">
        <h2>Surveillance des Sauvegardes - {serverId}</h2>
        <div className="realtime-indicator">
          <span
            className={`status-dot ${realtimeStatus}`}
            title={`Statut temps réel : ${realtimeStatus}`}
          />
          <span className="status-text">{realtimeStatus === 'connected' ? 'connecté' : realtimeStatus === 'disconnected' ? 'déconnecté' : realtimeStatus}</span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Status Indicator */}
      {latestBackup && (
        <div className="status-indicator-container">
          <BackupStatusIndicator status={latestBackup.status} animated={true} />
        </div>
      )}

      {/* Status Cards */}
      <div className="backup-cards">
        {/* Latest Backup Status Card */}
        <div className="card">
          <div className="card-header">Dernière Sauvegarde</div>
          <div className="card-body">
            {latestBackup ? (
              <>
                <div className="status-badge">
                  <BackupStatusBadge status={latestBackup.status} size="large" showIcon={true} />
                </div>
                <div className="backup-detail">
                  <span className="label">Date :</span>
                  <span className="value">{formatDate(latestBackup.date)}</span>
                </div>
                <div className="backup-detail">
                  <span className="label">Durée :</span>
                  <span className="value">{formatDuration(latestBackup.duration)}</span>
                </div>
                <div className="backup-detail">
                  <span className="label">Taille :</span>
                  <span className="value">{formatBytes(latestBackup.size)}</span>
                </div>
              </>
            ) : (
              <div className="no-data">Aucune donnée de sauvegarde disponible</div>
            )}
          </div>
        </div>

        {/* Health Indicators Card */}
        {indicators && (
          <div className="card">
            <div className="card-header">Indicateurs de Santé</div>
            <div className="card-body">
              <div className="health-score">
                <div className="score-value">{indicators.health_score}</div>
                <div className="score-label">Score de Santé</div>
              </div>
              <div className="stats-grid">
                <div className="stat">
                  <span className="stat-label">Total Sauvegardes</span>
                  <span className="stat-value">{indicators.total_backups}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Réussies</span>
                  <span className="stat-value ok">{indicators.status_breakdown.ok}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Échouées</span>
                  <span className="stat-value failed">{indicators.status_breakdown.failed}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">En Retard</span>
                  <span className="stat-value late">{indicators.status_breakdown.late}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Average Stats Card */}
        {indicators && (
          <div className="card">
            <div className="card-header">Statistiques Moyennes</div>
            <div className="card-body">
              <div className="backup-detail">
                <span className="label">Durée Moyenne :</span>
                <span className="value">{formatDuration(indicators.average_duration_seconds)}</span>
              </div>
              <div className="backup-detail">
                <span className="label">Taille Moyenne :</span>
                <span className="value">{formatBytes(indicators.average_size_mb)}</span>
              </div>
              {indicators.last_successful_backup_date && (
                <div className="backup-detail">
                  <span className="label">Dernier Succès :</span>
                  <span className="value">{formatDate(indicators.last_successful_backup_date)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Backup History Table */}
      <div className="backup-table-container">
        <h3>Historique des Sauvegardes</h3>
        {backupHistory.length > 0 ? (
          <table className="backup-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Statut</th>
                <th>Durée</th>
                <th>Taille</th>
              </tr>
            </thead>
            <tbody>
              {backupHistory.map((backup, index) => (
                <tr key={backup._id || index}>
                  <td>{formatDate(backup.date)}</td>
                  <td>
                    <BackupStatusBadge status={backup.status} size="small" showIcon={true} />
                  </td>
                  <td>{formatDuration(backup.duration)}</td>
                  <td>{formatBytes(backup.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">Aucun historique de sauvegarde disponible</div>
        )}
      </div>

      {/* Footer */}
      <div className="backup-footer">
        <small>Dernière mise à jour : {lastUpdate ? formatDate(lastUpdate) : 'Jamais'}</small>
        <button className="refresh-btn" onClick={fetchBackupData}>
          Actualiser
        </button>
      </div>
    </div>
  );
};

export default BackupMonitoring;
