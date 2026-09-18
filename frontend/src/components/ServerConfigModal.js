/**
 * Server Configuration Modal
 * Lets an admin add a new monitored server, or edit/delete an existing
 * one — including its SSH credentials, which previously had to be typed
 * directly into MongoDB Atlas.
 */

import React, { useEffect, useState } from 'react';
import './ServerConfigModal.css';
import { authHeaders } from '../utils/auth';
import ConfirmActionModal from './ConfirmActionModal';

const EMPTY_FORM = {
  name: '',
  server_id: '',
  ip_address: '',
  ssh_username: '',
  ssh_password: '',
  location: '',
  ssh_port: 22
};

// Turns "VPS Debian OVH" into "vps-debian-ovh" — a reasonable default
// server_id the admin can still override by hand.
const slugify = (value) =>
  value
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const ServerConfigModal = ({ isOpen, onClose, serverId, onSaved }) => {
  const isEditMode = !!serverId;

  const [form, setForm] = useState(EMPTY_FORM);
  const [serverIdTouched, setServerIdTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testingSsh, setTestingSsh] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success, message }
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccess(null);
    setTestResult(null);
    setShowPassword(false);

    if (isEditMode) {
      setServerIdTouched(true);
      fetchServer();
    } else {
      setForm(EMPTY_FORM);
      setServerIdTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, serverId]);

  const fetchServer = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/servers/${serverId}`, { headers: { ...authHeaders() } });
      if (!response.ok) throw new Error('Impossible de charger la configuration du serveur');
      const data = await response.json();
      setForm({
        name: data.name || '',
        server_id: data.server_id || '',
        ip_address: data.ip_address || '',
        ssh_username: data.ssh_username || '',
        ssh_password: '', // never sent back by the backend — left blank means "unchanged"
        location: data.location || '',
        ssh_port: data.ssh_port || 22
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
    setSuccess(null);
  };

  const handleNameChange = (value) => {
    handleFieldChange('name', value);
    if (!isEditMode && !serverIdTouched) {
      setForm((prev) => ({ ...prev, name: value, server_id: slugify(value) }));
    }
  };

  const handleServerIdChange = (value) => {
    setServerIdTouched(true);
    handleFieldChange('server_id', value);
  };

  const validate = () => {
    if (!form.name.trim()) return 'Le nom du serveur est requis.';
    if (!form.server_id.trim()) return 'L\'identifiant du serveur est requis.';
    if (!form.ip_address.trim()) return 'L\'adresse IP est requise.';
    if (!form.ssh_username.trim()) return 'L\'utilisateur SSH est requis.';
    if (!isEditMode && !form.ssh_password.trim()) return 'Le mot de passe SSH est requis.';
    return null;
  };

  const handleTestSsh = async () => {
    if (!form.ip_address.trim() || !form.ssh_username.trim()) {
      setTestResult({ success: false, message: 'Adresse IP et utilisateur SSH sont requis pour tester la connexion.' });
      return;
    }
    setTestingSsh(true);
    setTestResult(null);
    try {
      // In edit mode, an empty password field means "use the one already
      // saved" — the backend falls back to it itself when this key is
      // omitted from the body.
      const body = {
        ip_address: form.ip_address,
        ssh_username: form.ssh_username,
        ssh_port: form.ssh_port || 22
      };
      if (form.ssh_password) body.ssh_password = form.ssh_password;

      const idForTest = isEditMode ? serverId : 'new';
      const response = await fetch(`/api/servers/${idForTest}/test-ssh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      setTestResult({ success: response.ok && data.success, message: data.message || data.error });
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestingSsh(false);
    }
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        location: form.location.trim() || undefined,
        ip_address: form.ip_address.trim(),
        ssh_username: form.ssh_username.trim(),
        ssh_port: form.ssh_port || 22
      };
      if (form.ssh_password) payload.ssh_password = form.ssh_password;

      let response;
      if (isEditMode) {
        response = await fetch(`/api/servers/${serverId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('/api/servers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ ...payload, server_id: form.server_id.trim() })
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Échec de l\'enregistrement');
      }

      setSuccess('Configuration enregistrée ✅');
      if (onSaved) onSaved();
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Échec de la suppression');
      }
      setConfirmDeleteOpen(false);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="server-config-overlay" onClick={onClose}>
      <div className="server-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="server-config-header">
          <div>
            <h2>{isEditMode ? 'Modifier le serveur' : 'Ajouter un serveur'}</h2>
            <p className="server-config-subtitle">
              {isEditMode
                ? 'Modifiez les informations et les identifiants SSH de ce serveur.'
                : 'Renseignez les informations et les identifiants SSH du nouveau serveur à surveiller.'}
            </p>
          </div>
          <button className="server-config-close-btn" onClick={onClose} title="Fermer">×</button>
        </div>

        <div className="server-config-content">
          {loading ? (
            <div className="server-config-loading">Chargement...</div>
          ) : (
            <>
              {error && <div className="server-config-error-banner">{error}</div>}
              {success && <div className="server-config-success-banner">{success}</div>}

              <div className="server-config-field">
                <label htmlFor="server-name">Nom du serveur *</label>
                <input
                  id="server-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: VPS Debian OVH"
                />
              </div>

              <div className="server-config-field">
                <label htmlFor="server-id">Identifiant du serveur *</label>
                <input
                  id="server-id"
                  type="text"
                  value={form.server_id}
                  onChange={(e) => handleServerIdChange(e.target.value)}
                  placeholder="Ex: vps-debian-ovh"
                  disabled={isEditMode}
                />
                {!isEditMode && (
                  <p className="server-config-hint">Généré automatiquement à partir du nom, modifiable.</p>
                )}
              </div>

              <div className="server-config-row">
                <div className="server-config-field">
                  <label htmlFor="server-ip">Adresse IP *</label>
                  <input
                    id="server-ip"
                    type="text"
                    value={form.ip_address}
                    onChange={(e) => handleFieldChange('ip_address', e.target.value)}
                    placeholder="Ex: 141.227.129.194"
                  />
                </div>
                <div className="server-config-field server-config-field-small">
                  <label htmlFor="server-port">Port SSH</label>
                  <input
                    id="server-port"
                    type="number"
                    value={form.ssh_port}
                    onChange={(e) => handleFieldChange('ssh_port', Number(e.target.value) || 22)}
                    placeholder="22"
                  />
                </div>
              </div>

              <div className="server-config-field">
                <label htmlFor="server-location">Localisation</label>
                <input
                  id="server-location"
                  type="text"
                  value={form.location}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  placeholder="Ex: OVH Cloud, Tunis"
                />
              </div>

              <div className="server-config-divider">Identifiants SSH</div>

              <div className="server-config-field">
                <label htmlFor="server-ssh-user">Utilisateur SSH *</label>
                <input
                  id="server-ssh-user"
                  type="text"
                  value={form.ssh_username}
                  onChange={(e) => handleFieldChange('ssh_username', e.target.value)}
                  placeholder="Ex: root, debian"
                />
              </div>

              <div className="server-config-field">
                <label htmlFor="server-ssh-password">
                  Mot de passe SSH {isEditMode ? '(laisser vide pour ne pas changer)' : '*'}
                </label>
                <div className="server-config-password-wrapper">
                  <input
                    id="server-ssh-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.ssh_password}
                    onChange={(e) => handleFieldChange('ssh_password', e.target.value)}
                    placeholder={isEditMode ? '••••••••' : 'Mot de passe SSH'}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="server-config-toggle-password-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </div>

              <div className="server-config-test-row">
                <button
                  type="button"
                  className="server-config-test-btn"
                  onClick={handleTestSsh}
                  disabled={testingSsh}
                >
                  {testingSsh ? 'Test en cours...' : 'Tester la connexion SSH'}
                </button>
                {testResult && (
                  <span className={`server-config-test-result ${testResult.success ? 'success' : 'error'}`}>
                    {testResult.message}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="server-config-footer">
          {isEditMode && (
            <button
              className="server-config-delete-btn"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={saving || deleting}
            >
              Supprimer
            </button>
          )}
          <div className="server-config-footer-right">
            <button className="server-config-cancel-btn" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button className="server-config-save-btn" onClick={handleSave} disabled={loading || saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={confirmDeleteOpen}
        title="Supprimer le serveur"
        message={`Voulez-vous vraiment supprimer "${form.name || serverId}" ? Cette action supprime aussi son historique de métriques et d'alertes, et est irréversible.`}
        confirmLabel="Supprimer"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};

export default ServerConfigModal;
