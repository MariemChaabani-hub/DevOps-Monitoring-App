/**
 * Main Dashboard Page
 * Real-time monitoring dashboard with server status and alerts
 */

import React, { useState, useEffect } from 'react';
import ServerList from '../components/ServerList';
import AlertsPanel from '../components/AlertsPanel';
import MetricsPanel from '../components/MetricsPanel';
import ServicesPanel from '../components/ServicesPanel';
import HistoricalCharts from '../components/HistoricalCharts';
import './Dashboard.css';

const Dashboard = () => {
  const [servers, setServers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // Initialize API client and WebSocket
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch servers
        const serversRes = await fetch('/api/servers');
        const serversData = await serversRes.json();
        console.log('[Dashboard] Servers fetched:', serversData.length);
        setServers(serversData);
        
        if (serversData.length > 0) {
          setSelectedServer(serversData[0]);
        }

        // Fetch alerts - ACTIVE only
        const alertsRes = await fetch('/api/alerts?status=ACTIVE');
        const alertsData = await alertsRes.json();
        console.log('[Dashboard] ACTIVE Alerts fetched:', alertsData.length);
        console.log('[Dashboard] Alert data:', alertsData);
        setAlerts(alertsData);

        // Fetch health summary
        const healthRes = await fetch('/api/dashboard/summary');
        const healthData = await healthRes.json();
        console.log('[Dashboard] Health summary fetched:', healthData);
        setHealth(healthData);

        setLoading(false);
      } catch (error) {
        console.error('[Dashboard] Error fetching initial data:', error);
        setLoading(false);
      }
    };

    fetchInitialData();

    // Connect to WebSocket for real-time updates
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}`);
    
    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'update') {
          // Update servers with new metrics
          setServers(prev => prev.map(server => 
            server.server_id === message.data.server_id
              ? { ...server, current_metrics: message.data.metrics, status: message.data.status }
              : server
          ));
        }
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'OK': return '#4CAF50';
      case 'WARNING': return '#FFC107';
      case 'CRITICAL': return '#F44336';
      case 'OFFLINE': return '#9E9E9E';
      default: return '#2196F3';
    }
  };

  if (loading) {
    return <div className="dashboard loading">Chargement du tableau de bord...</div>;
  }

  return (
    <div className="dashboard">
      <div className="header">
        <h1>Tableau de Bord de Supervision DevOps</h1>
        <div className="status-indicator">
          <span className={`ws-status ${wsConnected ? 'connected' : 'disconnected'}`}>
            {wsConnected ? 'En direct' : 'Interrogation'}
          </span>
        </div>
      </div>

      {health && (
        <div className="health-summary">
          <div className="summary-card">
            <h3>Santé du Système</h3>
            <div className="health-percentage">{health.health.health_percentage}%</div>
            <div className="health-breakdown">
              <div className="health-item ok">
                <span className="dot" style={{ backgroundColor: '#4CAF50' }}></span>
                OK : {health.health.ok_count}
              </div>
              <div className="health-item warning">
                <span className="dot" style={{ backgroundColor: '#FFC107' }}></span>
                Alerte : {health.health.warning_count}
              </div>
              <div className="health-item critical">
                <span className="dot" style={{ backgroundColor: '#F44336' }}></span>
                Critique : {health.health.critical_count}
              </div>
              <div className="health-item offline">
                <span className="dot" style={{ backgroundColor: '#9E9E9E' }}></span>
                Hors ligne : {health.health.offline_count}
              </div>
            </div>
          </div>

          <div className="summary-card">
            <h3>Alertes Actives</h3>
            <div className="alert-count">{health.alerts.total}</div>
            <div className="alert-breakdown">
              {health.alerts.by_severity && (
                <>
                  <div>Critique : {health.alerts.by_severity.CRITICAL || 0}</div>
                  <div>Alerte : {health.alerts.by_severity.WARNING || 0}</div>
                </>
              )}
            </div>
          </div>

          <div className="summary-card">
            <h3>Métriques (24h)</h3>
            <div className="metric-count">{health.metrics_24h}</div>
            <div className="metric-label">points de données collectés</div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="column">
          <ServerList 
            servers={servers}
            selectedServer={selectedServer}
            onSelectServer={setSelectedServer}
            alerts={alerts}
          />
        </div>

        <div className="column">
          {selectedServer && (
            <MetricsPanel 
              server={selectedServer}
            />
          )}
        </div>

        <div className="full-width">
          <AlertsPanel
            alerts={alerts}
            servers={servers}
          />
        </div>

        <div className="full-width">
          {selectedServer && (
            <ServicesPanel
              server={selectedServer}
            />
          )}
        </div>

        <div className="full-width">
          {selectedServer && (
            <HistoricalCharts
              serverId={selectedServer.server_id || selectedServer._id}
            />
          )}
          {!selectedServer && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-400 text-center py-8">Sélectionnez un serveur pour voir les métriques historiques</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
