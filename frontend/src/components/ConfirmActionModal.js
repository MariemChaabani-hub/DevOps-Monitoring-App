/**
 * Confirm Action Modal
 * Generic confirmation dialog for a remote action that can interrupt
 * access to a server (e.g. restarting sshd) — names the exact service and
 * server involved so a mistake isn't made when several servers are open.
 */

import React from 'react';
import './ConfirmActionModal.css';

const ConfirmActionModal = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirmer', busy = false }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-action-overlay" onClick={onCancel}>
      <div className="confirm-action-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-action-title">{title}</h3>
        <p className="confirm-action-message">{message}</p>
        <div className="confirm-action-footer">
          <button className="confirm-action-cancel-btn" onClick={onCancel} disabled={busy}>
            Annuler
          </button>
          <button className="confirm-action-confirm-btn" onClick={onConfirm} disabled={busy}>
            {busy ? 'En cours...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionModal;
