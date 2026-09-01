/**
 * Services Management Component
 * Affiche les services réellement détectés sur le serveur sélectionné
 * (remontés automatiquement par l'agent via systemctl), avec les actions
 * Démarrer / Redémarrer / Arrêter.
 */

import React, { useState, useEffect } from 'react';
import './ServicesPanel.css';
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

const ServicesPanel = ({ server }) => {
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [showSystemServices, setShowSystemServices] = useState(false);
  const [quickFilter, setQuickFilter] = useState('all');
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  // Independent "voir plus" state per zone — expanding Applicatifs must
  // not expand Système, and vice versa.
  const [expandedZones, setExpandedZones] = useState({ failed: false, applicative: false, system: false });

  const API_BASE = '';
  const adminEmail = localStorage.getItem('adminEmail') || '';

  const serverId = server?.server_id || server?.serverId;
  // server.services is normalized backend-side to {name, active_state,
  // sub_state, description, is_system} objects — fall back defensively for
  // a document not yet refreshed by an updated agent (plain string).
  const detectedServices = (server?.services || []).map(s =>
    typeof s === 'string'
      ? { name: s, active_state: 'unknown', sub_state: 'unknown', description: '', is_system: false }
      : s
  );
  const servicesDetectionFailedAt = server?.services_detection_failed_at;

  // Fetch real status (running/stopped/failed + criticality) for the
  // server's detected services
  const fetchServiceStatus = async () => {
    if (!serverId) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/remote-actions/${serverId}/services-status`,
        { headers: { 'x-admin-email': adminEmail, ...authHeaders() } }
      );

      if (response.ok) {
        const data = await response.json();
        setStatusMap(data.services || {});
      } else {
        console.error('Failed to fetch services status');
      }
    } catch (error) {
      console.error('Error fetching services status:', error);
    }
  };

  // Execute service action (start/restart/stop). `confirm` is forwarded to
  // the backend for a 'restart_only' service's restart — the server-side
  // guard requires it explicitly (see remoteActions.js), a UI confirmation
  // alone can be bypassed with a direct API call.
  const executeServiceAction = async (action, serviceName, confirm = false) => {
    setLoading(true);
    setActionResult(null);

    try {
      const endpoint = action === 'restart' ? 'restart-service' : action === 'start' ? 'start-service' : 'stop-service';
      const payload = { service_name: serviceName };
      if (confirm) payload.confirm = true;

      const response = await fetch(
        `${API_BASE}/api/remote-actions/${serverId}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-email': adminEmail,
            ...authHeaders()
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Traceability: log to the per-service restart history for ANY
        // detected service, not just a fixed handful — restart-log only
        // makes sense for actions that leave the service running.
        if (action === 'restart' || action === 'start') {
          fetch(
            `${API_BASE}/api/services/${serverId}/${serviceName}/restart-log`,
            {
              method: 'POST',
              headers: { 'x-admin-email': adminEmail, ...authHeaders() }
            }
          ).catch(() => {});
        }

        setActionResult({
          success: true,
          message: result.message || `Service ${serviceName} ${action === 'restart' ? 'redémarré' : action === 'start' ? 'démarré' : 'arrêté'} avec succès`
        });

        // Refresh status
        setTimeout(() => fetchServiceStatus(), 1000);
      } else {
        setActionResult({
          success: false,
          message: result.error || `Erreur lors du ${action} du service`
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

  const handleQuickFilterChange = (filterKey) => {
    setQuickFilter(filterKey);
    setExpandedZones({ failed: false, applicative: false, system: false });
  };

  const toggleZoneExpanded = (zone) => {
    setExpandedZones(prev => ({ ...prev, [zone]: !prev[zone] }));
  };

  const handleActionClick = (action, serviceName) => {
    const criticality = statusMap[serviceName]?.criticality || 'none';
    if (criticality === 'restart_only' && action === 'restart') {
      setPendingConfirmation({ serviceName, action });
      return;
    }
    executeServiceAction(action, serviceName);
  };

  const confirmPendingAction = () => {
    if (!pendingConfirmation) return;
    executeServiceAction(pendingConfirmation.action, pendingConfirmation.serviceName, true);
    setPendingConfirmation(null);
  };

  // Get status badge — colored by SubState (running/exited/dead/failed),
  // not just ActiveState: a one-shot unit reports ActiveState=active with
  // SubState=exited, which must NOT show green like a real running daemon.
  // Falls back to the service's own last-known state (from the agent's
  // detection) when the live /services-status check hasn't answered yet —
  // never defaults to green.
  const COLOR_BY_SUB_STATE = {
    running: '#10B981',
    exited: '#3B82F6',
    dead: '#EF4444',
    failed: '#F59E0B',
    unknown: '#6B7280'
  };
  const LABEL_BY_SUB_STATE = {
    running: 'En cours d\'exécution',
    exited: 'Terminé (ponctuel)',
    dead: 'Arrêté',
    failed: 'Échec',
    unknown: 'Inconnu'
  };

  const getEffectiveSubState = (detectedService) => {
    const statusInfo = statusMap[detectedService.name];
    const status = statusInfo?.status || detectedService.active_state || 'unknown';
    const subState = statusInfo?.subState || detectedService.sub_state || 'unknown';
    return (status === 'failed' || subState === 'failed') ? 'failed' : subState;
  };

  const getStatusBadge = (detectedService) => {
    const statusInfo = statusMap[detectedService.name];
    const effectiveSubState = getEffectiveSubState(detectedService);
    return {
      text: statusInfo?.subStateLabel || LABEL_BY_SUB_STATE[effectiveSubState] || 'Inconnu',
      color: COLOR_BY_SUB_STATE[effectiveSubState] || COLOR_BY_SUB_STATE.unknown
    };
  };

  const matchesQuickFilter = (detectedService) => {
    if (quickFilter === 'all') return true;
    const subState = getEffectiveSubState(detectedService);
    if (quickFilter === 'active') return subState === 'running';
    if (quickFilter === 'stopped') return subState === 'dead' || subState === 'exited';
    if (quickFilter === 'failed') return subState === 'failed';
    return true;
  };

  // Running services first — so an actually-active, admin-relevant service
  // (ssh, apache2, ...) surfaces within the first page of cards instead of
  // being pushed past it by plain alphabetical order.
  const SUB_STATE_SORT_RANK = { running: 0, exited: 1, dead: 2, unknown: 3, failed: 4 };
  const byRunningFirst = (a, b) => {
    const rankDiff = (SUB_STATE_SORT_RANK[getEffectiveSubState(a)] ?? 3) - (SUB_STATE_SORT_RANK[getEffectiveSubState(b)] ?? 3);
    return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name);
  };

  const failedServices = detectedServices.filter(s => getEffectiveSubState(s) === 'failed').filter(matchesQuickFilter);
  const applicativeServices = detectedServices
    .filter(s => !s.is_system && getEffectiveSubState(s) !== 'failed')
    .filter(matchesQuickFilter)
    .sort(byRunningFirst);
  const systemServices = detectedServices
    .filter(s => s.is_system && getEffectiveSubState(s) !== 'failed')
    .filter(matchesQuickFilter)
    .sort(byRunningFirst);

  // Fetch status when the selected server changes, then auto-refresh
  useEffect(() => {
    setStatusMap({});
    setShowSystemServices(false);
    setQuickFilter('all');
    setExpandedZones({ failed: false, applicative: false, system: false });

    if (!serverId) return;

    fetchServiceStatus();

    const interval = setInterval(() => {
      fetchServiceStatus();
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  // Clear action result after 5 seconds
  useEffect(() => {
    if (actionResult) {
      const timer = setTimeout(() => setActionResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionResult]);

  if (!server) {
    return null;
  }

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
    const statusBadge = getStatusBadge(detectedService);
    const statusInfo = statusMap[serviceName];
    // Criticality is only known once /services-status has answered for
    // this exact service — until then, show no action buttons at all
    // rather than defaulting to "allowed" or to disabled-but-visible
    // (confusing: invites a click the backend then rejects with an
    // unexplained 403).
    const statusKnown = !!statusInfo;
    const criticality = statusInfo?.criticality || 'none';
    const canStop = statusKnown && criticality === 'none';
    const canRestart = statusKnown && criticality !== 'locked';
    const canStart = statusKnown && getEffectiveSubState(detectedService) !== 'running';

    return (
      <div key={serviceName} className="service-card">
        <div className="service-header">
          <div className="service-icon-title">
            <div className="service-title-info">
              <h3>{serviceName}</h3>
              <span
                className="status-badge"
                style={{ color: statusBadge.color }}
                title={statusInfo?.raw || ''}
              >
                {statusBadge.text}
              </span>
            </div>
          </div>
        </div>
        <p className="service-description">
          {detectedService.description || 'Aucune description disponible'}
        </p>

        <div className="service-actions">
          {!statusKnown && (
            <span className="service-loading-note">Chargement...</span>
          )}
          {canStart && (
            <button
              onClick={() => handleActionClick('start', serviceName)}
              disabled={loading}
              className="action-btn start-btn"
              title="Démarrer le service"
            >
              Démarrer
            </button>
          )}
          {canRestart && (
            <button
              onClick={() => handleActionClick('restart', serviceName)}
              disabled={loading}
              className="action-btn restart-btn"
              title={criticality === 'restart_only' ? 'Redémarrer le service (confirmation requise)' : 'Redémarrer le service'}
            >
              Redémarrer
            </button>
          )}
          {canStop && (
            <button
              onClick={() => handleActionClick('stop', serviceName)}
              disabled={loading}
              className="action-btn stop-btn"
              title="Arrêter le service"
            >
              Arrêter
            </button>
          )}
          {statusKnown && !canStop && !canRestart && (
            <span className="service-protected-note">Service protégé</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="services-panel">
      <div className="panel-header">
        <h2>Gestion des Services</h2>
        <p className="panel-subtitle">
          Services détectés automatiquement sur {server.name || serverId}
        </p>
      </div>

      {/* Action Result */}
      {actionResult && (
        <div className={`action-alert ${actionResult.success ? 'success' : 'error'}`}>
          <span className="alert-message">
            {actionResult.message}
          </span>
        </div>
      )}

      {servicesDetectionFailedAt && (
        <div className="action-alert error">
          <span className="alert-message">
            Détection des services indisponible depuis le {new Date(servicesDetectionFailedAt).toLocaleString()} — la liste ci-dessous peut être obsolète.
          </span>
        </div>
      )}

      {detectedServices.length > 0 && (
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
              <p className="empty-state-small">Aucun service applicatif ne correspond à ce filtre.</p>
            ) : renderZoneGrid(applicativeServices, 'applicative')}
          </div>

          <div className="services-zone">
            <button
              className="toggle-system-btn"
              onClick={() => setShowSystemServices(!showSystemServices)}
            >
              {showSystemServices ? 'Masquer' : 'Afficher'} les services système ({systemServices.length})
            </button>
            {showSystemServices && (
              systemServices.length === 0 ? (
                <p className="empty-state-small">Aucun service système ne correspond à ce filtre.</p>
              ) : renderZoneGrid(systemServices, 'system')
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {detectedServices.length === 0 && (
        <div className="empty-state">
          <p>Aucun service détecté pour ce serveur pour le moment.</p>
        </div>
      )}

      <ConfirmActionModal
        isOpen={!!pendingConfirmation}
        title="Confirmation requise"
        message={pendingConfirmation
          ? `Redémarrer ${pendingConfirmation.serviceName} sur ${server.name || serverId} ? Cette action peut interrompre l'accès au serveur.`
          : ''}
        confirmLabel="Redémarrer"
        busy={loading}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingConfirmation(null)}
      />
    </div>
  );
};

export default ServicesPanel;
