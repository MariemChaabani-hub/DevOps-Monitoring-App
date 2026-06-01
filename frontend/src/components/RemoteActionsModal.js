/**
 * Remote Actions Modal Component
 * Modal pour les actions à distance accessible depuis le Dashboard
 */

import React from 'react';
import RemoteActionsPanel from './RemoteActionsPanel';
import './RemoteActionsModal.css';

const RemoteActionsModal = ({ isOpen, onClose, selectedServerId, servers = [] }) => {
  if (!isOpen) return null;

  // Filtrer les serveurs pour trouver celui sélectionné
  const selectedServer = servers.find(s => 
    s.serverId === selectedServerId || s.server_id === selectedServerId
  );

  return (
    <div className="remote-actions-modal-overlay">
      <div className="remote-actions-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <h2>🔧 Actions à Distance</h2>
            {selectedServer && (
              <p className="server-info">
                Serveur: <span className="server-name">{selectedServer.name || selectedServer.serverId}</span>
              </p>
            )}
          </div>
          <div className="modal-actions">
            <button 
              onClick={onClose}
              className="close-btn"
              title="Fermer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          <RemoteActionsPanel 
            servers={servers} 
            preselectedServerId={selectedServerId}
          />
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-info">
            <p className="security-notice">
              🔐 <strong>Accès administrateur uniquement</strong> - Toutes les actions sont journalisées
            </p>
            <p className="admin-email">
              📧 Admin: mariemchaabani39@gmail.com
            </p>
          </div>
          <div className="footer-actions">
            <button 
              onClick={onClose}
              className="btn-secondary"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoteActionsModal;
