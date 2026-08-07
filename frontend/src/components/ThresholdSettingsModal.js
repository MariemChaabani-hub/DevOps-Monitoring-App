/**
 * Threshold Settings Modal
 * Allows the admin to view and edit the WARNING/CRITICAL thresholds
 * used to trigger alerts for CPU, RAM and Disk usage.
 */

import React, { useEffect, useState } from 'react';
import './ThresholdSettingsModal.css';
import { authHeaders } from '../utils/auth';

const METRIC_LABELS = {
  cpu: 'CPU',
  ram: 'RAM',
  disk: 'Disque'
};

const METRIC_ORDER = ['cpu', 'ram', 'disk'];

const ThresholdSettingsModal = ({ isOpen, onClose }) => {
  const [thresholds, setThresholds] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const [successMetric, setSuccessMetric] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchThresholds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchThresholds = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/thresholds');
      if (!response.ok) {
        throw new Error('Échec de la récupération des seuils');
      }
      const data = await response.json();
      const byMetric = {};
      data.forEach((t) => {
        byMetric[t.metric_name] = {
          warning_level: t.warning_level,
          critical_level: t.critical_level
        };
      });
      setThresholds(byMetric);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (metric, field, rawValue) => {
    const value = rawValue === '' ? '' : Number(rawValue);
    setThresholds((prev) => ({
      ...prev,
      [metric]: { ...prev[metric], [field]: value }
    }));
    setSuccessMetric(null);
  };

  const validate = (metric) => {
    const { warning_level, critical_level } = thresholds[metric] || {};

    if (warning_level === '' || critical_level === '' || warning_level === undefined || critical_level === undefined) {
      return 'Les deux valeurs sont requises.';
    }
    if (warning_level < 0 || warning_level > 100 || critical_level < 0 || critical_level > 100) {
      return 'Les valeurs doivent être comprises entre 0 et 100.';
    }
    if (warning_level >= critical_level) {
      return 'Le seuil ALERTE doit être inférieur au seuil CRITIQUE.';
    }
    return null;
  };

  const handleSave = async (metric) => {
    const validationError = validate(metric);
    if (validationError) {
      setFieldErrors((prev) => ({ ...prev, [metric]: validationError }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, [metric]: null }));
    setSaving(metric);
    setError(null);

    try {
      const { warning_level, critical_level } = thresholds[metric];
      const response = await fetch(`/api/thresholds/${metric}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ warning_level, critical_level })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Échec de l\'enregistrement');
      }

      setSuccessMetric(metric);
      setTimeout(() => setSuccessMetric(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="threshold-settings-overlay" onClick={onClose}>
      <div className="threshold-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="threshold-settings-header">
          <div>
            <h2>Seuils d'Alerte</h2>
            <p className="threshold-settings-subtitle">
              Définissez à partir de quel pourcentage une alerte ALERTE ou CRITIQUE est déclenchée pour chaque métrique.
            </p>
          </div>
          <button className="threshold-settings-close-btn" onClick={onClose} title="Fermer">
            ×
          </button>
        </div>

        <div className="threshold-settings-content">
          {loading ? (
            <div className="threshold-settings-loading">Chargement des seuils...</div>
          ) : error && Object.keys(thresholds).length === 0 ? (
            <div className="threshold-settings-error-banner">{error}</div>
          ) : (
            <>
              {error && <div className="threshold-settings-error-banner">{error}</div>}

              {METRIC_ORDER.map((metric) => {
                const values = thresholds[metric] || {};
                const rowError = fieldErrors[metric];

                return (
                  <div key={metric} className="threshold-row">
                    <div className="threshold-row-label">{METRIC_LABELS[metric]}</div>

                    <div className="threshold-row-fields">
                      <div className="threshold-field">
                        <label htmlFor={`${metric}-warning`}>Seuil ALERTE (%)</label>
                        <input
                          id={`${metric}-warning`}
                          type="number"
                          min="0"
                          max="100"
                          value={values.warning_level ?? ''}
                          onChange={(e) => handleChange(metric, 'warning_level', e.target.value)}
                        />
                      </div>
                      <div className="threshold-field">
                        <label htmlFor={`${metric}-critical`}>Seuil CRITIQUE (%)</label>
                        <input
                          id={`${metric}-critical`}
                          type="number"
                          min="0"
                          max="100"
                          value={values.critical_level ?? ''}
                          onChange={(e) => handleChange(metric, 'critical_level', e.target.value)}
                        />
                      </div>
                      <button
                        className="threshold-save-btn"
                        onClick={() => handleSave(metric)}
                        disabled={saving === metric}
                      >
                        {saving === metric ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    </div>

                    {rowError && <p className="threshold-row-error">{rowError}</p>}
                    {successMetric === metric && (
                      <p className="threshold-row-success">Seuils {METRIC_LABELS[metric]} mis à jour avec succès.</p>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="threshold-settings-footer">
          <button className="threshold-settings-close-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThresholdSettingsModal;
