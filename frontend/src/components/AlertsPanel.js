/**
 * Alerts Panel Component
 * Displays active alerts with real-time updates
 * Severity Colors: CRITICAL → Red, WARNING → Orange
 */

import React, { useState } from 'react';

const AlertsPanel = ({ alerts = [], onAcknowledge, onResolve, loading = false }) => {
  const [expandedAlert, setExpandedAlert] = useState(null);

  // Get severity styling colors
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-900',
          border: 'border-red-700',
          borderLeft: 'border-l-4 border-l-red-600',
          text: 'text-red-100',
          badge: 'bg-red-600 text-red-200',
          icon: '',
        };
      case 'WARNING':
        return {
          bg: 'bg-orange-900',
          border: 'border-orange-700',
          borderLeft: 'border-l-4 border-l-orange-600',
          text: 'text-orange-100',
          badge: 'bg-orange-600 text-orange-200',
          icon: '',
        };
      default:
        return {
          bg: 'bg-blue-900',
          border: 'border-blue-700',
          borderLeft: 'border-l-4 border-l-blue-600',
          text: 'text-blue-100',
          badge: 'bg-blue-600 text-blue-200',
          icon: '',
        };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-yellow-600 text-yellow-100';
      case 'ACKNOWLEDGED':
        return 'bg-purple-600 text-purple-100';
      case 'RESOLVED':
        return 'bg-green-600 text-green-100';
      default:
        return 'bg-gray-600 text-gray-100';
    }
  };

  const handleAcknowledge = (alertId, e) => {
    e.stopPropagation();
    if (onAcknowledge) {
      onAcknowledge(alertId);
    }
  };

  const handleResolve = (alertId, e) => {
    e.stopPropagation();
    if (onResolve) {
      onResolve(alertId);
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Alerts</h3>
        <div className="text-center py-8 text-gray-400">
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No active alerts</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter(a => a.severity === 'WARNING').length;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">Alerts</h3>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <span className="bg-red-600 text-red-100 px-3 py-1 rounded-full text-sm font-medium">
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="bg-orange-600 text-orange-100 px-3 py-1 rounded-full text-sm font-medium">
              {warningCount} Warning
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.map((alert) => {
          const colors = getSeverityColor(alert.severity);
          const statusColor = getStatusColor(alert.status);
          const isExpanded = expandedAlert === alert._id;

          return (
            <div
              key={alert._id}
              className={`${colors.bg} ${colors.borderLeft} border ${colors.border} rounded cursor-pointer transition-all hover:shadow-lg`}
              onClick={() => setExpandedAlert(isExpanded ? null : alert._id)}
            >
              {/* Alert Header */}
              <div className={`${colors.text} p-4`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`${colors.badge} px-2 py-1 rounded text-xs font-bold`}>
                        {alert.severity}
                      </span>
                      <span className={`${statusColor} px-2 py-1 rounded text-xs font-medium`}>
                        {alert.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-base">{alert.message}</h4>
                    <p className="text-sm opacity-80 mt-1">Server: {alert.server_id}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Expand Icon */}
                  <svg
                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className={`${colors.bg} border-t ${colors.border} p-4 space-y-3`}>
                  {/* Alert Details */}
                  {alert.details && (
                    <div>
                      <p className={`${colors.text} text-sm font-semibold mb-2`}>Details:</p>
                      <p className={`${colors.text} text-sm opacity-85 whitespace-pre-wrap`}>
                        {alert.details}
                      </p>
                    </div>
                  )}

                  {/* Metric Information */}
                  {alert.metric_value !== undefined && alert.threshold !== undefined && (
                    <div className="bg-gray-900 bg-opacity-30 rounded p-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className={`${colors.text} opacity-75`}>Current Value:</p>
                          <p className={`${colors.text} font-semibold text-base`}>
                            {alert.metric_value}%
                          </p>
                        </div>
                        <div>
                          <p className={`${colors.text} opacity-75`}>Threshold:</p>
                          <p className={`${colors.text} font-semibold text-base`}>
                            {alert.threshold}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-opacity-20 border-current pt-3">
                    <div>
                      <p className={`${colors.text} opacity-75`}>Created:</p>
                      <p className={`${colors.text} opacity-60`}>
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    {alert.acknowledged_at && (
                      <div>
                        <p className={`${colors.text} opacity-75`}>Acknowledged:</p>
                        <p className={`${colors.text} opacity-60`}>
                          {new Date(alert.acknowledged_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {alert.status === 'ACTIVE' && (
                      <>
                        <button
                          onClick={(e) => handleAcknowledge(alert._id, e)}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={(e) => handleResolve(alert._id, e)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          Resolve
                        </button>
                      </>
                    )}
                    {alert.status === 'ACKNOWLEDGED' && (
                      <button
                        onClick={(e) => handleResolve(alert._id, e)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsPanel;
