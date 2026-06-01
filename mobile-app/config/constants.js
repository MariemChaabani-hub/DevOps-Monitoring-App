// Configuration de l'application
export const APP_CONFIG = {
  // Configuration API
  API_BASE_URL: 'http://192.168.1.202:3000/api',
  API_TIMEOUT: 10000,
  
  // Configuration Headers
  API_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Configuration Authentification
  ADMIN_EMAIL: 'mariemchaabani39@gmail.com',
  
  // Configuration Application
  APP_NAME: 'Monitoring App',
  APP_VERSION: '1.0.0',
  
  // Configuration UI
  COLORS: {
    PRIMARY: '#3498db',
    SUCCESS: '#27ae60',
    WARNING: '#f39c12',
    DANGER: '#e74c3c',
    INFO: '#95a5a6',
    BACKGROUND: '#f5f5f5',
    WHITE: '#ffffff',
    BLACK: '#2c3e50',
    GRAY: '#7f8c8d',
    LIGHT_GRAY: '#ecf0f1',
  },
  
  // Configuration Serveurs
  SERVER_STATUSES: {
    OK: 'OK',
    CRITICAL: 'CRITICAL',
    WARNING: 'WARNING',
    OFFLINE: 'OFFLINE',
  },
  
  // Configuration Services
  SERVICES: [
    { name: 'Apache', icon: '🌐' },
    { name: 'MySQL', icon: '🗄️' },
    { name: 'Nginx', icon: '⚙️' },
    { name: 'Docker', icon: '🐳' },
    { name: 'Redis', icon: '🔴' },
    { name: 'PostgreSQL', icon: '🐘' },
    { name: 'MongoDB', icon: '🍃' },
  ],
  
  // Configuration Temps
  REFRESH_INTERVAL: 30000, // 30 secondes
  CHART_DATA_POINTS: 24, // 24 heures
  ANIMATION_DURATION: 300,
  
  // Configuration Navigation
  NAVIGATION_OPTIONS: {
    headerStyle: {
      backgroundColor: '#3498db',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  },
  
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

// Export des utilitaires
export const getServerStatusColor = (status) => {
  const colors = {
    [APP_CONFIG.SERVER_STATUSES.OK]: APP_CONFIG.COLORS.SUCCESS,
    [APP_CONFIG.SERVER_STATUSES.CRITICAL]: APP_CONFIG.COLORS.DANGER,
    [APP_CONFIG.SERVER_STATUSES.WARNING]: APP_CONFIG.COLORS.WARNING,
    [APP_CONFIG.SERVER_STATUSES.OFFLINE]: APP_CONFIG.COLORS.INFO,
  };
  return colors[status] || APP_CONFIG.COLORS.GRAY;
};

export const getServerStatusEmoji = (status) => {
  const emojis = {
    [APP_CONFIG.SERVER_STATUSES.OK]: '🟢',
    [APP_CONFIG.SERVER_STATUSES.CRITICAL]: '🔴',
    [APP_CONFIG.SERVER_STATUSES.WARNING]: '🟡',
    [APP_CONFIG.SERVER_STATUSES.OFFLINE]: '⚫',
  };
  return emojis[status] || '⚫';
};

export const getServiceIcon = (serviceName) => {
  const service = APP_CONFIG.SERVICES.find(s => s.name === serviceName);
  return service ? service.icon : '⚙️';
};

export default APP_CONFIG;
