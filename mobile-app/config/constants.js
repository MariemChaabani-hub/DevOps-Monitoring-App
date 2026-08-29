// Configuration de l'application
export const APP_CONFIG = {
  // Configuration API
  //API_BASE_URL: 'http://141.227.129.194:30300/api',
  API_BASE_URL: 'http://localhost:3000/api',
  API_TIMEOUT: 10000,

  // Configuration Headers
  API_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },

  // Configuration Application
  APP_NAME: 'CLEDISS Monitoring',
  APP_VERSION: '1.0.0',

  // Configuration Serveurs
  SERVER_STATUSES: {
    OK: 'OK',
    CRITICAL: 'CRITICAL',
    WARNING: 'WARNING',
    OFFLINE: 'OFFLINE',
  },

  // Configuration Temps
  REFRESH_INTERVAL: 5000, // 5 secondes, comme l'app web
  CHART_DATA_POINTS: 24,
  ANIMATION_DURATION: 300,
  
  // Configuration Messages
  MESSAGES: {
    LOADING: 'Chargement...',
    ERROR_NETWORK: 'Erreur de connexion au serveur',
    ERROR_UNAUTHORIZED: 'Non autorisé - Veuillez vous reconnecter',
    ERROR_FORBIDDEN: 'Accès refusé - Permissions insuffisantes',
    ERROR_NOT_FOUND: 'Ressource non trouvée',
    ERROR_SERVER: 'Erreur serveur - Veuillez réessayer plus tard',
    SUCCESS_REBOOT: 'Serveur redémarré avec succès',
    SUCCESS_RESTART_SERVICE: 'Service redémarré avec succès',
  },
  
  // Configuration Validation
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD_MIN_LENGTH: 6,
    SERVER_ID_MAX_LENGTH: 50,
  },
  
  // Configuration Développement
  isDevelopment: __DEV__,
  DEBUG_API: false,
};

// Statut et libellés : voir constants/theme.ts (getStatusColor, getStatusLabel)
// — plus d'émojis, cohérent avec le design épuré de l'app web.

export default APP_CONFIG;
