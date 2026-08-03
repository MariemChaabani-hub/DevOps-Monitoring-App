/**
 * Remote Actions Panel Component
 * 5.2 Actions à distance (Remote Management)
 * - Redémarrage de services (Apache, Nginx, MySQL, Docker, etc.)
 * - Restart d'un serveur via commande distante sécurisée
 * - Reboot du serveur depuis l'interface web
 * - Arrêt/démarrage de services applicatifs
 */

import React, { useState, useEffect, useRef } from 'react';
import './RemoteActionsPanel.css';
import { authHeaders } from '../utils/auth';

const RemoteActionsPanel = ({ servers = [], preselectedServerId = '' }) => {
  const [selectedServer, setSelectedServer] = useState('');
  // State granulaire: clé = "serviceName_action" (ex: "pm2_restart", "nginx_stop")
  const [actionStates, setActionStates] = useState({});
  const [servicesStatus, setServicesStatus] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  const statusIntervalRef = useRef(null);

  const API_BASE = '';

  // Générer une clé unique pour chaque action de service
  const getActionKey = (serviceName, actionType) => {
    return `${serviceName}_${actionType}`;
  };

  // Vérifier si une action spécifique est en cours
  const isActionLoading = (serviceName, actionType) => {
    return actionStates[getActionKey(serviceName, actionType)] || false;
  };

  // Mettre à jour l'état d'une action spécifique
  const setActionLoading = (serviceName, actionType, isLoading) => {
    setActionStates(prev => ({
      ...prev,
      [getActionKey(serviceName, actionType)]: isLoading
    }));
  };

  // Services supportés
  const supportedServices = [
    { id: 'pm2', name: 'PM2', icon: '⚙️', description: 'Gestionnaire de processus PM2' },
    { id: 'nginx', name: 'Nginx', icon: '⚡', description: 'Serveur web Nginx' },
    { id: 'mongodb', name: 'MongoDB', icon: '🍃', description: 'Base de données MongoDB' },
    { id: 'apache', name: 'Apache', icon: '🌐', description: 'Serveur HTTP Apache' }
  ];

  // Fetch services status for selected server
  const fetchServicesStatus = async (serverId = selectedServer) => {
    if (!serverId) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/remote-actions/${serverId}/services-status`,
        {
          headers: {
            'x-admin-email': localStorage.getItem('adminEmail') || '',
            ...authHeaders()
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
  const fetchAuditLogs = async (serverId = selectedServer) => {
    if (!serverId) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/remote-actions/${serverId}/audit-log`,
        {
          headers: {
            'x-admin-email': localStorage.getItem('adminEmail') || '',
            ...authHeaders()
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
  const executeRemoteAction = async (serviceName, actionType, endpoint, payload = {}) => {
    if (!selectedServer) {
      alert('Veuillez sélectionner un serveur');
      return;
    }

    const currentServer = selectedServer;

    // Activer le loading pour cette action spécifique
    setActionLoading(serviceName, actionType, true);
    setActionResult(null);

    // Clear any existing status refresh interval
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/remote-actions/${currentServer}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-email': localStorage.getItem('adminEmail') || '',
            ...authHeaders()
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (response.ok) {
        setActionResult({
          success: true,
          message: result.message,
          verifiedStatus: result.verified_status || null,
          commandOutput: result.command_output || null,
          details: result
        });
        
        // Refresh services status and audit logs immediately
        await fetchServicesStatus(currentServer);
        await fetchAuditLogs(currentServer);

        // Automatically refresh service status every 3s for 15s (5 times total)
        let checkCount = 0;
        statusIntervalRef.current = setInterval(async () => {
          checkCount++;
          await fetchServicesStatus(currentServer);
          if (checkCount >= 5) {
            clearInterval(statusIntervalRef.current);
            statusIntervalRef.current = null;
          }
        }, 3000);
      } else {
        setActionResult({
          success: false,
          message: result.error || 'Action failed',
          stderr: result.stderr || null
        });
      }
    } catch (error) {
      setActionResult({
        success: false,
        message: error.message
      });
    } finally {
      // Désactiver le loading pour cette action spécifique
      setActionLoading(serviceName, actionType, false);
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
      fetchServicesStatus(selectedServer);
      fetchAuditLogs(selectedServer);
    }

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
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
                      <span className={`status-badge ${status?.status || 'unknown'}`}>
                        {status?.status === 'running' ? '🟢 Active' :
                         status?.status === 'stopped' ? '🔴 Inactive' :
                         '🟡 Unknown'}
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
                          service.id,
                          'restart',
                          'restart-service',
                          { service_name: service.id }
                        )}
                        disabled={isActionLoading(service.id, 'restart')}
                        className="action-btn restart-btn"
                        title="Redémarrer le service"
                      >
                        {isActionLoading(service.id, 'restart') ? '⏳ Redémarrage...' : '🔄 Redémarrer'}
                      </button>
                      <button
                        onClick={() => executeRemoteAction(
                          service.id,
                          'stop',
                          'stop-service',
                          { service_name: service.id }
                        )}
                        disabled={isActionLoading(service.id, 'stop')}
                        className="action-btn stop-btn"
                        title="Arrêter le service"
                      >
                        {isActionLoading(service.id, 'stop') ? '⏳ Arrêt...' : '⏹️ Arrêter'}
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
                    'server',
                    'restart',
                    'restart',
                    { delay: 30 }
                  )}
                  disabled={isActionLoading('server', 'restart')}
                  className="action-btn restart-server-btn"
                >
                  {isActionLoading('server', 'restart') ? '⏳ Redémarrage du serveur...' : '🔄 Redémarrer le Serveur'}
                </button>
              </div>

              <div className="server-action-card danger">
                <h4>🔌 Arrêt du Serveur</h4>
                <p>Arrêter complètement le serveur (nécessite intervention manuelle)</p>
                <button
                  onClick={() => executeRemoteAction(
                    'server',
                    'shutdown',
                    'shutdown',
                    { delay: 60, reason: 'Maintenance planifiée' }
                  )}
                  disabled={isActionLoading('server', 'shutdown')}
                  className="action-btn shutdown-btn"
                >
                  {isActionLoading('server', 'shutdown') ? '⏳ Arrêt du serveur...' : '🔌 Arrêter le Serveur'}
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
                {actionResult.verifiedStatus && (
                  <span className={`verified-status-badge ${actionResult.verifiedStatus}`}>
                    {actionResult.verifiedStatus === 'active' ? '🟢 Vérifié: Actif' :
                     actionResult.verifiedStatus === 'inactive' ? '🔴 Vérifié: Inactif' :
                     '🟡 Vérifié: Inconnu'}
                  </span>
                )}
              </div>
              <div className="result-message">
                {actionResult.message}
              </div>
              {actionResult.commandOutput && (
                <div className="result-command-output">
                  <strong>Sortie de la commande:</strong>
                  <pre>{actionResult.commandOutput}</pre>
                </div>
              )}
              {actionResult.stderr && (
                <div className="result-stderr">
                  <strong>Erreur:</strong>
                  <pre>{actionResult.stderr}</pre>
                </div>
              )}
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
