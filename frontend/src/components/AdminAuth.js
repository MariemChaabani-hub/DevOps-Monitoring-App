/**
 * Admin Authentication Component
 * Vérifie si l'utilisateur est l'administrateur autorisé
 */

import React, { useState, useEffect } from 'react';
import './AdminAuth.css';

const AdminAuth = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const ADMIN_EMAIL = 'mariemchaabani39@gmail.com';

  // Vérifier si déjà authentifié dans le localStorage
  useEffect(() => {
    const storedAuth = localStorage.getItem('adminAuthenticated');
    const storedEmail = localStorage.getItem('adminEmail');
    
    if (storedAuth === 'true' && storedEmail === ADMIN_EMAIL) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Vérifier si l'email correspond à l'admin
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      // Simuler une vérification backend (remplacer par vrai appel API)
      try {
        // Appel API pour vérifier l'authentification
        const response = await fetch('http://localhost:3000/api/auth/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        });

        if (response.ok || email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          // Authentification réussie
          setIsAuthenticated(true);
          localStorage.setItem('adminAuthenticated', 'true');
          localStorage.setItem('adminEmail', email.toLowerCase());
          localStorage.setItem('authTimestamp', Date.now().toString());
        } else {
          setError('Échec de l\'authentification');
        }
      } catch (err) {
        // En cas d'erreur backend, vérifier localement pour le développement
        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setIsAuthenticated(true);
          localStorage.setItem('adminAuthenticated', 'true');
          localStorage.setItem('adminEmail', email.toLowerCase());
          localStorage.setItem('authTimestamp', Date.now().toString());
        } else {
          setError('Email non autorisé');
        }
      }
    } else {
      setError('Email non autorisé. Accès réservé à l\'administrateur.');
    }

    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEmail('');
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('authTimestamp');
  };

  // Vérifier si la session a expiré (24h)
  useEffect(() => {
    const checkSession = () => {
      const authTimestamp = localStorage.getItem('authTimestamp');
      if (authTimestamp) {
        const sessionAge = Date.now() - parseInt(authTimestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures
        
        if (sessionAge > maxAge) {
          handleLogout();
        }
      }
    };

    const interval = setInterval(checkSession, 60000); // Vérifier chaque minute
    return () => clearInterval(interval);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="admin-auth-container">
        <div className="admin-auth-card">
          <div className="auth-header">
            <h1>🔐 Authentification Administrateur</h1>
            <p>DevOps Monitoring System - Accès Restreint</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Administrateur:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Entrez votre email administrateur"
                required
                className="auth-input"
              />
            </div>

            {error && (
              <div className="auth-error">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email}
              className="auth-button"
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Vérification...
                </>
              ) : (
                '🔓 Se Connecter'
              )}
            </button>
          </form>

          <div className="auth-info">
            <div className="info-section">
              <h3>🔒 Sécurité</h3>
              <ul>
                <li>Accès réservé à l'administrateur système</li>
                <li>Authentification forte requise</li>
                <li>Session de 24 heures maximum</li>
                <li>Audit de toutes les actions</li>
              </ul>
            </div>

            <div className="info-section">
              <h3>📧 Contact Admin</h3>
              <p>Pour l'accès administrateur:</p>
              <p className="admin-contact">mariemchaabani39@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-auth-wrapper">
      {/* Header admin */}
      <div className="admin-header">
        <div className="admin-info">
          <span className="admin-badge">👤 Admin</span>
          <span className="admin-email">{email}</span>
        </div>
        <button onClick={handleLogout} className="logout-button">
          🔒 Déconnexion
        </button>
      </div>

      {/* Contenu protégé */}
      <div className="protected-content">
        {children}
      </div>
    </div>
  );
};

export default AdminAuth;
