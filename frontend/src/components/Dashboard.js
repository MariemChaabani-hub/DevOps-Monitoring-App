import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ServerCard from './ServerCard';
import MetricsChart from './MetricsChart';
import RealtimeIndicator from './RealtimeIndicator';
import RefreshButton from './RefreshButton';
import AlertsPanel from './AlertsPanel';
import BackupsPanel from './BackupsPanel';
import NotificationPopup from './NotificationPopup';
import RemoteActionsModal from './RemoteActionsModal';
import AlertHistoryModal from './AlertHistoryModal';
import ThresholdSettingsModal from './ThresholdSettingsModal';
import ServerConfigModal from './ServerConfigModal';

const Dashboard = () => {
  const [latestMetrics, setLatestMetrics] = useState([]);
  const [historyMap, setHistoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);
  const [previousAlertIds, setPreviousAlertIds] = useState(new Set());
  const [showRemoteActionsModal, setShowRemoteActionsModal] = useState(false);
  const [remoteActionsServerId, setRemoteActionsServerId] = useState(null);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [serverSearch, setServerSearch] = useState('');
  // { isOpen, serverId } — serverId: null means "add new server" mode.
  const [serverConfigModal, setServerConfigModal] = useState({ isOpen: false, serverId: null });

  const API_BASE = '';

  // GET /api/servers returns every registered server (including one with
  // no metrics yet — freshly added via ServerConfigModal, agent not
  // running against it yet) plus its last_metric (from the Metric
  // collection, null if none exists). Normalized below into the same
  // metric-shaped fields the rest of this component (and ServerCard,
  // RemoteActionsModal, BackupsPanel) already expect from the old
  // /api/metrics/latest source, so nothing downstream needs to change.
  const normalizeServerEntry = (server) => {
    const lm = server.last_metric;
    return {
      _id: server._id,
      serverId: server.server_id,
      server_id: server.server_id,
      name: server.name,
      server_name: server.name,
      location: server.location,
      status: (lm && lm.status) || server.status || 'OFFLINE',
      cpu_percent: (lm && lm.cpu_percent) ?? server.current_metrics?.cpu_percent ?? 0,
      ram_percent: (lm && lm.ram_percent) ?? server.current_metrics?.ram_percent ?? 0,
      disk_percent: (lm && lm.disk_percent) ?? server.current_metrics?.disk_percent ?? 0,
      timestamp: (lm && lm.timestamp) || server.last_metric_time || server.updated_at,
      network_in: lm && lm.network_in,
      network_io: lm && lm.network_io,
      uptime: lm && lm.uptime,
      uptime_seconds: lm && lm.uptime_seconds,
      services: server.services || [],
      services_detection_failed_at: server.services_detection_failed_at,
      is_active: server.is_active,
      // ServerCard shows "Aucune métrique disponible" when its metrics
      // array is empty — that's the signal for "never reported", not a
      // real zero-value metric.
      hasMetric: !!lm
    };
  };

  // Fetch latest server list (real-time update)
  const fetchLatestMetrics = async () => {
    setIsUpdating(true);
    try {
      const response = await axios.get(`${API_BASE}/api/servers`);
      if (response.data) {
        const normalized = response.data.map(normalizeServerEntry);
        setLatestMetrics(normalized);
        setLastUpdate(new Date());
        setError(null);
        return normalized;
      }
    } catch (err) {
      setError('Échec de la récupération des serveurs : ' + err.message);
      console.error('Error fetching servers:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Fetch historical metrics for a specific server (for chart)
  const fetchServerHistory = async (serverId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/metrics/history/${serverId}?minutes=60&limit=100`);
      if (response.data && response.data.data) {
        setHistoryMap(prev => ({
          ...prev,
          [serverId]: response.data.data
        }));
      }
    } catch (err) {
      console.error(`Error fetching history for ${serverId}:`, err);
    }
  };

  // Fetch active alerts from backend (real-time updates)
  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/alerts?status=ACTIVE&limit=50`);
      if (response.data) {
        const newAlerts = Array.isArray(response.data) ? response.data : response.data.data || [];

        // Check for NEW alerts (for notification popups)
        const currentAlertIds = new Set(newAlerts.map(a => a._id));
        newAlerts.forEach(alert => {
          if (!previousAlertIds.has(alert._id)) {
            // This is a new alert - show notification popup
            setActiveNotification(alert);
          }
        });

        setPreviousAlertIds(currentAlertIds);
        setAlerts(newAlerts);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  // Acknowledge alert and refresh list
  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await axios.put(`${API_BASE}/api/alerts/${alertId}/acknowledge`, {
        acknowledged_by: 'dashboard-user'
      });
      // Refresh alerts list
      await fetchAlerts();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  // Resolve alert and refresh list
  const handleResolveAlert = async (alertId) => {
    try {
      await axios.put(`${API_BASE}/api/alerts/${alertId}/resolve`);
      // Refresh alerts list
      await fetchAlerts();
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  // Handle remote actions for critical servers
  const handleRemoteActions = (serverId) => {
    setRemoteActionsServerId(serverId);
    setShowRemoteActionsModal(true);
  };

  // Close remote actions modal
  const closeRemoteActionsModal = () => {
    setShowRemoteActionsModal(false);
    setRemoteActionsServerId(null);
  };

  // Open the config modal — either to edit an existing server (serverId
  // set) or to add a new one (called with no argument from the "+" button).
  const handleConfigureServer = (serverId = null) => {
    setServerConfigModal({ isOpen: true, serverId });
  };

  const closeServerConfigModal = () => {
    setServerConfigModal({ isOpen: false, serverId: null });
  };

  // Initial fetch when component mounts
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const metricsData = await fetchLatestMetrics();
      setLoading(false);

      // Auto-select first server ONLY on initial mount, never again
      if (metricsData && metricsData.length > 0 && !selectedServer) {
        // Prefer first active (online) server, fall back to first server if all are offline
        const activeServer = metricsData.find(m => m.status !== 'OFFLINE');
        setSelectedServer(activeServer ? activeServer.serverId : metricsData[0].serverId);
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Fetch alerts on mount
  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Fetch history when selected server changes
  useEffect(() => {
    if (selectedServer && !historyMap[selectedServer]) {
      fetchServerHistory(selectedServer);
    }
  }, [selectedServer]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900 border border-red-700 rounded-lg p-6 text-red-100">
          <h2 className="text-xl font-bold mb-2">Erreur</h2>
          <p>{error}</p>
          <p className="text-sm mt-4">Vérifiez que l'API backend est accessible</p>
        </div>
      </div>
    );
  }

  const selectedHistory = selectedServer && historyMap[selectedServer] ? historyMap[selectedServer] : [];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <img
                src="/logo-clediss.jpg"
                alt="Clediss Solutions"
                className="h-25 w-auto rounded-lg shadow-lg border border-gray-700 object-contain hover:scale-105 transition-transform duration-300"
              />
              <div className="h-12 w-px bg-gray-700 hidden sm:block"></div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">CLEDISS Monitor</h2>
                <p className="text-gray-400 text-sm">Surveillance en temps réel des serveurs et suivi des performances</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-3">
              <RefreshButton
                onRefresh={fetchLatestMetrics}
                isLoading={isUpdating}
                disabled={loading}
              />
              <div>
                <div className="mb-2">
                  <RealtimeIndicator lastUpdate={lastUpdate} isUpdating={isUpdating} />
                </div>
                <p className="text-sm text-gray-400">Dernière mise à jour</p>
                <p className="text-lg font-semibold text-white">
                  {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Jamais'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
              <p className="text-gray-400">Chargement des serveurs...</p>
            </div>
          </div>
        ) : latestMetrics.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
            <p className="text-gray-400 mb-4">Aucun serveur trouvé</p>
            <p className="text-sm text-gray-500 mb-4">
              Démarrez un agent pour commencer la surveillance, ou ajoutez un serveur manuellement.
            </p>
            <button
              onClick={() => handleConfigureServer()}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
            >
              + Ajouter un serveur
            </button>
          </div>
        ) : (
          <>
            {/* Server Cards Grid */}
            <div className="mb-12">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <h2 className="text-2xl font-bold text-white">Vue d'ensemble des Serveurs</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={serverSearch}
                    onChange={(e) => setServerSearch(e.target.value)}
                    placeholder="Rechercher un serveur..."
                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleConfigureServer()}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap"
                    title="Ajouter un serveur"
                  >
                    + Ajouter un serveur
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestMetrics
                  .filter((metric) =>
                    (metric.server_name || metric.serverId || '')
                      .toLowerCase()
                      .includes(serverSearch.toLowerCase())
                  )
                  .map((metric) => {
                  const serverId = metric.serverId;
                  // Wrap single metric in array for ServerCard compatibility —
                  // empty when this server has never actually reported (see
                  // hasMetric in normalizeServerEntry), so ServerCard shows
                  // its "Aucune métrique disponible" state instead of a fake
                  // all-zero reading.
                  const metricsArray = metric.hasMetric ? [metric] : [];

                  return (
                    <div
                      key={serverId}
                      onClick={() => setSelectedServer(serverId)}
                      className={`cursor-pointer transition-all ${selectedServer === serverId ? 'ring-2 ring-blue-500' : ''
                        }`}
                    >
                      <ServerCard
                        server={{ serverId }}
                        metrics={metricsArray}
                        onRemoteActions={handleRemoteActions}
                        onConfigure={handleConfigureServer}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed View */}
            {selectedServer && (
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Métriques Détaillées - {selectedServer}
                </h2>
                {selectedHistory && selectedHistory.length > 0 ? (
                  <MetricsChart
                    data={selectedHistory}
                    title={`${selectedServer} - Tendances CPU & Mémoire (60 dernières minutes)`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 bg-gray-900/50 border border-dashed border-gray-700 rounded-lg">
                    <span className="text-3xl mb-3"></span>
                    <h3 className="text-lg font-semibold text-white mb-1">Aucune Métrique Historique</h3>
                    <p className="text-gray-400 text-sm max-w-md text-center">
                      Aucune métrique n'a été enregistrée pour <strong>{selectedServer}</strong> au cours des 60 dernières minutes.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Backup Monitoring Section */}
            <div className="mt-12">
              <BackupsPanel
                servers={latestMetrics}
                selectedServerId={selectedServer}
                onClearFilter={() => setSelectedServer(null)}
              />
            </div>

            {/* Summary Stats */}
            <div className="mt-12 bg-gray-800 rounded-lg p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">Résumé du Système</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Total Serveurs</p>
                  <p className="text-3xl font-bold text-white">{latestMetrics.length}</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Serveurs Sains</p>
                  <p className="text-3xl font-bold text-green-500">
                    {latestMetrics.filter(m => m.cpu_percent < 70).length}
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Serveurs en Alerte</p>
                  <p className="text-3xl font-bold text-yellow-500">
                    {latestMetrics.filter(m => m.cpu_percent >= 70 && m.cpu_percent <= 90).length}
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Serveurs Critiques</p>
                  <p className="text-3xl font-bold text-red-500">
                    {latestMetrics.filter(m => m.cpu_percent > 90).length}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Alerts Section */}
        {!loading && (
          <div className="mt-12">
            <AlertsPanel
              alerts={alerts}
              onAcknowledge={handleAcknowledgeAlert}
              onResolve={handleResolveAlert}
              loading={false}
              onShowHistory={() => setShowAlertHistory(true)}
              onShowSettings={() => setShowThresholdSettings(true)}
            />
          </div>
        )}
      </div>

      {/* Notification Popup */}
      {activeNotification && (
        <NotificationPopup
          alert={activeNotification}
          onClose={() => setActiveNotification(null)}
          duration={5000}
        />
      )}

      {/* Remote Actions Modal */}
      <RemoteActionsModal
        isOpen={showRemoteActionsModal}
        onClose={closeRemoteActionsModal}
        selectedServerId={remoteActionsServerId}
        servers={latestMetrics}
        onServerActionSuccess={fetchLatestMetrics}
      />

      {/* Alert History Modal */}
      <AlertHistoryModal
        isOpen={showAlertHistory}
        onClose={() => setShowAlertHistory(false)}
      />

      {/* Threshold Settings Modal */}
      <ThresholdSettingsModal
        isOpen={showThresholdSettings}
        onClose={() => setShowThresholdSettings(false)}
      />

      {/* Server Configuration Modal (add/edit/delete + SSH credentials) */}
      <ServerConfigModal
        isOpen={serverConfigModal.isOpen}
        serverId={serverConfigModal.serverId}
        onClose={closeServerConfigModal}
        onSaved={fetchLatestMetrics}
      />
    </div>
  );
};

export default Dashboard;
