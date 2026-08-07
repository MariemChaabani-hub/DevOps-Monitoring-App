/**
 * Alert History Modal
 * Displays the full alert history (active, acknowledged and resolved),
 * not just the currently active ones shown in AlertsPanel.
 */

import React, { useEffect, useState } from 'react';
import './AlertHistoryModal.css';

const STATUS_FILTERS = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'ACTIVE', label: 'Actives' },
  { key: 'ACKNOWLEDGED', label: 'Prises en compte' },
  { key: 'RESOLVED', label: 'Résolues' }
];

const AlertHistoryModal = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      // status= (empty) returns alerts of every status
      const response = await fetch('/api/alerts?status=&limit=200');
      if (!response.ok) {
        throw new Error('Échec de la récupération de l\'historique des alertes');
      }
      const data = await response.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const translateSeverity = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'CRITIQUE';
      case 'WARNING': return 'ALERTE';
      default: return severity;
    }
  };

  const translateStatus = (status) => {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'ACKNOWLEDGED': return 'Prise en compte';
      case 'RESOLVED': return 'Résolue';
      default: return status;
    }
  };

  const getSeverityClass = (severity) => {
    return severity === 'CRITICAL' ? 'severity-critical' : 'severity-warning';
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'ACKNOWLEDGED': return 'status-acknowledged';
      case 'RESOLVED': return 'status-resolved';
      default: return '';
    }
  };

  const counts = {
    ALL: alerts.length,
    ACTIVE: alerts.filter((a) => a.status === 'ACTIVE').length,
    ACKNOWLEDGED: alerts.filter((a) => a.status === 'ACKNOWLEDGED').length,
    RESOLVED: alerts.filter((a) => a.status === 'RESOLVED').length
  };

  const filteredAlerts = statusFilter === 'ALL'
    ? alerts
    : alerts.filter((a) => a.status === statusFilter);

  if (!isOpen) return null;

  return (
    <div className="alert-history-overlay" onClick={onClose}>
      <div className="alert-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="alert-history-header">
          <h2>Historique des Alertes</h2>
          <button className="alert-history-close-btn" onClick={onClose} title="Fermer">
            ×
          </button>
        </div>

        <div className="alert-history-filters">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              className={`alert-history-filter-btn ${statusFilter === f.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label} ({counts[f.key] || 0})
            </button>
          ))}
        </div>

        <div className="alert-history-content">
          {loading ? (
            <div className="alert-history-loading">Chargement de l'historique...</div>
          ) : error ? (
            <div className="alert-history-error">
              <span>{error}</span>
              <button onClick={fetchAlerts} className="alert-history-retry-btn">Réessayer</button>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="alert-history-empty">Aucune alerte pour ce filtre</div>
          ) : (
            <div className="alert-history-list">
              {filteredAlerts.map((alert) => (
                <div key={alert._id} className="alert-history-item">
                  <div className="alert-history-item-header">
                    <span className={`alert-history-badge ${getSeverityClass(alert.severity)}`}>
                      {translateSeverity(alert.severity)}
                    </span>
                    <span className={`alert-history-badge ${getStatusClass(alert.status)}`}>
                      {translateStatus(alert.status)}
                    </span>
                    <span className="alert-history-date">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="alert-history-message">{alert.message}</p>
                  <div className="alert-history-meta">
                    <span>Serveur : {alert.serverId}</span>
                    {alert.value !== undefined && alert.threshold !== undefined && (
                      <span>Valeur : {alert.value}% (seuil {alert.threshold}%)</span>
                    )}
                    {alert.resolvedAt && (
                      <span>Résolue le : {new Date(alert.resolvedAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="alert-history-footer">
          <span className="alert-history-count">
            {filteredAlerts.length} alerte{filteredAlerts.length > 1 ? 's' : ''} affichée{filteredAlerts.length > 1 ? 's' : ''}
          </span>
          <button className="alert-history-close-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertHistoryModal;
