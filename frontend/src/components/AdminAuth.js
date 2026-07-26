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

  // Vérifier si déjà authentifié dans le localStorage
  useEffect(() => {
    const storedAuth = localStorage.getItem('adminAuthenticated');
    const storedEmail = localStorage.getItem('adminEmail');
    
    if (storedAuth === 'true' && storedEmail) {
      setIsAuthenticated(true);
      setEmail(storedEmail);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Appel API pour vérifier l'authentification
      const response = await fetch('http://141.227.129.194:30300/api/auth/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Authentification réussie
        setIsAuthenticated(true);
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminEmail', data.email.toLowerCase());
        localStorage.setItem('authTimestamp', Date.now().toString());
      } else {
        setError(data.message || 'Échec de l\'authentification');
      }
    } catch (err) {
      console.error('[Frontend Auth] Error connecting to authentication API:', err);
      setError('Impossible de se connecter au serveur d\'authentification ou la base de données est hors ligne.');
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
          <div className="auth-logo-container">
            <img 
              src="/logo-clediss.jpg" 
              alt="Clediss Solutions" 
              className="auth-logo"
            />
          </div>
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
        <div className="admin-header-left">
          <img 
            src="/logo-clediss.jpg" 
            alt="Clediss Solutions" 
            className="admin-header-logo"
          />
          <div className="admin-info">
            <span className="admin-badge">👤 Admin</span>
            <span className="admin-email">{email}</span>
          </div>
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
