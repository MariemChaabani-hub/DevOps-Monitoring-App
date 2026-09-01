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
import ConfirmActionModal from './ConfirmActionModal';

const QUICK_FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'Actifs' },
  { key: 'stopped', label: 'Arrêtés' },
  { key: 'failed', label: 'En échec' }
];

// How many cards a section shows before "Voir plus" — applied after the
// quick filter, so filtering down to fewer than this never shows a button.
const SERVICES_PAGE_SIZE = 6;

const RemoteActionsPanel = ({ servers = [], preselectedServerId = '' }) => {
  const [selectedServer, setSelectedServer] = useState('');
  // State granulaire: clé = "serviceName_action" (ex: "pm2_restart", "nginx_stop")
  const [actionStates, setActionStates] = useState({});
  const [servicesStatus, setServicesStatus] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [showSystemServices, setShowSystemServices] = useState(false);
  const [quickFilter, setQuickFilter] = useState('all');
  // Independent "voir plus" state per zone — expanding Applicatifs must
  // not expand Système, and vice versa.
  const [expandedZones, setExpandedZones] = useState({ failed: false, applicative: false, system: false });
  // { serviceName, action, endpoint, payload } of the action pending
  // confirmation, or null. Only used for restart_only + restart.
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

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

  // Real status label per sub-state, used when the live /services-status
  // check hasn't answered yet and we fall back to the last state the agent
  // reported. 'running' is the only state that should ever read as green —
  // an 'active' service that is actually SubState=exited (a one-shot unit
  // that already finished) must NOT show as if it were running.
  const SUB_STATE_META = {
    running: { className: 'running', label: 'En cours d\'exécution' },
    exited: { className: 'exited', label: 'Terminé (ponctuel)' },
    dead: { className: 'inactive', label: 'Arrêté' },
    failed: { className: 'failed', label: 'Échec' },
    unknown: { className: 'unknown', label: 'Inconnu' }
  };

  // Combines the live per-action verification (servicesStatus, from
  // /services-status) with the service's last-known state from the agent's
  // own detection, live check taking priority. Never defaults to "running".
  const getEffectiveSubState = (service) => {
    const live = servicesStatus[service.name];
    const status = live?.status || service.active_state || 'unknown';
    const subState = live?.subState || service.sub_state || 'unknown';
    return (status === 'failed' || subState === 'failed') ? 'failed' : subState;
  };

  const getServiceBadge = (service) => SUB_STATE_META[getEffectiveSubState(service)] || SUB_STATE_META.unknown;

  const handleQuickFilterChange = (filterKey) => {
    setQuickFilter(filterKey);
    setExpandedZones({ failed: false, applicative: false, system: false });
  };

  const toggleZoneExpanded = (zone) => {
    setExpandedZones(prev => ({ ...prev, [zone]: !prev[zone] }));
  };

  // Criticality is decided server-side (see remoteActions.js) and only
  // known once /services-status has answered for this service — default
  // to 'none' until then rather than guessing.
  const getServiceCriticality = (serviceName) => servicesStatus[serviceName]?.criticality || 'none';

  const matchesQuickFilter = (service) => {
    if (quickFilter === 'all') return true;
    const subState = getEffectiveSubState(service);
    if (quickFilter === 'active') return subState === 'running';
    if (quickFilter === 'stopped') return subState === 'dead' || subState === 'exited';
    if (quickFilter === 'failed') return subState === 'failed';
    return true;
  };

  // Serveur actuellement sélectionné (objet complet, pour lire ses services détectés)
  const selectedServerObj = servers.find(
    (s) => (s.server_id || s.serverId) === selectedServer
  );
  // server.services is normalized backend-side to {name, active_state,
  // sub_state, description, is_system} objects — but a document not yet
  // refreshed by a new-format agent, or an agent that was never updated,
  // can still hand us a plain string. Normalize defensively here too.
  const allServices = (selectedServerObj?.services || []).map(s =>
    typeof s === 'string'
      ? { name: s, active_state: 'unknown', sub_state: 'unknown', description: '', is_system: false }
      : s
  );
  const allServiceNames = allServices.map(s => s.name);
  const servicesDetectionFailedAt = selectedServerObj?.services_detection_failed_at;

  // Three zones: failures always float to the top regardless of category,
  // then applicative services (the default, actionable view), then system/
  // infra services (collapsed by default — that's most of the noise on a
  // real host). The quick filter narrows what's visible within each zone,
  // it never removes services from `allServices` itself.
  const failedServices = allServices.filter(s => getEffectiveSubState(s) === 'failed').filter(matchesQuickFilter);
  const applicativeServices = allServices
    .filter(s => !s.is_system && getEffectiveSubState(s) !== 'failed')
    .filter(matchesQuickFilter);
  const systemServices = allServices
    .filter(s => s.is_system && getEffectiveSubState(s) !== 'failed')
    .filter(matchesQuickFilter);

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
          verifiedStatusLabel: result.verified_status_label || null,
          verifiedSubStateLabel: result.verified_sub_state_label || null,
          commandOutput: result.command_output || null,
          details: result
        });

        // Traceability: log to the per-service restart history for ANY
        // detected service, not just a fixed handful — restart-log only
        // makes sense for actions that leave the service running.
        if (serviceName !== 'server' && (actionType === 'restart' || actionType === 'start')) {
          fetch(
            `${API_BASE}/api/services/${currentServer}/${serviceName}/restart-log`,
            {
              method: 'POST',
              headers: { 'x-admin-email': localStorage.getItem('adminEmail') || '', ...authHeaders() }
            }
          ).catch(() => {});
        }

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
          message: result.error || 'Échec de l\'action',
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

  // Entry point for every service action button. Restart on a
  // 'restart_only' service (ssh, network stack, ...) needs an explicit
  // confirmation first — the actual enforcement happens server-side
  // (remoteActions.js requires confirm:true in the body), this is just
  // the UI step that produces it.
  const handleServiceActionClick = (serviceName, actionType, endpoint) => {
    const criticality = getServiceCriticality(serviceName);
    if (criticality === 'restart_only' && actionType === 'restart') {
      setPendingConfirmation({ serviceName, actionType, endpoint });
      return;
    }
    executeRemoteAction(serviceName, actionType, endpoint, { service_name: serviceName });
  };

  const confirmPendingAction = () => {
    if (!pendingConfirmation) return;
    const { serviceName, actionType, endpoint } = pendingConfirmation;
    executeRemoteAction(serviceName, actionType, endpoint, { service_name: serviceName, confirm: true });
    setPendingConfirmation(null);
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '';
      case 'stopped': return '';
      case 'error': return '';
      default: return '';
    }
  };

  // Get action icon
  const getActionIcon = (action) => {
    switch (action) {
      case 'RESTART_SERVICE': return '';
      case 'START_SERVICE': return '';
      case 'STOP_SERVICE': return '';
      case 'RESTART_SERVER': return '';
      case 'SHUTDOWN_SERVER': return '';
      default: return '';
    }
  };

  // Translate action code for display
  const translateAction = (action) => {
    switch (action) {
      case 'RESTART_SERVICE': return 'Redémarrage du service';
      case 'START_SERVICE': return 'Démarrage du service';
      case 'STOP_SERVICE': return 'Arrêt du service';
      case 'RESTART_SERVER': return 'Redémarrage du serveur';
      case 'SHUTDOWN_SERVER': return 'Arrêt du serveur';
      default: return action;
    }
  };

  // Translate audit result for display
  const translateResult = (result) => {
    switch (result) {
      case 'SUCCESS': return 'SUCCÈS';
      case 'FAILED': return 'ÉCHEC';
      default: return result;
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
      setShowSystemServices(false);
      setQuickFilter('all');
      setExpandedZones({ failed: false, applicative: false, system: false });
    }

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [selectedServer]);

  // Renders a zone's grid capped at SERVICES_PAGE_SIZE cards, with a
  // "Voir plus"/"Voir moins" toggle below — applied after the quick
  // filter already narrowed `services`, so a filtered-down list under the
  // page size never shows a button.
  const renderZoneGrid = (services, zoneKey) => {
    const expanded = expandedZones[zoneKey];
    const visible = expanded ? services : services.slice(0, SERVICES_PAGE_SIZE);
    const remaining = services.length - visible.length;

    return (
      <>
        <div className="services-grid">
          {visible.map(renderServiceCard)}
        </div>
        {remaining > 0 && (
          <button className="show-more-btn" onClick={() => toggleZoneExpanded(zoneKey)}>
            Voir les {remaining} autres services
          </button>
        )}
        {remaining === 0 && expanded && services.length > SERVICES_PAGE_SIZE && (
          <button className="show-more-btn" onClick={() => toggleZoneExpanded(zoneKey)}>
            Voir moins
          </button>
        )}
      </>
    );
  };

  const renderServiceCard = (detectedService) => {
    const serviceName = detectedService.name;
    const badge = getServiceBadge(detectedService);
    const live = servicesStatus[serviceName];
    const criticality = getServiceCriticality(serviceName);
    const canStop = criticality === 'none';
    const canRestart = criticality !== 'locked';
    const canStart = getEffectiveSubState(detectedService) !== 'running';

    return (
      <div key={serviceName} className="service-card">
        <div className="service-header">
          <span className="service-name">{serviceName}</span>
          <span
            className={`status-badge ${badge.className}`}
            title={live?.raw || ''}
          >
            {badge.label}
          </span>
        </div>
        <div className="service-details">
          <p className="service-description">
            {detectedService.description || 'Aucune description disponible'}
          </p>
        </div>
        <div className="service-action-buttons">
          {canStart && (
            <button
              onClick={() => handleServiceActionClick(serviceName, 'start', 'start-service')}
              disabled={isActionLoading(serviceName, 'start')}
              className="action-btn start-btn"
              title="Démarrer le service"
            >
              {isActionLoading(serviceName, 'start') ? 'Démarrage...' : 'Démarrer'}
            </button>
          )}
          {canRestart && (
            <button
              onClick={() => handleServiceActionClick(serviceName, 'restart', 'restart-service')}
              disabled={isActionLoading(serviceName, 'restart')}
              className="action-btn restart-btn"
              title={criticality === 'restart_only' ? 'Redémarrer le service (confirmation requise)' : 'Redémarrer le service'}
            >
              {isActionLoading(serviceName, 'restart') ? 'Redémarrage...' : 'Redémarrer'}
            </button>
          )}
          {canStop && (
            <button
              onClick={() => handleServiceActionClick(serviceName, 'stop', 'stop-service')}
              disabled={isActionLoading(serviceName, 'stop')}
              className="action-btn stop-btn"
              title="Arrêter le service"
            >
              {isActionLoading(serviceName, 'stop') ? 'Arrêt...' : 'Arrêter'}
            </button>
          )}
          {!canStop && !canRestart && (
            <span className="service-protected-note">Service protégé</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="remote-actions-panel">
      <div className="panel-header">
        <h2>Actions à Distance</h2>
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
            <h3>Statut des Services ({allServiceNames.length})</h3>
            {servicesDetectionFailedAt && (
              <p className="services-detection-warning">
                Détection des services indisponible depuis le {formatTimestamp(servicesDetectionFailedAt)}
                {' '}— la liste ci-dessous peut être obsolète.
              </p>
            )}
            {allServiceNames.length === 0 ? (
              <p className="no-services-message">
                Aucun service détecté pour ce serveur pour le moment.
              </p>
            ) : (
              <>
                <div className="quick-filter-bar">
                  {QUICK_FILTERS.map(f => (
                    <button
                      key={f.key}
                      className={`quick-filter-btn ${quickFilter === f.key ? 'active' : ''}`}
                      onClick={() => handleQuickFilterChange(f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {failedServices.length > 0 && (
                  <div className="services-zone services-zone-failed">
                    <h4>En échec ({failedServices.length})</h4>
                    {renderZoneGrid(failedServices, 'failed')}
                  </div>
                )}

                <div className="services-zone">
                  <h4>Applicatifs ({applicativeServices.length})</h4>
                  {applicativeServices.length === 0 ? (
                    <p className="no-services-message">Aucun service applicatif ne correspond à ce filtre.</p>
                  ) : renderZoneGrid(applicativeServices, 'applicative')}
                </div>

                <div className="services-zone">
                  <button
                    className="toggle-audit-btn"
                    onClick={() => setShowSystemServices(!showSystemServices)}
                  >
                    {showSystemServices ? 'Masquer' : 'Afficher'} les services système ({systemServices.length})
                  </button>
                  {showSystemServices && (
                    systemServices.length === 0 ? (
                      <p className="no-services-message">Aucun service système ne correspond à ce filtre.</p>
                    ) : renderZoneGrid(systemServices, 'system')
                  )}
                </div>
              </>
            )}
          </div>

          {/* Server Actions */}
          <div className="server-actions-section">
            <h3>Actions sur le Serveur</h3>
            <div className="server-actions-grid">
              <div className="server-action-card">
                <h4>Redémarrage du Serveur</h4>
                <p>Redémarrer complètement le serveur (interruption ~2-3 minutes)</p>
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
                  {isActionLoading('server', 'restart') ? 'Redémarrage du serveur...' : 'Redémarrer le Serveur'}
                </button>
              </div>

              <div className="server-action-card danger">
                <h4>Arrêt du Serveur</h4>
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
                  {isActionLoading('server', 'shutdown') ? 'Arrêt du serveur...' : 'Arrêter le Serveur'}
                </button>
              </div>
            </div>
          </div>

          {/* Action Result */}
          {actionResult && (
            <div className={`action-result ${actionResult.success ? 'success' : 'error'}`}>
              <div className="result-header">
                <span className="result-icon">
                  {actionResult.success ? '' : ''}
                </span>
                <span className="result-title">
                  {actionResult.success ? 'Action Réussie' : 'Action Échouée'}
                </span>
                {actionResult.verifiedStatus && (
                  <span className={`verified-status-badge ${actionResult.verifiedStatus}`}>
                    Vérifié: {actionResult.verifiedSubStateLabel || actionResult.verifiedStatusLabel || 'Inconnu'}
                  </span>
                )}
              </div>
              <div className="result-message">
                {actionResult.message}
              </div>
              {actionResult.commandOutput && (
                <div className="result-command-output">
                  <strong>Sortie de la commande :</strong>
                  <pre>{actionResult.commandOutput}</pre>
                </div>
              )}
              {actionResult.stderr && (
                <div className="result-stderr">
                  <strong>Erreur :</strong>
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
              <h3>Journal d'Audit</h3>
              <button
                onClick={() => setShowAuditLogs(!showAuditLogs)}
                className="toggle-audit-btn"
              >
                {showAuditLogs ? 'Cacher' : 'Afficher'} les logs
              </button>
            </div>

            {showAuditLogs && (
              <div className="audit-logs">
                {auditLogs.length === 0 ? (
                  <div className="no-logs">
                    <p>Aucune action d'audit trouvée</p>
                  </div>
                ) : (
                  <div className="logs-list">
                    {auditLogs.map((log, index) => (
                      <div key={index} className="log-entry">
                        <div className="log-header">
                          <span className="log-action">
                            {getActionIcon(log.action)} {translateAction(log.action)}
                          </span>
                          <span className={`log-result ${log.result.toLowerCase()}`}>
                            {translateResult(log.result)}
                          </span>
                          <span className="log-timestamp">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        <div className="log-details">
                          <p><strong>Serveur :</strong> {log.server_id}</p>
                          <p><strong>Admin :</strong> {log.admin_email}</p>
                          <p><strong>IP :</strong> {log.ip_address}</p>
                          {log.details && (
                            <p><strong>Détails :</strong> {log.details}</p>
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
          <p>Veuillez sélectionner un serveur pour voir les actions disponibles</p>
        </div>
      )}

      <ConfirmActionModal
        isOpen={!!pendingConfirmation}
        title="Confirmation requise"
        message={pendingConfirmation
          ? `Redémarrer ${pendingConfirmation.serviceName} sur ${selectedServerObj?.name || selectedServer} ? Cette action peut interrompre l'accès au serveur.`
          : ''}
        confirmLabel="Redémarrer"
        busy={pendingConfirmation ? isActionLoading(pendingConfirmation.serviceName, 'restart') : false}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingConfirmation(null)}
      />
    </div>
  );
};

export default RemoteActionsPanel;
