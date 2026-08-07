/**
 * Metrics Panel Component
 * Displays detailed metrics for selected server
 */

import React, { useState, useEffect } from 'react';
import './MetricsPanel.css';

const MetricsPanel = ({ server }) => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!server) return;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/servers/${server.server_id}/metrics?limit=100&minutes=60`
        );
        const data = await response.json();
        setMetrics(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching metrics:', error);
        setLoading(false);
      }
    };

    fetchMetrics();

    return () => {};
  }, [server]);

  if (!server) {
    return <div className="metrics-panel empty">Sélectionnez un serveur pour voir ses métriques</div>;
  }

  const currentMetric = metrics[0];
  const avgCpu = metrics.length > 0
    ? (metrics.reduce((sum, m) => sum + m.cpu_percent, 0) / metrics.length).toFixed(1)
    : 'Indisponible';
  const avgRam = metrics.length > 0
    ? (metrics.reduce((sum, m) => sum + m.ram_percent, 0) / metrics.length).toFixed(1)
    : 'Indisponible';
  const avgDisk = metrics.length > 0
    ? (metrics.reduce((sum, m) => sum + m.disk_percent, 0) / metrics.length).toFixed(1)
    : 'Indisponible';

  const maxCpu = metrics.length > 0
    ? Math.max(...metrics.map(m => m.cpu_percent)).toFixed(1)
    : 'Indisponible';
  const maxRam = metrics.length > 0
    ? Math.max(...metrics.map(m => m.ram_percent)).toFixed(1)
    : 'Indisponible';
  const maxDisk = metrics.length > 0
    ? Math.max(...metrics.map(m => m.disk_percent)).toFixed(1)
    : 'Indisponible';

  const getMetricStatus = (value, metric) => {
    if (metric === 'cpu') {
      if (value > 90) return { status: 'CRITIQUE', color: '#F44336' };
      if (value > 70) return { status: 'ALERTE', color: '#FFC107' };
      return { status: 'OK', color: '#4CAF50' };
    }
    if (metric === 'ram') {
      if (value > 95) return { status: 'CRITIQUE', color: '#F44336' };
      if (value > 80) return { status: 'ALERTE', color: '#FFC107' };
      return { status: 'OK', color: '#4CAF50' };
    }
    if (metric === 'disk') {
      if (value > 95) return { status: 'CRITIQUE', color: '#F44336' };
      if (value > 85) return { status: 'ALERTE', color: '#FFC107' };
      return { status: 'OK', color: '#4CAF50' };
    }
    return { status: 'OK', color: '#2196F3' };
  };

  return (
    <div className="metrics-panel">
      <div className="panel-header">
        <h2>Métriques : {server.name}</h2>
        <div className="metric-count">{metrics.length} points de données</div>
      </div>

      {currentMetric ? (
        <>
          <div className="current-metrics">
            <h3>Relevé Actuel</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-title">Utilisation CPU</div>
                <div className="metric-large">
                  {currentMetric.cpu_percent.toFixed(1)}%
                </div>
                <div
                  className="metric-status"
                  style={{ color: getMetricStatus(currentMetric.cpu_percent, 'cpu').color }}
                >
                  {getMetricStatus(currentMetric.cpu_percent, 'cpu').status}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-title">Utilisation Mémoire</div>
                <div className="metric-large">
                  {currentMetric.ram_percent.toFixed(1)}%
                </div>
                <div
                  className="metric-status"
                  style={{ color: getMetricStatus(currentMetric.ram_percent, 'ram').color }}
                >
                  {getMetricStatus(currentMetric.ram_percent, 'ram').status}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-title">Utilisation Disque</div>
                <div className="metric-large">
                  {currentMetric.disk_percent.toFixed(1)}%
                </div>
                <div
                  className="metric-status"
                  style={{ color: getMetricStatus(currentMetric.disk_percent, 'disk').color }}
                >
                  {getMetricStatus(currentMetric.disk_percent, 'disk').status}
                </div>
              </div>
            </div>
            {currentMetric.timestamp && (
              <div className="timestamp">
                Enregistré : {new Date(currentMetric.timestamp).toLocaleString()}
              </div>
            )}
          </div>

          <div className="statistics">
            <h3>Statistiques de la Dernière Heure</h3>
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-label">CPU - Moyenne</span>
                <span className="stat-value">{avgCpu}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">CPU - Maximum</span>
                <span className="stat-value">{maxCpu}%</span>
              </div>

              <div className="stat">
                <span className="stat-label">RAM - Moyenne</span>
                <span className="stat-value">{avgRam}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">RAM - Maximum</span>
                <span className="stat-value">{maxRam}%</span>
              </div>

              <div className="stat">
                <span className="stat-label">Disque - Moyenne</span>
                <span className="stat-value">{avgDisk}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Disque - Maximum</span>
                <span className="stat-value">{maxDisk}%</span>
              </div>
            </div>
          </div>

          {(currentMetric.uptime_days !== undefined || currentMetric.uptime_seconds !== undefined || currentMetric.boot_time) && (
            <div className="uptime-info">
              <h3>Disponibilité du Système</h3>
              <div className="uptime-details">
                {(currentMetric.uptime_days !== undefined || currentMetric.uptime_seconds !== undefined) && (
                  <div className="uptime-item">
                    <span>Disponibilité (Jours) :</span>
                    <strong>{(() => {
                      const days = currentMetric.uptime_days ?? 0;
                      return !isNaN(days) ? days : 0;
                    })()}</strong>
                  </div>
                )}
                {currentMetric.boot_time && (
                  <div className="uptime-item">
                    <span>Heure de Démarrage :</span>
                    <strong>{new Date(currentMetric.boot_time).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : loading ? (
        <div className="loading">Chargement des métriques...</div>
      ) : (
        <div className="no-data">Aucune métrique disponible pour le moment</div>
      )}
    </div>
  );
};

export default MetricsPanel;
