/**
 * Server List Component
 * Displays all monitored servers with alert-based status indicators
 */

import React from 'react';
import './ServerList.css';

const ServerList = ({ servers, selectedServer, onSelectServer, alerts = [] }) => {
  /**
   * Calculate server status based on its active alerts
   * CRITICAL > WARNING > OK
   */
  const getServerStatus = (serverId) => {
    const serverAlerts = alerts.filter(alert => alert.serverId === serverId && alert.status === 'ACTIVE');
    
    if (serverAlerts.some(alert => alert.severity === 'CRITICAL')) {
      return 'CRITICAL';
    }
    if (serverAlerts.some(alert => alert.severity === 'WARNING')) {
      return 'WARNING';
    }
    return 'OK';
  };

  /**
   * Get alert counts for a server
   */
  const getAlertCounts = (serverId) => {
    const serverAlerts = alerts.filter(alert => alert.serverId === serverId && alert.status === 'ACTIVE');
    return {
      critical: serverAlerts.filter(a => a.severity === 'CRITICAL').length,
      warning: serverAlerts.filter(a => a.severity === 'WARNING').length,
      total: serverAlerts.length
    };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OK': return '✓';
      case 'WARNING': return '⚠';
      case 'CRITICAL': return '❌';
      case 'OFFLINE': return '⊗';
      default: return '?';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OK': return '#4CAF50';
      case 'WARNING': return '#FFC107';
      case 'CRITICAL': return '#F44336';
      case 'OFFLINE': return '#9E9E9E';
      default: return '#2196F3';
    }
  };

  return (
    <div className="server-list-container">
      <h2>Monitored Servers</h2>
      <div className="server-list">
        {servers.map((server) => {
          const alertStatus = getServerStatus(server.server_id);
          const alertCounts = getAlertCounts(server.server_id);
          
          return (
            <div 
              key={server.server_id}
              className={`server-card ${selectedServer?.server_id === server.server_id ? 'selected' : ''}`}
              onClick={() => onSelectServer(server)}
              style={{
                borderLeftColor: getStatusColor(alertStatus)
              }}
            >
              <div className="server-header">
                <span 
                  className="status-icon" 
                  style={{ color: getStatusColor(alertStatus) }}
                  title={alertStatus}
                >
                  {getStatusIcon(alertStatus)}
                </span>
                <h3>{server.name}</h3>
                
                {/* Alert Badge */}
                {alertCounts.total > 0 && (
                  <div 
                    className="alert-badge"
                    style={{
                      backgroundColor: alertStatus === 'CRITICAL' ? '#F44336' : '#FFC107'
                    }}
                    title={`${alertCounts.critical} Critical, ${alertCounts.warning} Warning`}
                  >
                    {alertCounts.total}
                  </div>
                )}
              </div>

              <div className="server-details">
                <div className="detail-item">
                  <span className="label">ID:</span>
                  <span className="value">{server.server_id}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Location:</span>
                  <span className="value">{server.location}</span>
                </div>
              </div>

              {/* Alert Summary */}
              {alertCounts.total > 0 && (
                <div className="alert-summary">
                  {alertCounts.critical > 0 && (
                    <div className="alert-item critical">
                      <span className="icon">●</span>
                      <span className="text">{alertCounts.critical} Critical</span>
                    </div>
                  )}
                  {alertCounts.warning > 0 && (
                    <div className="alert-item warning">
                      <span className="icon">●</span>
                      <span className="text">{alertCounts.warning} Warning</span>
                    </div>
                  )}
                </div>
              )}

              {server.current_metrics && (
                <div className="metrics-preview">
                  <div className="metric">
                    <span className="metric-label">CPU</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill"
                        style={{ 
                          width: `${server.current_metrics.cpu}%`,
                          backgroundColor: server.current_metrics.cpu > 90 ? '#F44336' : 
                                          server.current_metrics.cpu > 70 ? '#FFC107' : '#4CAF50'
                        }}
                      ></div>
                    </div>
                    <span className="metric-value">{server.current_metrics.cpu.toFixed(1)}%</span>
                  </div>

                <div className="metric">
                  <span className="metric-label">RAM</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill"
                      style={{ 
                        width: `${server.current_metrics.ram}%`,
                        backgroundColor: server.current_metrics.ram > 95 ? '#F44336' : 
                                        server.current_metrics.ram > 80 ? '#FFC107' : '#4CAF50'
                      }}
                    ></div>
                  </div>
                  <span className="metric-value">{server.current_metrics.ram.toFixed(1)}%</span>
                </div>

                <div className="metric">
                  <span className="metric-label">Disk</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill"
                      style={{ 
                        width: `${server.current_metrics.disk}%`,
                        backgroundColor: server.current_metrics.disk > 95 ? '#F44336' : 
                                        server.current_metrics.disk > 85 ? '#FFC107' : '#4CAF50'
                      }}
                    ></div>
                  </div>
                  <span className="metric-value">{server.current_metrics.disk.toFixed(1)}%</span>
                </div>
              </div>
            )}

            {server.last_metric_time && (
              <div className="last-update">
                Updated: {new Date(server.last_metric_time).toLocaleTimeString()}
              </div>
            )}
          </div>
        ))}

        {servers.length === 0 && (
          <div className="no-servers">
            <p>No servers connected yet</p>
            <p className="hint">Start the monitoring agents to see servers appear</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerList;
