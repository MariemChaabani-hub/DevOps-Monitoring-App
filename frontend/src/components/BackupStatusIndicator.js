/**
 * Backup Status Indicator Component
 * Large, prominent status display
 */

import React from 'react';
import './BackupStatusIndicator.css';

const BackupStatusIndicator = ({ status, animated = true }) => {
  const getStatusConfig = (status) => {
    switch (status?.toUpperCase()) {
      case 'OK':
      case 'SUCCESS':
        return {
          className: 'indicator-ok',
          label: 'Sauvegarde OK',
          message: 'Dernière sauvegarde réussie',
          color: '#4caf50'
        };
      case 'FAILED':
      case 'FAILURE':
        return {
          className: 'indicator-failed',
          label: 'Sauvegarde Échouée',
          message: 'La dernière sauvegarde a échoué',
          color: '#f44336'
        };
      case 'LATE':
        return {
          className: 'indicator-late',
          label: 'Sauvegarde en Retard',
          message: 'Sauvegarde manquante ou en retard',
          color: '#ff9800'
        };
      default:
        return {
          className: 'indicator-unknown',
          label: 'Statut Inconnu',
          message: 'Aucune donnée de sauvegarde',
          color: '#999'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`backup-status-indicator ${config.className} ${animated ? 'animated' : ''}`}>
      <div className="indicator-text">
        <div className="indicator-label">{config.label}</div>
        <div className="indicator-message">{config.message}</div>
      </div>
    </div>
  );
};

export default BackupStatusIndicator;
