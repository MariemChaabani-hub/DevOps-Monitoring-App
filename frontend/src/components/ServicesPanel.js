/**
 * Services Management Component
 * Affiche les services réellement détectés et actifs sur le serveur
 * sélectionné (remontés automatiquement par l'agent via systemctl),
 * avec les actions Redémarrer / Arrêter.
 */

import React, { useState, useEffect } from 'react';
import './ServicesPanel.css';
import { authHeaders } from '../utils/auth';

const ServicesPanel = ({ server }) => {
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  const API_BASE = '';
  const adminEmail = localStorage.getItem('adminEmail') || '';

  // Legacy services keep a restart-history log in the old Service
  // collection; dynamically detected services have no such record.
  const legacyServiceNames = ['pm2', 'nginx', 'mongodb', 'apache', 'apache2'];

  const serverId = server?.server_id || server?.serverId;
  // server.services is normalized backend-side to {name, active_state,
  // sub_state, description} objects — fall back defensively for a
  // document not yet refreshed by an updated agent (plain string).
  const detectedServices = (server?.services || []).map(s =>
    typeof s === 'string'
      ? { name: s, active_state: 'unknown', sub_state: 'unknown', description: '' }
      : s
  );
  const servicesDetectionFailedAt = server?.services_detection_failed_at;

  // Fetch real status (running/stopped) for the server's detected services
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

  // Execute service action (restart or stop)
  const executeServiceAction = async (action, serviceName) => {
    setLoading(true);
    setActionResult(null);

    try {
      const endpoint = action === 'restart' ? 'restart-service' : 'stop-service';

      const response = await fetch(
        `${API_BASE}/api/remote-actions/${serverId}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-email': adminEmail,
            ...authHeaders()
          },
          body: JSON.stringify({ service_name: serviceName })
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Only the legacy services have a restart-history log to update
        if (action === 'restart' && legacyServiceNames.includes(serviceName)) {
          await fetch(
            `${API_BASE}/api/services/${serverId}/${serviceName}/restart-log`,
            {
              method: 'POST',
              headers: { 'x-admin-email': adminEmail, ...authHeaders() }
            }
          );
        }

        setActionResult({
          success: true,
          message: `Service ${serviceName} ${action === 'restart' ? 'redémarré' : 'arrêté'} avec succès`
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

  // Get status badge — colored by SubState (running/exited/dead/failed),
  // not just ActiveState: a one-shot unit reports ActiveState=active with
  // SubState=exited, which must NOT show green like a real running daemon.
  // Falls back to the service's own last-known state (from the agent's
  // detection) when the live /services-status check hasn't answered yet —
  // never defaults to green.
  const getStatusBadge = (statusInfo, detectedService) => {
    const colorBySubState = {
      running: '#10B981',
      exited: '#3B82F6',
      dead: '#EF4444',
      failed: '#F59E0B',
      unknown: '#6B7280'
    };
    const labelBySubState = {
      running: 'En cours d\'exécution',
      exited: 'Terminé (ponctuel)',
      dead: 'Arrêté',
      failed: 'Échec',
      unknown: 'Inconnu'
    };
    const subState = statusInfo?.subState || detectedService?.sub_state || 'unknown';
    const isFailed = statusInfo?.status === 'failed' || subState === 'failed';
    const effectiveSubState = isFailed ? 'failed' : subState;
    return {
      text: statusInfo?.subStateLabel || labelBySubState[effectiveSubState] || 'Inconnu',
      color: colorBySubState[effectiveSubState] || colorBySubState.unknown
    };
  };

  // Fetch status when the selected server changes, then auto-refresh
  useEffect(() => {
    setStatusMap({});

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

      {/* Services Grid */}
      {servicesDetectionFailedAt && (
        <div className="action-alert error">
          <span className="alert-message">
            Détection des services indisponible depuis le {new Date(servicesDetectionFailedAt).toLocaleString()} — la liste ci-dessous peut être obsolète.
          </span>
        </div>
      )}
      {detectedServices.length > 0 && (
        <div className="services-grid">
          {detectedServices.map((detectedService) => {
            const serviceName = detectedService.name;
            const statusInfo = statusMap[serviceName];
            const statusBadge = getStatusBadge(statusInfo, detectedService);

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

                <div className="service-actions">
                  <button
                    onClick={() => executeServiceAction('restart', serviceName)}
                    disabled={loading}
                    className="action-btn restart-btn"
                    title="Redémarrer le service"
                  >
                    Redémarrer
                  </button>
                  <button
                    onClick={() => executeServiceAction('stop', serviceName)}
                    disabled={loading}
                    className="action-btn stop-btn"
                    title="Arrêter le service"
                  >
                    Arrêter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {detectedServices.length === 0 && (
        <div className="empty-state">
          <p>Aucun service détecté pour ce serveur pour le moment.</p>
        </div>
      )}
    </div>
  );
};

export default ServicesPanel;
