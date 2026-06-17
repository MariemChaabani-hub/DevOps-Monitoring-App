/**
 * Services Management Routes
 * Gestion complète des services (PM2, Nginx, MongoDB, Docker)
 * - Consulter le statut des services
 * - Redémarrer les services
 * - Arrêter/Démarrer les services
 * - Historique des restarts
 */

const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const Service = require('../models/Service');

// Middleware pour vérifier les permissions administrateur
const requireAdmin = (req, res, next) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'mariemchaabani39@gmail.com';
  const userEmail = req.headers['x-admin-email'] || req.body.admin_email;
  
  if (userEmail !== adminEmail) {
    return res.status(403).json({ 
      error: 'Accès non autorisé',
      message: 'Seuls les administrateurs peuvent accéder aux services'
    });
  }
  
  next();
};

// Services supportés
const SUPPORTED_SERVICES = {
  'pm2': { name: 'PM2', icon: '⚙️', description: 'Gestionnaire de processus PM2' },
  'nginx': { name: 'Nginx', icon: '⚡', description: 'Serveur web Nginx' },
  'mongodb': { name: 'MongoDB', icon: '🍃', description: 'Base de données MongoDB' },
  'docker': { name: 'Docker', icon: '🐳', description: 'Conteneurs Docker' }
};

/**
 * Obtenir la liste des services pour un serveur
 * GET /api/services/:server_id
 */
router.get('/:server_id', requireAdmin, async (req, res) => {
  try {
    const { server_id } = req.params;

    // Vérifier que le serveur existe
    const server = await Server.findOne({ server_id });
    if (!server) {
      return res.status(404).json({ error: 'Serveur non trouvé' });
    }

    // Récupérer les services du serveur
    const services = await Service.find({ server_id });

    // Si aucun service n'existe, initialiser les 4 services par défaut
    if (services.length === 0) {
      const defaultServices = [];
      for (const serviceKey of Object.keys(SUPPORTED_SERVICES)) {
        const service = new Service({
          server_id,
          service_name: serviceKey,
          status: 'unknown',
          uptime: 'N/A'
        });
        await service.save();
        defaultServices.push(service);
      }
      
      return res.json({
        server_id,
        server_name: server.name,
        services: defaultServices.map(s => ({
          ...s.toObject(),
          ...SUPPORTED_SERVICES[s.service_name]
        })),
        timestamp: new Date()
      });
    }

    res.json({
      server_id,
      server_name: server.name,
      services: services.map(s => ({
        ...s.toObject(),
        ...SUPPORTED_SERVICES[s.service_name]
      })),
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Services] Erreur lors de la récupération des services:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtenir le statut d'un service spécifique
 * GET /api/services/:server_id/:service_name
 */
router.get('/:server_id/:service_name', requireAdmin, async (req, res) => {
  try {
    const { server_id, service_name } = req.params;

    // Vérifier que le service est supporté
    if (!SUPPORTED_SERVICES[service_name]) {
      return res.status(400).json({ 
        error: 'Service non supporté',
        supported_services: Object.keys(SUPPORTED_SERVICES)
      });
    }

    // Vérifier que le serveur existe
    const server = await Server.findOne({ server_id });
    if (!server) {
      return res.status(404).json({ error: 'Serveur non trouvé' });
    }

    // Récupérer le service
    let service = await Service.findOne({ server_id, service_name });

    // Si le service n'existe pas, le créer
    if (!service) {
      service = new Service({
        server_id,
        service_name,
        status: 'unknown',
        uptime: 'N/A'
      });
      await service.save();
    }

    res.json({
      server_id,
      service_name,
      ...service.toObject(),
      ...SUPPORTED_SERVICES[service_name],
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Services] Erreur lors de la récupération du service:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mettre à jour le statut d'un service
 * PUT /api/services/:server_id/:service_name
 */
router.put('/:server_id/:service_name', requireAdmin, async (req, res) => {
  try {
    const { server_id, service_name } = req.params;
    const { status, uptime, process_id, memory_usage, cpu_usage } = req.body;

    // Vérifier que le service est supporté
    if (!SUPPORTED_SERVICES[service_name]) {
      return res.status(400).json({ error: 'Service non supporté' });
    }

    // Vérifier que le serveur existe
    const server = await Server.findOne({ server_id });
    if (!server) {
      return res.status(404).json({ error: 'Serveur non trouvé' });
    }

    // Mettre à jour le service
    let service = await Service.findOne({ server_id, service_name });

    if (!service) {
      service = new Service({
        server_id,
        service_name,
        status: 'unknown',
        uptime: 'N/A'
      });
    }

    if (status) service.status = status;
    if (uptime) service.uptime = uptime;
    if (process_id !== undefined) service.process_id = process_id;
    if (memory_usage !== undefined) service.memory_usage = memory_usage;
    if (cpu_usage !== undefined) service.cpu_usage = cpu_usage;
    if (status === 'running') {
      service.last_health_check = new Date();
    }

    await service.save();

    res.json({
      message: 'Service mise à jour avec succès',
      service: {
        ...service.toObject(),
        ...SUPPORTED_SERVICES[service_name]
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Services] Erreur lors de la mise à jour du service:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Enregistrer un redémarrage de service
 * POST /api/services/:server_id/:service_name/restart-log
 */
router.post('/:server_id/:service_name/restart-log', requireAdmin, async (req, res) => {
  try {
    const { server_id, service_name } = req.params;

    // Vérifier que le service est supporté
    if (!SUPPORTED_SERVICES[service_name]) {
      return res.status(400).json({ error: 'Service non supporté' });
    }

    // Vérifier que le serveur existe
    const server = await Server.findOne({ server_id });
    if (!server) {
      return res.status(404).json({ error: 'Serveur non trouvé' });
    }

    // Mettre à jour le service
    let service = await Service.findOne({ server_id, service_name });

    if (!service) {
      service = new Service({
        server_id,
        service_name,
        status: 'running',
        uptime: 'quelques secondes'
      });
    }

    // Incrémenter le compteur de restart et mettre à jour la date
    service.restart_count += 1;
    service.last_restart = new Date();
    service.status = 'running';
    service.uptime = 'quelques secondes';
    service.last_health_check = new Date();

    await service.save();

    res.json({
      message: 'Redémarrage enregistré',
      service: {
        ...service.toObject(),
        ...SUPPORTED_SERVICES[service_name]
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[Services] Erreur lors de l\'enregistrement du redémarrage:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtenir l'historique des redémarrages d'un service
 * GET /api/services/:server_id/:service_name/restart-history
 */
router.get('/:server_id/:service_name/restart-history', requireAdmin, async (req, res) => {
  try {
    const { server_id, service_name } = req.params;

    // Vérifier que le service est supporté
    if (!SUPPORTED_SERVICES[service_name]) {
      return res.status(400).json({ error: 'Service non supporté' });
    }

    // Vérifier que le serveur existe
    const server = await Server.findOne({ server_id });
    if (!server) {
      return res.status(404).json({ error: 'Serveur non trouvé' });
    }

    // Récupérer le service
    const service = await Service.findOne({ server_id, service_name });

    if (!service) {
      return res.json({
        server_id,
        service_name,
        restart_count: 0,
        last_restart: null,
        history: []
      });
    }

    res.json({
      server_id,
      service_name,
      restart_count: service.restart_count,
      last_restart: service.last_restart,
      memory_usage: service.memory_usage,
      cpu_usage: service.cpu_usage,
      last_health_check: service.last_health_check,
      ...SUPPORTED_SERVICES[service_name]
    });

  } catch (error) {
    console.error('[Services] Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
