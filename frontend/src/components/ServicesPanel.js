/**
 * Services Management Component
 * Gestion complète des 4 services: PM2, Nginx, MongoDB, Docker
 * Redémarrer, arrêter, et consulter le statut
 */

import React, { useState, useEffect } from 'react';
import './ServicesPanel.css';
import { authHeaders } from '../utils/auth';

const ServicesPanel = ({ servers = [] }) => {
  const [selectedServer, setSelectedServer] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const API_BASE = '';
  const adminEmail = localStorage.getItem('adminEmail') || '';

  // Service definitions
  const serviceDefinitions = {
    pm2: { name: 'PM2', icon: '', color: '#6F00D2' },
    nginx: { name: 'Nginx', icon: '', color: '#009639' },
    mongodb: { name: 'MongoDB', icon: '', color: '#13AA52' },
    apache: { name: 'Apache', icon: '', color: '#E43D30' },
    apache2: { name: 'Apache', icon: '', color: '#E43D30' }
  };

  // Fetch services for selected server
  const fetchServices = async (serverId = selectedServer) => {
    if (!serverId) return;

    try {
      const response = await fetch(`${API_BASE}/api/services/${serverId}`, {
        headers: { 'x-admin-email': adminEmail, ...authHeaders() }
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      } else {
        console.error('Failed to fetch services');
        setActionResult({
          success: false,
          message: 'Erreur lors de la récupération des services'
        });
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setActionResult({
        success: false,
        message: error.message
      });
    }
  };

  // Execute service action (restart or stop)
  const executeServiceAction = async (action, serverId, serviceName) => {
    setLoading(true);
    setActionResult(null);

    try {
      const endpoint = action === 'restart' 
        ? 'restart-service' 
        : 'stop-service';

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
        // Log the restart if action was restart
        if (action === 'restart') {
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
          message: `Service ${serviceDefinitions[serviceName].name} ${action === 'restart' ? 'redémarré' : 'arrêté'} avec succès`
        });

        // Refresh services list
        setTimeout(() => fetchServices(serverId), 1000);
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

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'running': { text: 'Actif', color: '#10B981' },
      'stopped': { text: 'Arrêté', color: '#EF4444' },
      'error': { text: 'Erreur', color: '#F59E0B' },
      'unknown': { text: 'Inconnu', color: '#6B7280' }
    };
    return statusConfig[status] || statusConfig.unknown;
  };

  // Auto-refresh services
  useEffect(() => {
    if (selectedServer) {
      fetchServices(selectedServer);
      
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchServices(selectedServer);
      }, 30000);
      
      setRefreshInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [selectedServer]);

  // Clear action result after 5 seconds
  useEffect(() => {
    if (actionResult) {
      const timer = setTimeout(() => setActionResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionResult]);

  return (
    <div className="services-panel">
      <div className="panel-header">
        <h2>Gestion des Services</h2>
        <p className="panel-subtitle">
          PM2 • Nginx • MongoDB • Apache
        </p>
      </div>

      {/* Server Selection */}
      <div className="server-selection-group">
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

      {/* Action Result */}
      {actionResult && (
        <div className={`action-alert ${actionResult.success ? 'success' : 'error'}`}>
          <span className="alert-icon">
            {actionResult.success ? '' : ''}
          </span>
          <span className="alert-message">
            {actionResult.message}
          </span>
        </div>
      )}

      {/* Services Grid */}
      {selectedServer && services.length > 0 && (
        <div className="services-grid">
          {services.map((service) => {
            const def = serviceDefinitions[service.service_name];
            const statusBadge = getStatusBadge(service.status);

            return (
              <div key={service._id} className="service-card">
                <div className="service-header">
                  <div className="service-icon-title">
                    <span className="service-icon" style={{ fontSize: '28px' }}>
                      {def?.icon}
                    </span>
                    <div className="service-title-info">
                      <h3>{def?.name}</h3>
                      <span 
                        className="status-badge"
                        style={{ color: statusBadge.color }}
                      >
                        {statusBadge.text}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="service-details">
                  <div className="detail-row">
                    <span className="detail-label">État:</span>
                    <span className="detail-value">{service.status}</span>
                  </div>
                  {service.uptime && (
                    <div className="detail-row">
                      <span className="detail-label">Uptime:</span>
                      <span className="detail-value">{service.uptime}</span>
                    </div>
                  )}
                  {service.restart_count > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Redémarrages:</span>
                      <span className="detail-value">{service.restart_count}</span>
                    </div>
                  )}
                  {service.memory_usage > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Mémoire:</span>
                      <span className="detail-value">{service.memory_usage.toFixed(2)} MB</span>
                    </div>
                  )}
                  {service.cpu_usage > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">CPU:</span>
                      <span className="detail-value">{service.cpu_usage.toFixed(2)}%</span>
                    </div>
                  )}
                </div>

                <div className="service-actions">
                  <button
                    onClick={() => executeServiceAction('restart', selectedServer, service.service_name)}
                    disabled={loading}
                    className="action-btn restart-btn"
                    title="Redémarrer le service"
                  >
                    Redémarrer
                  </button>
                  <button
                    onClick={() => executeServiceAction('stop', selectedServer, service.service_name)}
                    disabled={loading}
                    className="action-btn stop-btn"
                    title="Arrêter le service"
                  >
                    Arrêter
                  </button>
                </div>

                <div className="service-footer">
                  {service.last_health_check && (
                    <span className="last-check">
                      Dernière vérification: {new Date(service.last_health_check).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {selectedServer && services.length === 0 && (
        <div className="empty-state">
          <p>Chargement des services...</p>
        </div>
      )}

      {!selectedServer && (
        <div className="empty-state">
          <p>Sélectionnez un serveur pour voir ses services</p>
        </div>
      )}
    </div>
  );
};

export default ServicesPanel;
