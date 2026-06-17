/**
 * Remote Actions Panel Component
 * 5.2 Actions à distance (Remote Management)
 * - Redémarrage de services (Apache, Nginx, MySQL, Docker, etc.)
 * - Restart d'un serveur via commande distante sécurisée
 * - Reboot du serveur depuis l'interface web
 * - Arrêt/démarrage de services applicatifs
 */

import React, { useState, useEffect } from 'react';
import './RemoteActionsPanel.css';

const RemoteActionsPanel = ({ servers = [], preselectedServerId = '' }) => {
  const [selectedServer, setSelectedServer] = useState('');
  const [loading, setLoading] = useState(false);
  const [servicesStatus, setServicesStatus] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  const API_BASE = 'http://localhost:3000';

  // Services supportés
  const supportedServices = [
    { id: 'apache2', name: 'Apache', icon: '🌐', description: 'Serveur web Apache' },
    { id: 'nginx', name: 'Nginx', icon: '⚡', description: 'Serveur web Nginx' },
    { id: 'mongodb', name: 'MongoDB', icon: '🍃', description: 'Base de données MongoDB' },
    { id: 'docker', name: 'Docker', icon: '🐳', description: 'Conteneurs Docker' }
  ];

  // Fetch services status for selected server
  const fetchServicesStatus = async () => {
    if (!selectedServer) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/remote-actions/${selectedServer}/services-status`,
        {
          headers: {
            'x-admin-email': 'mariemchaabani39@gmail.com'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setServicesStatus(data.services || {});
      } else {
        console.error('Failed to fetch services status');
      }
    } catch (error) {
      console.error('Error fetching services status:', error);
    }
  };

  // Fetch audit logs for selected server
  const fetchAuditLogs = async () => {
    if (!selectedServer) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/remote-actions/${selectedServer}/audit-log`,
        {
          headers: {
            'x-admin-email': 'mariemchaabani39@gmail.com'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      } else {
        console.error('Failed to fetch audit logs');
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  // Execute remote action
  const executeRemoteAction = async (action, endpoint, payload = {}) => {
    if (!selectedServer) {
      alert('Veuillez sélectionner un serveur');
      return;
    }

    setLoading(true);
    setActionResult(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/remote-actions/${selectedServer}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-email': 'mariemchaabani39@gmail.com'
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (response.ok) {
        setActionResult({
          success: true,
          message: result.message,
          details: result
        });
        
        // Refresh services status and audit logs
        await fetchServicesStatus();
        await fetchAuditLogs();
      } else {
        setActionResult({
          success: false,
          message: result.error || 'Action failed'
        });
      }
    } catch (error) {
      setActionResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '🟢';
      case 'stopped': return '🔴';
      case 'error': return '⚠️';
      default: return '❓';
    }
  };

  // Get action icon
  const getActionIcon = (action) => {
    switch (action) {
      case 'RESTART_SERVICE': return '🔄';
      case 'START_SERVICE': return '▶️';
      case 'STOP_SERVICE': return '⏹️';
      case 'RESTART_SERVER': return '🔁';
      case 'SHUTDOWN_SERVER': return '🔌';
      default: return '⚙️';
    }
  };

  // Effect: Pre-select server when preselectedServerId changes
  useEffect(() => {
    if (preselectedServerId && preselectedServerId !== selectedServer) {
      setSelectedServer(preselectedServerId);
    }
  }, [preselectedServerId]);

  // Effect: Fetch services status when server changes
  useEffect(() => {
    if (selectedServer) {
      fetchServicesStatus();
      fetchAuditLogs();
    }
  }, [selectedServer]);

  return (
    <div className="remote-actions-panel">
      <div className="panel-header">
        <h2>🔧 Actions à Distance (Remote Management)</h2>
        <p className="panel-description">
          Gérez vos serveurs à distance avec authentification forte et audit complet
        </p>
      </div>

      {/* Server Selection */}
      <div className="server-selection">
        <label htmlFor="server-select">Sélectionner un serveur:</label>
        <select
          id="server-select"
          value={selectedServer}
          onChange={(e) => setSelectedServer(e.target.value)}
          className="server-select"
        >
          <option value="">-- Choisir un serveur --</option>
          {servers.map((server) => (
            <option key={server._id} value={server.server_id || server.serverId}>
              {server.name || server.server_id || server.serverId}
            </option>
          ))}
        </select>
      </div>

      {selectedServer && (
        <>
          {/* Services Status */}
          <div className="services-status-section">
            <h3>📊 Statut des Services</h3>
            <div className="services-grid">
              {supportedServices.map((service) => {
                const status = servicesStatus[service.id];
                return (
                  <div key={service.id} className="service-card">
                    <div className="service-header">
                      <span className="service-icon">{service.icon}</span>
                      <span className="service-name">{service.name}</span>
                      <span className="service-status">
                        {getStatusIcon(status?.status || 'unknown')}
                      </span>
                    </div>
                    <div className="service-details">
                      <p className="service-description">{service.description}</p>
                      {status && (
                        <p className="service-uptime">
                          Uptime: {status.uptime || 'N/A'}
                        </p>
                      )}
                    </div>
                    <div className="service-action-buttons">
                      <button
                        onClick={() => executeRemoteAction(
                          `restart-${service.id}`,
                          'restart-service',
                          { service_name: service.id }
                        )}
                        disabled={loading}
                        className="action-btn restart-btn"
                        title="Redémarrer le service"
                      >
                        🔄 Redémarrer
                      </button>
                      <button
                        onClick={() => executeRemoteAction(
                          `stop-${service.id}`,
                          'stop-service',
                          { service_name: service.id }
                        )}
                        disabled={loading}
                        className="action-btn stop-btn"
                        title="Arrêter le service"
                      >
                        ⏹️ Arrêter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Server Actions */}
          <div className="server-actions-section">
            <h3>🖥️ Actions sur le Serveur</h3>
            <div className="server-actions-grid">
              <div className="server-action-card">
                <h4>🔁 Redémarrage du Serveur</h4>
                <p>Redémarrer complètement le serveur (downtime ~2-3 minutes)</p>
                <button
                  onClick={() => executeRemoteAction(
                    'restart-server',
                    'restart',
                    { delay: 30 }
                  )}
                  disabled={loading}
                  className="action-btn restart-server-btn"
                >
                  🔄 Redémarrer le Serveur
                </button>
              </div>

              <div className="server-action-card danger">
                <h4>🔌 Arrêt du Serveur</h4>
                <p>Arrêter complètement le serveur (nécessite intervention manuelle)</p>
                <button
                  onClick={() => executeRemoteAction(
                    'shutdown-server',
                    'shutdown',
                    { delay: 60, reason: 'Maintenance planifiée' }
                  )}
                  disabled={loading}
                  className="action-btn shutdown-btn"
                >
                  🔌 Arrêter le Serveur
                </button>
              </div>
            </div>
          </div>

          {/* Action Result */}
          {actionResult && (
            <div className={`action-result ${actionResult.success ? 'success' : 'error'}`}>
              <div className="result-header">
                <span className="result-icon">
                  {actionResult.success ? '✅' : '❌'}
                </span>
                <span className="result-title">
                  {actionResult.success ? 'Action Réussie' : 'Action Échouée'}
                </span>
              </div>
              <div className="result-message">
                {actionResult.message}
              </div>
              {actionResult.details && (
                <div className="result-details">
                  <pre>{JSON.stringify(actionResult.details, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {/* Audit Logs */}
          <div className="audit-section">
            <div className="audit-header">
              <h3>📋 Journal d'Audit</h3>
              <button
                onClick={() => setShowAuditLogs(!showAuditLogs)}
                className="toggle-audit-btn"
              >
                {showAuditLogs ? '📁 Cacher' : '📂 Afficher'} les logs
              </button>
            </div>

            {showAuditLogs && (
              <div className="audit-logs">
                {auditLogs.length === 0 ? (
                  <div className="no-logs">
                    <p>📭 Aucune action d'audit trouvée</p>
                  </div>
                ) : (
                  <div className="logs-list">
                    {auditLogs.map((log, index) => (
                      <div key={index} className="log-entry">
                        <div className="log-header">
                          <span className="log-action">
                            {getActionIcon(log.action)} {log.action}
                          </span>
                          <span className={`log-result ${log.result.toLowerCase()}`}>
                            {log.result}
                          </span>
                          <span className="log-timestamp">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        <div className="log-details">
                          <p><strong>Serveur:</strong> {log.server_id}</p>
                          <p><strong>Admin:</strong> {log.admin_email}</p>
                          <p><strong>IP:</strong> {log.ip_address}</p>
                          {log.details && (
                            <p><strong>Détails:</strong> {log.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedServer && (
        <div className="no-server-selected">
          <p>📋 Veuillez sélectionner un serveur pour voir les actions disponibles</p>
        </div>
      )}
    </div>
  );
};

export default RemoteActionsPanel;
