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
          label: 'Backup OK',
          message: 'Latest backup successful',
          color: '#4caf50'
        };
      case 'FAILED':
      case 'FAILURE':
        return {
          className: 'indicator-failed',
          label: 'Backup Failed',
          message: 'Latest backup failed',
          color: '#f44336'
        };
      case 'LATE':
        return {
          className: 'indicator-late',
          label: 'Backup Late',
          message: 'Backup is missing or late',
          color: '#ff9800'
        };
      default:
        return {
          className: 'indicator-unknown',
          label: 'Unknown Status',
          message: 'No backup data',
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
