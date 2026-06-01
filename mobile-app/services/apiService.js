import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../config/constants';

// Instance axios qui sera initialisée dynamiquement
let api = null;

// Fonction pour initialiser/réinitialiser l'API avec la bonne URL
export const initializeApi = async () => {
  try {
    const savedUrl = await AsyncStorage.getItem('SERVER_URL');
    const baseUrl = savedUrl || APP_CONFIG.API_BASE_URL.replace('/api', '');
    const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
    
    api = axios.create({
      baseURL: apiUrl,
      timeout: APP_CONFIG.API_TIMEOUT,
      headers: APP_CONFIG.API_HEADERS,
    });

    // Intercepteur pour les requêtes
    api.interceptors.request.use(
      (config) => {
        config.headers['x-admin-email'] = APP_CONFIG.ADMIN_EMAIL;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de l\'API:', error);
    // Fallback à la config par défaut
    api = axios.create({
      baseURL: APP_CONFIG.API_BASE_URL,
      timeout: APP_CONFIG.API_TIMEOUT,
      headers: APP_CONFIG.API_HEADERS,
    });
  }
};

// Intercepteur pour les réponses
if (api) {
  api.interceptors.response.use(
    (response) => {
      return response.data;
    },
    (error) => {
      // Gérer les erreurs réseau
      if (error.code === 'NETWORK_ERROR') {
        throw new Error(APP_CONFIG.MESSAGES.ERROR_NETWORK);
      }
      
      // Gérer les erreurs HTTP
      if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
          case 401:
            throw new Error(APP_CONFIG.MESSAGES.ERROR_UNAUTHORIZED);
          case 403:
            throw new Error(APP_CONFIG.MESSAGES.ERROR_FORBIDDEN);
          case 404:
            throw new Error(APP_CONFIG.MESSAGES.ERROR_NOT_FOUND);
          case 500:
            throw new Error(APP_CONFIG.MESSAGES.ERROR_SERVER);
          default:
            throw new Error(data?.message || 'Erreur inconnue');
        }
      }
      
      throw error;
    }
  );
}

// Service API
export const apiService = {
  // Assurer que l'API est initialisée
  ensureInitialized: async () => {
    if (!api) {
      await initializeApi();
    }
  },
  // Récupérer tous les serveurs
  getServers: async () => {
    try {
      await apiService.ensureInitialized();
      const response = await api.get('/servers');
      return response.data || response;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer les métriques
  getMetrics: async (serverId = null) => {
    try {
      await apiService.ensureInitialized();
      const endpoint = serverId 
        ? `/metrics/${serverId}`
        : '/metrics/latest';
      const response = await api.get(endpoint);
      return response.data || response;
    } catch (error) {
      throw error;
    }
  },

  // Redémarrer un service
  async restartService(serverId, service) {
    try {
      await apiService.ensureInitialized();
      const response = await api.post(`/remote-actions/restart/${serverId}`, { service });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Redémarrer un serveur
  rebootServer: async (serverId) => {
    try {
      await apiService.ensureInitialized();
      const response = await api.post(`/remote-actions/${serverId}/restart`, {
        delay: 30,
        force: false,
      });
      return response.data || response;
    } catch (error) {
      throw error;
    }
  },

  // Méthodes additionnelles optionnelles
  getServer: async (serverId) => {
    try {
      await apiService.ensureInitialized();
      const response = await api.get(`/servers/${serverId}`);
      return response.data || response;
    } catch (error) {
      throw error;
    }
  },

  getServerMetrics: async (serverId, limit = 24) => {
    try {
      await apiService.ensureInitialized();
      const response = await api.get(`/metrics/${serverId}?limit=${limit}`);
      return response.data || response;
    } catch (error) {
      throw error;
    }
  },

  getAuditLogs: async (serverId, limit = 50) => {
    try {
      await apiService.ensureInitialized();
      const endpoint = serverId 
        ? `/audit/server/${serverId}?limit=${limit}`
        : `/audit?limit=${limit}`;
      const response = await api.get(endpoint);
      return response.data || response;
    } catch (error) {
      throw error;
    }
  },

  getDashboardSummary: async () => {
    try {
      await apiService.ensureInitialized();
      const response = await api.get('/dashboard/summary');
      return response.data || response;
    } catch (error) {
      throw error;
    }
  },
};

export default apiService;
