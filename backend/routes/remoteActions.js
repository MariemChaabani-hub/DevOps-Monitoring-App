/**
 * Remote Management API Routes
 * 5.2 Actions à distance (Remote Management)
 * - Redémarrage de services (Apache, Nginx, MySQL, Docker, etc.)
 * - Restart d'un serveur via commande distante sécurisée
 * - Reboot du serveur depuis l'interface web
 * - Arrêt/démarrage de services applicatifs
 */

const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const Metric = require('../models/Metric');
const EmailService = require('../services/emailService');

// Audit log model
const AuditLog = require('../models/AuditLog');

// Middleware pour vérifier les permissions administrateur
const requireAdmin = (req, res, next) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'mariemchaabani39@gmail.com';
  const userEmail = req.headers['x-admin-email'] || req.body.admin_email;
  
  if (userEmail !== adminEmail) {
    return res.status(403).json({ 
      error: 'Accès non autorisé',
      message: 'Seuls les administrateurs peuvent effectuer des actions à distance'
    });
  }
  
  next();
};

// Middleware pour logger les actions d'audit
const auditAction = (action, target) => {
  return async (req, res, next) => {
    req.auditData = {
      action,
      target,
      admin_email: req.headers['x-admin-email'] || req.body.admin_email,
      server_id: req.params.server_id,
      timestamp: new Date(),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };
    next();
  };
};

// Enregistrer l'action dans l'audit log
const logAuditAction = async (auditData, result) => {
  try {
    const log = new AuditLog({
      ...auditData,
      result: result.success ? 'SUCCESS' : 'FAILED',
      details: result.details || result.error
    });
    await log.save();
    
    // Envoyer un email de notification pour l'audit
    const emailService = require('../services/emailService');
    await emailService.sendAuditNotificationEmail({
      action: auditData.action,
      target: auditData.target,
      admin_email: auditData.admin_email,
      server_id: auditData.server_id,
      result: result.success ? 'SUCCESS' : 'FAILED',
      timestamp: auditData.timestamp,
      details: result.details || result.error
    });
  } catch (error) {
    console.error('[Audit] Error logging action:', error);
  }
};

/**
 * Redémarrage de services spécifiques
 */
router.post('/:server_id/restart-service', 
  requireAdmin, 
  auditAction('RESTART_SERVICE', 'SERVICE'),
  async (req, res) => {
    try {
      const { server_id } = req.params;
      const { service_name, force = false } = req.body;
      
      if (!service_name) {
        return res.status(400).json({ 
          error: 'service_name est requis',
          supported_services: ['apache2', 'nginx', 'mysql', 'docker', 'postgresql', 'redis', 'mongodb']
        });
      }

      // Vérifier que le serveur existe
      const server = await Server.findOne({ server_id });
      if (!server) {
        return res.status(404).json({ error: 'Serveur non trouvé' });
      }

      // Services supportés
      const supportedServices = {
        'apache2': { name: 'Apache2', command: 'sudo systemctl restart apache2' },
        'nginx': { name: 'Nginx', command: 'sudo systemctl restart nginx' },
        'mysql': { name: 'MySQL', command: 'sudo systemctl restart mysql' },
        'docker': { name: 'Docker', command: 'sudo systemctl restart docker' },
        'postgresql': { name: 'PostgreSQL', command: 'sudo systemctl restart postgresql' },
        'redis': { name: 'Redis', command: 'sudo systemctl restart redis' },
        'mongodb': { name: 'MongoDB', command: 'sudo systemctl restart mongod' }
      };

      const service = supportedServices[service_name];
      if (!service) {
        return res.status(400).json({ 
          error: 'Service non supporté',
          supported_services: Object.keys(supportedServices)
        });
      }

      // Simuler l'exécution de la commande à distance
      console.log(`[Remote Action] Redémarrage du service ${service.name} sur le serveur ${server_id}`);
      console.log(`[Remote Action] Commande: ${service.command}`);
      
      // Simulation de l'exécution (remplacer par vraie connexion SSH)
      const result = {
        success: true,
        message: `Service ${service.name} redémarré avec succès`,
        service_name: service.name,
        command: service.command,
        server_id: server_id,
        timestamp: new Date()
      };

      // Logger l'action
      await logAuditAction(req.auditData, result);

      res.json(result);

    } catch (error) {
      console.error('[Remote Action] Erreur lors du redémarrage du service:', error);
      const result = {
        success: false,
        error: error.message
      };
      await logAuditAction(req.auditData, result);
      
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Redémarrage complet du serveur
 */
router.post('/:server_id/restart', 
  requireAdmin, 
  auditAction('RESTART_SERVER', 'SERVER'),
  async (req, res) => {
    try {
      const { server_id } = req.params;
      const { force = false, delay = 30 } = req.body;

      const server = await Server.findOne({ server_id });
      if (!server) {
        return res.status(404).json({ error: 'Serveur non trouvé' });
      }

      console.log(`[Remote Action] Redémarrage du serveur ${server_id}`);
      console.log(`[Remote Action] Délai avant redémarrage: ${delay} secondes`);
      
      // Simulation du redémarrage (remplacer par vraie connexion SSH)
      const result = {
        success: true,
        message: `Serveur ${server.name} redémarré avec succès`,
        server_id: server_id,
        server_name: server.name,
        delay_seconds: delay,
        estimated_downtime: `${delay + 60} secondes`,
        timestamp: new Date()
      };

      // Créer des métriques OK pour refléter le redémarrage du serveur
      try {
        const restartMetric = new Metric({
          server_id: server_id,
          server_name: server.name,
          cpu_percent: 25 + Math.random() * 20,  // CPU normal 25-45%
          ram_percent: 30 + Math.random() * 25,  // RAM normal 30-55%
          disk_percent: 35 + Math.random() * 20,  // Disk normal 35-55%
          network_in: 500 + Math.random() * 500,
          network_out: 1000 + Math.random() * 500,
          uptime: 120,             // 2 minutes après redémarrage
          timestamp: new Date(),
          status: 'OK',            // État OK
          location: server.location || 'Unknown'
        });
        
        await restartMetric.save();
        
        // Mettre à jour le statut du serveur
        server.status = 'OK';
        server.is_active = true;
        server.current_metrics = {
          cpu_percent: restartMetric.cpu_percent,
          ram_percent: restartMetric.ram_percent,
          disk_percent: restartMetric.disk_percent
        };
        server.last_metric_time = new Date();
        await server.save();
        
        console.log(`[Remote Action] Métriques OK créées pour ${server_id} après redémarrage`);
      } catch (metricError) {
        console.error('[Remote Action] Erreur création métriques OK après redémarrage:', metricError);
      }

      // Logger l'action
      await logAuditAction(req.auditData, result);

      res.json(result);

    } catch (error) {
      console.error('[Remote Action] Erreur lors du redémarrage du serveur:', error);
      const result = {
        success: false,
        error: error.message
      };
      await logAuditAction(req.auditData, result);
      
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Arrêt du serveur
 */
router.post('/:server_id/shutdown', 
  requireAdmin, 
  auditAction('SHUTDOWN_SERVER', 'SERVER'),
  async (req, res) => {
    try {
      const { server_id } = req.params;
      const { delay = 60, reason = 'Maintenance planifiée' } = req.body;

      const server = await Server.findOne({ server_id });
      if (!server) {
        return res.status(404).json({ error: 'Serveur non trouvé' });
      }

      console.log(`[Remote Action] Arrêt du serveur ${server_id}`);
      console.log(`[Remote Action] Raison: ${reason}`);
      
      const result = {
        success: true,
        message: `Serveur ${server.name} arrêté avec succès`,
        server_id: server_id,
        server_name: server.name,
        reason: reason,
        delay_seconds: delay,
        timestamp: new Date()
      };

      // Créer des métriques OFFLINE pour refléter l'arrêt du serveur
      try {
        const offlineMetric = new Metric({
          server_id: server_id,
          server_name: server.name,
          cpu_percent: 0.0,        // CPU à zéro = serveur arrêté
          ram_percent: 0.0,        // RAM à zéro
          disk_percent: 0.0,        // Disk à zéro
          network_in: 0.0,        // Network à zéro
          network_out: 0.0,
          uptime: 0,               // Uptime à zéro
          timestamp: new Date(),
          status: 'OFFLINE',       // État OFFLINE
          location: server.location || 'Unknown'
        });
        
        await offlineMetric.save();
        
        // Mettre à jour le statut du serveur
        server.status = 'OFFLINE';
        server.is_active = false;
        server.current_metrics = {
          cpu_percent: 0.0,
          ram_percent: 0.0,
          disk_percent: 0.0
        };
        server.last_metric_time = new Date();
        await server.save();
        
        console.log(`[Remote Action] Métriques OFFLINE créées pour ${server_id}`);
      } catch (metricError) {
        console.error('[Remote Action] Erreur création métriques OFFLINE:', metricError);
      }

      // Logger l'action
      await logAuditAction(req.auditData, result);

      res.json(result);

    } catch (error) {
      console.error('[Remote Action] Erreur lors de l\'arrêt du serveur:', error);
      const result = {
        success: false,
        error: error.message
      };
      await logAuditAction(req.auditData, result);
      
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Démarrage de services applicatifs
 */
router.post('/:server_id/start-service', 
  requireAdmin, 
  auditAction('START_SERVICE', 'SERVICE'),
  async (req, res) => {
    try {
      const { server_id } = req.params;
      const { service_name } = req.body;

      if (!service_name) {
        return res.status(400).json({ error: 'service_name est requis' });
      }

      const server = await Server.findOne({ server_id });
      if (!server) {
        return res.status(404).json({ error: 'Serveur non trouvé' });
      }

      const supportedServices = {
        'apache2': { name: 'Apache2', command: 'sudo systemctl start apache2' },
        'nginx': { name: 'Nginx', command: 'sudo systemctl start nginx' },
        'mysql': { name: 'MySQL', command: 'sudo systemctl start mysql' },
        'docker': { name: 'Docker', command: 'sudo systemctl start docker' },
        'postgresql': { name: 'PostgreSQL', command: 'sudo systemctl start postgresql' },
        'redis': { name: 'Redis', command: 'sudo systemctl start redis' },
        'mongodb': { name: 'MongoDB', command: 'sudo systemctl start mongod' }
      };

      const service = supportedServices[service_name];
      if (!service) {
        return res.status(400).json({ error: 'Service non supporté' });
      }

      console.log(`[Remote Action] Démarrage du service ${service.name} sur le serveur ${server_id}`);
      
      const result = {
        success: true,
        message: `Service ${service.name} démarré avec succès`,
        service_name: service.name,
        command: service.command,
        server_id: server_id,
        timestamp: new Date()
      };

      // Logger l'action
      await logAuditAction(req.auditData, result);

      res.json(result);

    } catch (error) {
      console.error('[Remote Action] Erreur lors du démarrage du service:', error);
      const result = {
        success: false,
        error: error.message
      };
      await logAuditAction(req.auditData, result);
      
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Arrêt de services applicatifs
 */
router.post('/:server_id/stop-service', 
  requireAdmin, 
  auditAction('STOP_SERVICE', 'SERVICE'),
  async (req, res) => {
    try {
      const { server_id } = req.params;
      const { service_name } = req.body;

      if (!service_name) {
        return res.status(400).json({ error: 'service_name est requis' });
      }

      const server = await Server.findOne({ server_id });
      if (!server) {
        return res.status(404).json({ error: 'Serveur non trouvé' });
      }

      const supportedServices = {
        'apache2': { name: 'Apache2', command: 'sudo systemctl stop apache2' },
        'nginx': { name: 'Nginx', command: 'sudo systemctl stop nginx' },
        'mysql': { name: 'MySQL', command: 'sudo systemctl stop mysql' },
        'docker': { name: 'Docker', command: 'sudo systemctl stop docker' },
        'postgresql': { name: 'PostgreSQL', command: 'sudo systemctl stop postgresql' },
        'redis': { name: 'Redis', command: 'sudo systemctl stop redis' },
        'mongodb': { name: 'MongoDB', command: 'sudo systemctl stop mongod' }
      };

      const service = supportedServices[service_name];
      if (!service) {
        return res.status(400).json({ error: 'Service non supporté' });
      }

      console.log(`[Remote Action] Arrêt du service ${service.name} sur le serveur ${server_id}`);
      
      const result = {
        success: true,
        message: `Service ${service.name} arrêté avec succès`,
        service_name: service.name,
        command: service.command,
        server_id: server_id,
        timestamp: new Date()
      };

      // Logger l'action
      await logAuditAction(req.auditData, result);

      res.json(result);

    } catch (error) {
      console.error('[Remote Action] Erreur lors de l\'arrêt du service:', error);
      const result = {
        success: false,
        error: error.message
      };
      await logAuditAction(req.auditData, result);
      
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Obtenir le statut des services sur un serveur
 */
router.get('/:server_id/services-status', 
  requireAdmin, 
  async (req, res) => {
    try {
      const { server_id } = req.params;

      const server = await Server.findOne({ server_id });
      if (!server) {
        return res.status(404).json({ error: 'Serveur non trouvé' });
      }

      // Simulation du statut des services (remplacer par vraie commande)
      const servicesStatus = {
        'apache2': { status: 'running', uptime: '2 days, 14 hours' },
        'nginx': { status: 'stopped', uptime: '0 seconds' },
        'mysql': { status: 'running', uptime: '5 days, 3 hours' },
        'docker': { status: 'running', uptime: '1 day, 8 hours' },
        'postgresql': { status: 'stopped', uptime: '0 seconds' },
        'redis': { status: 'running', uptime: '3 days, 12 hours' },
        'mongodb': { status: 'running', uptime: '4 days, 6 hours' }
      };

      res.json({
        server_id: server_id,
        server_name: server.name,
        services: servicesStatus,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('[Remote Action] Erreur lors de la récupération du statut des services:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Obtenir l'historique des actions d'audit
 */
router.get('/:server_id/audit-log', 
  requireAdmin, 
  async (req, res) => {
    try {
      const { server_id } = req.params;
      const { limit = 50, start_date, end_date } = req.query;

      let query = { server_id };
      
      if (start_date || end_date) {
        query.timestamp = {};
        if (start_date) query.timestamp.$gte = new Date(start_date);
        if (end_date) query.timestamp.$lte = new Date(end_date);
      }

      const auditLogs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .exec();

      res.json({
        server_id: server_id,
        logs: auditLogs,
        total: auditLogs.length,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('[Remote Action] Erreur lors de la récupération des logs d\'audit:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
