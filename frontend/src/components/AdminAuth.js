/**
 * Admin Authentication Component
 * Authentifie l'administrateur avec email + mot de passe (JWT)
 */

import React, { useState, useEffect } from 'react';
import './AdminAuth.css';

const AdminAuth = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Vérifier si déjà authentifié dans le localStorage
  useEffect(() => {
    const storedAuth = localStorage.getItem('adminAuthenticated');
    const storedEmail = localStorage.getItem('adminEmail');
    const storedToken = localStorage.getItem('adminToken');

    if (storedAuth === 'true' && storedEmail && storedToken) {
      setIsAuthenticated(true);
      setEmail(storedEmail);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminEmail', data.email.toLowerCase());
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('authTimestamp', Date.now().toString());
        setPassword('');
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
    setPassword('');
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('authTimestamp');
  };

  // Vérifier si la session a expiré (24h, aligné sur l'expiration du JWT)
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

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Entrez votre email administrateur"
                required
                autoComplete="username"
                className="auth-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe:</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Entrez votre mot de passe"
                  required
                  autoComplete="current-password"
                  className="auth-input password-input"
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="auth-button"
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Connexion...
                </>
              ) : (
                'Connexion'
              )}
            </button>
          </form>
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
