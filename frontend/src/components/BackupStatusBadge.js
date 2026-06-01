/**
 * Backup Status Badge Component
 * Displays status with color coding and icons
 */

import React from 'react';
import './BackupStatusBadge.css';

const BackupStatusBadge = ({ status, size = 'medium', showIcon = true }) => {
  const getStatusConfig = (status) => {
    switch (status?.toUpperCase()) {
      case 'OK':
      case 'SUCCESS':
        return {
          className: 'badge-ok',
          label: 'OK',
          icon: '✓',
          color: '#4caf50',
          bgColor: '#e8f5e9'
        };
      case 'FAILED':
      case 'FAILURE':
        return {
          className: 'badge-failed',
          label: 'FAILED',
          icon: '✕',
          color: '#f44336',
          bgColor: '#ffebee'
        };
      case 'LATE':
        return {
          className: 'badge-late',
          label: 'LATE',
          icon: '!',
          color: '#ff9800',
          bgColor: '#fff3e0'
        };
      default:
        return {
          className: 'badge-unknown',
          label: 'UNKNOWN',
          icon: '?',
          color: '#999',
          bgColor: '#f5f5f5'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`backup-status-badge ${config.className} size-${size}`}>
      {showIcon && <span className="badge-icon">{config.icon}</span>}
      <span className="badge-text">{config.label}</span>
    </span>
  );
};

export default BackupStatusBadge;
