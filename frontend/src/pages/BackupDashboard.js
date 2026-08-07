/**
 * Backup Dashboard Page
 * Displays backup monitoring for all servers
 */

import React, { useEffect, useState } from 'react';
import BackupMonitoring from '../components/BackupMonitoring';
import './BackupDashboard.css';

const BackupDashboard = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedServerId, setSelectedServerId] = useState(null);

  const API_BASE = 'http://localhost:5000';

  /**
   * Fetch all servers
   */
  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/servers`);
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers || []);

        // Set first server as selected
        if (data.servers && data.servers.length > 0) {
          setSelectedServerId(data.servers[0]._id || data.servers[0].server_id);
        }
      }
    } catch (err) {
      console.error('Error fetching servers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  if (loading) {
    return (
      <div className="backup-dashboard">
        <div className="loading">Chargement des serveurs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="backup-dashboard">
        <div className="error">Erreur : {error}</div>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="backup-dashboard">
        <div className="no-servers">Aucun serveur trouvé. Veuillez d'abord ajouter des serveurs.</div>
      </div>
    );
  }

  return (
    <div className="backup-dashboard">
      {/* Server Selector */}
      <div className="server-selector-container">
        <label htmlFor="server-select">Sélectionner un Serveur :</label>
        <select
          id="server-select"
          value={selectedServerId || ''}
          onChange={(e) => setSelectedServerId(e.target.value)}
          className="server-select"
        >
          {servers.map((server) => (
            <option key={server._id} value={server._id || server.server_id}>
              {server.name || server.server_id} ({server.location || 'Inconnu'})
            </option>
          ))}
        </select>
      </div>

      {/* Backup Monitoring Component */}
      {selectedServerId && <BackupMonitoring serverId={selectedServerId} />}
    </div>
  );
};

export default BackupDashboard;
