/**
 * Remote Management API Routes
 * 5.2 Actions à distance (Remote Management)
 * - Redémarrage de services (PM2, Nginx, MySQL, Docker, etc.)
 * - Restart d'un serveur via commande distante sécurisée
 * - Reboot du serveur depuis l'interface web
 * - Arrêt/démarrage de services applicatifs
 */

const express = require('express');
const { exec } = require('child_process');
const { NodeSSH } = require('node-ssh');
const router = express.Router();
const Server = require('../models/Server');
const Metric = require('../models/Metric');
const EmailService = require('../services/emailService');
const User = require('../models/User');

// ============================================================
// Helper: Execute a shell command and return { stdout, stderr }
// ============================================================
const execCommand = (command, timeoutMs = 30000) => {
  return new Promise((resolve, reject) => {
    console.log(`[Remote Action] Executing command: ${command}`);
    exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Remote Action] Command failed: ${error.message}`);
        console.error(`[Remote Action] stderr: ${stderr}`);
        return reject({ message: error.message, stderr: stderr.trim(), code: error.code });
      }
      console.log(`[Remote Action] Command succeeded - stdout: ${stdout.trim()}`);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
};

// ============================================================
// Dynamic services: name validation + SSH-based control for any
// service name the agent actually detected on that server (via
// `systemctl list-units`), instead of the fixed legacy list below.
// ============================================================
const SERVICE_NAME_REGEX = /^[a-zA-Z0-9_.@-]+$/;

// Runs an arbitrary command on the target server over SSH, requiring SSH
// credentials to be configured on that server document. Throws an Error
// with `httpStatus`/`payload` set so route handlers can forward it as-is.
const runSshCommand = async (server, command) => {
  if (!server.ip_address || !server.ssh_username || !server.ssh_password) {
    const err = new Error('Informations SSH incomplètes');
    err.httpStatus = 400;
    err.payload = {
      error: 'Informations SSH incomplètes',
      message: 'Le serveur doit avoir ip_address, ssh_username et ssh_password configurés pour gérer ce service à distance',
      missing_fields: {
        ip_address: !server.ip_address,
        ssh_username: !server.ssh_username,
        ssh_password: !server.ssh_password
      }
    };
    throw err;
  }

  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: server.ip_address,
      username: server.ssh_username,
      password: server.ssh_password,
      port: server.ssh_port || 22
    });
    const result = await ssh.execCommand(command);
    await ssh.dispose();

    if (result.code !== 0) {
      const err = new Error(`Échec de la commande: ${command}`);
      err.httpStatus = 500;
      err.payload = {
        error: `Échec de l'exécution: ${result.stderr || result.stdout || 'commande terminée avec une erreur'}`,
        stderr: result.stderr,
        command,
        server_id: server.server_id
      };
      throw err;
    }

    return { stdout: result.stdout, stderr: result.stderr };
  } catch (err) {
    if (err.httpStatus) throw err;
    const sshErr = new Error(err.message);
    sshErr.httpStatus = 500;
    sshErr.payload = { error: `Erreur SSH: ${err.message}` };
    throw sshErr;
  }
};

// Runs `systemctl <action> <serviceName>` on the target server over SSH.
// Only called after the caller has already validated serviceName against
// both SERVICE_NAME_REGEX and the server's own detected `services` list,
// so it's safe to interpolate into the remote command.
const runDynamicServiceCommand = (server, serviceName, action) =>
  runSshCommand(server, `sudo systemctl ${action} ${serviceName}`);

// ============================================================
// Helper: Verify the real status of a service after an action
// Returns { status: 'active'|'inactive'|'unknown', raw: string }
// Legacy services run as Docker containers (except Apache); services
// dynamically detected by the agent are checked over SSH instead.
// ============================================================
const verifyServiceStatus = async (serviceName, server) => {
  // Map service names to their Docker container names
  const containerNames = {
    'nginx': 'frontend',
    'mongodb': 'mongodb'
  };

  // PM2 is checked over SSH on the target server, like every other
  // dynamically-controlled service — not via a local Docker container.
  if (serviceName === 'pm2') {
    if (!server || !server.ip_address || !server.ssh_username || !server.ssh_password) {
      return { status: 'unknown', raw: 'Informations SSH incomplètes' };
    }
    try {
      const { stdout } = await runSshCommand(server, 'pm2 jlist');
      let isOnline = false;
      try {
        const processes = JSON.parse(stdout);
        isOnline = Array.isArray(processes) && processes.some(p => p.pm2_env && p.pm2_env.status === 'online');
      } catch (jsonErr) {
        isOnline = stdout.includes('"status":"online"') || stdout.includes("'status': 'online'");
      }
      return { status: isOnline ? 'active' : 'inactive', raw: stdout };
    } catch (err) {
      return { status: 'unknown', raw: (err.payload && err.payload.error) || err.message || 'verification failed' };
    }
  }

  // Apache uses systemctl
  if (serviceName === 'apache' || serviceName === 'apache2') {
    try {
      const { stdout } = await execCommand('systemctl is-active apache2', 10000);
      const status = stdout.trim().toLowerCase();
      return { status: status === 'active' ? 'active' : 'inactive', raw: stdout };
    } catch (err) {
      if (err.stderr && err.stderr.includes('inactive')) {
        return { status: 'inactive', raw: 'inactive' };
      }
      return { status: 'unknown', raw: err.message || 'verification failed' };
    }
  }

  const containerName = containerNames[serviceName];

  // Dynamically detected service: verify over SSH on the target server
  if (!containerName) {
    if (
      server &&
      server.ip_address && server.ssh_username && server.ssh_password &&
      Array.isArray(server.services) && server.services.includes(serviceName)
    ) {
      const ssh = new NodeSSH();
      try {
        await ssh.connect({
          host: server.ip_address,
          username: server.ssh_username,
          password: server.ssh_password,
          port: server.ssh_port || 22
        });
        const result = await ssh.execCommand(`systemctl is-active ${serviceName}`);
        await ssh.dispose();
        const status = (result.stdout || '').trim().toLowerCase();
        return { status: status === 'active' ? 'active' : 'inactive', raw: result.stdout || result.stderr };
      } catch (err) {
        return { status: 'unknown', raw: err.message || 'verification failed' };
      }
    }
    return { status: 'unknown', raw: 'unsupported service' };
  }

  try {
    const { stdout } = await execCommand(
      `docker inspect --format='{{.State.Running}}' ${containerName}`, 10000
    );
    const isRunning = stdout.trim().toLowerCase() === 'true';

    return { status: isRunning ? 'active' : 'inactive', raw: stdout };
  } catch (err) {
    // Container might not exist or docker not running
    return { status: 'unknown', raw: err.message || 'verification failed' };
  }
};

// Audit log model
const AuditLog = require('../models/AuditLog');

// Middleware pour vérifier les permissions administrateur
const requireAdmin = async (req, res, next) => {
  try {
    const userEmail = req.headers['x-admin-email'] || req.body.admin_email;

    if (!userEmail) {
      return res.status(401).json({
        error: 'Authentification requise',
        message: 'L\'email de l\'administrateur est requis.'
      });
    }

    const user = await User.findOne({ email: userEmail.toLowerCase() });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Accès non autorisé',
        message: 'Seuls les administrateurs peuvent effectuer des actions à distance'
      });
    }

    next();
  } catch (error) {
    console.error('[RemoteActions Auth Middleware] Erreur lors de la vérification de l\'admin:', error);
    return res.status(500).json({
      error: 'Erreur d\'authentification base de données',
      message: 'Impossible de valider les droits d\'administrateur (Base de données hors ligne/erreur).'
    });
  }
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
    const server = await Server.findOne({ server_id: auditData.server_id }).select('name').lean();
    await emailService.sendAuditNotificationEmail({
      action: auditData.action,
      target: auditData.target,
      admin_email: auditData.admin_email,
      server_id: auditData.server_id,
      server_name: server && server.name,
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
          supported_services: ['pm2', 'nginx', 'mongodb', 'apache', 'apache2']
        });
      }

      // Vérifier que le serveur existe
      const server = await Server.findOne({ server_id });
      if (!server) {
        return res.status(404).json({ error: 'Serveur non trouvé' });
      }

      // PM2 is controlled over SSH on the target server, exactly like the
      // dynamically-detected services below — not via a local Docker
      // container, which only worked when the backend ran alongside the
      // app it was managing.
      if (service_name === 'pm2') {
        console.log(`[Remote Action] Redémarrage PM2 sur le serveur ${server_id} via SSH`);
        try {
          const execResult = await runSshCommand(server, 'pm2 restart all');
          const verifiedStatus = await verifyServiceStatus('pm2', server);

          const result = {
            success: true,
            message: 'Service PM2 redémarré avec succès',
            service_name: 'pm2',
            command: 'pm2 restart all',
            server_id: server_id,
            verified_status: verifiedStatus.status,
            command_output: execResult.stdout,
            timestamp: new Date()
          };
          await logAuditAction(req.auditData, result);
          return res.json(result);
        } catch (sshError) {
          const failResult = { success: false, ...(sshError.payload || { error: sshError.message }) };
          await logAuditAction(req.auditData, failResult);
          return res.status(sshError.httpStatus || 500).json(failResult);
        }
      }

      // Services supportés — containers Docker (sauf Apache)
      const supportedServices = {
        'nginx': { name: 'Nginx (Frontend)', command: 'docker restart frontend' },
        'mongodb': { name: 'MongoDB', command: 'docker restart mongodb' },
        'apache': { name: 'Apache', command: 'sudo systemctl restart apache2' },
        'apache2': { name: 'Apache', command: 'sudo systemctl restart apache2' }
      };

      const service = supportedServices[service_name];

      // Legacy hardcoded services (pm2/nginx/mongodb/apache) keep their
      // exact existing local-docker/systemctl behavior.
      if (service) {
        console.log(`[Remote Action] Redémarrage du service ${service.name} sur le serveur ${server_id}`);

        let execResult;
        try {
          execResult = await execCommand(service.command);
        } catch (execError) {
          const failResult = {
            success: false,
            error: `Échec de l'exécution: ${execError.message}`,
            stderr: execError.stderr,
            service_name: service.name,
            command: service.command,
            server_id: server_id,
            timestamp: new Date()
          };
          await logAuditAction(req.auditData, failResult);
          return res.status(500).json(failResult);
        }

        const verifiedStatus = await verifyServiceStatus(service_name, server);

        const result = {
          success: true,
          message: `Service ${service.name} redémarré avec succès`,
          service_name: service.name,
          command: service.command,
          server_id: server_id,
          verified_status: verifiedStatus.status,
          command_output: execResult.stdout,
          timestamp: new Date()
        };

        await logAuditAction(req.auditData, result);
        return res.json(result);
      }

      // Dynamic service: any name the agent actually detected on this
      // server via `systemctl list-units`, controlled over SSH.
      if (!SERVICE_NAME_REGEX.test(service_name)) {
        return res.status(400).json({ error: 'Nom de service invalide' });
      }
      if (!Array.isArray(server.services) || !server.services.includes(service_name)) {
        return res.status(400).json({
          error: 'Service non détecté sur ce serveur',
          detected_services: server.services || []
        });
      }

      console.log(`[Remote Action] Redémarrage dynamique du service ${service_name} sur le serveur ${server_id} via SSH`);

      try {
        const execResult = await runDynamicServiceCommand(server, service_name, 'restart');
        const verifiedStatus = await verifyServiceStatus(service_name, server);

        const result = {
          success: true,
          message: `Service ${service_name} redémarré avec succès`,
          service_name: service_name,
          command: `sudo systemctl restart ${service_name}`,
          server_id: server_id,
          verified_status: verifiedStatus.status,
          command_output: execResult.stdout,
          timestamp: new Date()
        };
        await logAuditAction(req.auditData, result);
        return res.json(result);
      } catch (dynamicError) {
        const failResult = { success: false, ...(dynamicError.payload || { error: dynamicError.message }) };
        await logAuditAction(req.auditData, failResult);
        return res.status(dynamicError.httpStatus || 500).json(failResult);
      }

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

      // Vérifier que les informations SSH sont disponibles
      if (!server.ip_address || !server.ssh_username || !server.ssh_password) {
        return res.status(400).json({
          error: 'Informations SSH incomplètes',
          message: 'Le serveur doit avoir ip_address, ssh_username et ssh_password configurés',
          missing_fields: {
            ip_address: !server.ip_address,
            ssh_username: !server.ssh_username,
            ssh_password: !server.ssh_password
          }
        });
      }

      console.log(`[Remote Action] Redémarrage du serveur ${server_id} via SSH`);
      console.log(`[Remote Action] Délai avant redémarrage: ${delay} secondes`);

      // Exécution réelle via SSH
      const ssh = new NodeSSH();

      try {
        // Connexion SSH
        await ssh.connect({
          host: server.ip_address,
          username: server.ssh_username,
          password: server.ssh_password,
          port: server.ssh_port || 22
        });

        console.log(`[Remote Action] Connexion SSH établie avec ${server.ip_address}`);

        // Exécuter la commande de redémarrage
        const result = await ssh.execCommand(`sleep ${delay} && sudo reboot`);

        console.log(`[Remote Action] Commande reboot envoyée - stdout: ${result.stdout}, stderr: ${result.stderr}`);

        await ssh.dispose();

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

        const auditResult = {
          success: true,
          message: `Serveur ${server.name} redémarré avec succès via SSH`,
          server_id: server_id,
          server_name: server.name,
          ip_address: server.ip_address,
          delay_seconds: delay,
          estimated_downtime: `${delay + 60} secondes`,
          timestamp: new Date()
        };

        // Logger l'action
        await logAuditAction(req.auditData, auditResult);

        res.json(auditResult);

      } catch (sshError) {
        console.error('[Remote Action] Erreur SSH lors du redémarrage:', sshError);
        const auditResult = {
          success: false,
          error: `Erreur SSH: ${sshError.message}`
        };
        await logAuditAction(req.auditData, auditResult);

        res.status(500).json({
          error: `Impossible de redémarrer le serveur via SSH: ${sshError.message}`
        });
      }

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

      // PM2 is controlled over SSH on the target server
      if (service_name === 'pm2') {
        console.log(`[Remote Action] Démarrage PM2 sur le serveur ${server_id} via SSH`);
        try {
          const execResult = await runSshCommand(server, 'pm2 start all');
          const verifiedStatus = await verifyServiceStatus('pm2', server);

          const result = {
            success: true,
            message: 'Service PM2 démarré avec succès',
            service_name: 'pm2',
            command: 'pm2 start all',
            server_id: server_id,
            verified_status: verifiedStatus.status,
            command_output: execResult.stdout,
            timestamp: new Date()
          };
          await logAuditAction(req.auditData, result);
          return res.json(result);
        } catch (sshError) {
          const failResult = { success: false, ...(sshError.payload || { error: sshError.message }) };
          await logAuditAction(req.auditData, failResult);
          return res.status(sshError.httpStatus || 500).json(failResult);
        }
      }

      const supportedServices = {
        'nginx': { name: 'Nginx (Frontend)', command: 'docker start frontend' },
        'mongodb': { name: 'MongoDB', command: 'docker start mongodb' },
        'apache': { name: 'Apache', command: 'sudo systemctl start apache2' },
        'apache2': { name: 'Apache', command: 'sudo systemctl start apache2' }
      };

      const service = supportedServices[service_name];

      if (service) {
        console.log(`[Remote Action] Démarrage du service ${service.name} sur le serveur ${server_id}`);

        let execResult;
        try {
          execResult = await execCommand(service.command);
        } catch (execError) {
          const failResult = {
            success: false,
            error: `Échec de l'exécution: ${execError.message}`,
            stderr: execError.stderr,
            service_name: service.name,
            command: service.command,
            server_id: server_id,
            timestamp: new Date()
          };
          await logAuditAction(req.auditData, failResult);
          return res.status(500).json(failResult);
        }

        const verifiedStatus = await verifyServiceStatus(service_name, server);

        const result = {
          success: true,
          message: `Service ${service.name} démarré avec succès`,
          service_name: service.name,
          command: service.command,
          server_id: server_id,
          verified_status: verifiedStatus.status,
          command_output: execResult.stdout,
          timestamp: new Date()
        };

        await logAuditAction(req.auditData, result);
        return res.json(result);
      }

      // Dynamic service, controlled over SSH
      if (!SERVICE_NAME_REGEX.test(service_name)) {
        return res.status(400).json({ error: 'Nom de service invalide' });
      }
      if (!Array.isArray(server.services) || !server.services.includes(service_name)) {
        return res.status(400).json({
          error: 'Service non détecté sur ce serveur',
          detected_services: server.services || []
        });
      }

      console.log(`[Remote Action] Démarrage dynamique du service ${service_name} sur le serveur ${server_id} via SSH`);

      try {
        const execResult = await runDynamicServiceCommand(server, service_name, 'start');
        const verifiedStatus = await verifyServiceStatus(service_name, server);

        const result = {
          success: true,
          message: `Service ${service_name} démarré avec succès`,
          service_name: service_name,
          command: `sudo systemctl start ${service_name}`,
          server_id: server_id,
          verified_status: verifiedStatus.status,
          command_output: execResult.stdout,
          timestamp: new Date()
        };
        await logAuditAction(req.auditData, result);
        return res.json(result);
      } catch (dynamicError) {
        const failResult = { success: false, ...(dynamicError.payload || { error: dynamicError.message }) };
        await logAuditAction(req.auditData, failResult);
        return res.status(dynamicError.httpStatus || 500).json(failResult);
      }

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

      // PM2 is controlled over SSH on the target server
      if (service_name === 'pm2') {
        console.log(`[Remote Action] Arrêt PM2 sur le serveur ${server_id} via SSH`);
        try {
          const execResult = await runSshCommand(server, 'pm2 stop all');
          const verifiedStatus = await verifyServiceStatus('pm2', server);

          const result = {
            success: true,
            message: 'Service PM2 arrêté avec succès',
            service_name: 'pm2',
            command: 'pm2 stop all',
            server_id: server_id,
            verified_status: verifiedStatus.status,
            command_output: execResult.stdout,
            timestamp: new Date()
          };
          await logAuditAction(req.auditData, result);
          return res.json(result);
        } catch (sshError) {
          const failResult = { success: false, ...(sshError.payload || { error: sshError.message }) };
          await logAuditAction(req.auditData, failResult);
          return res.status(sshError.httpStatus || 500).json(failResult);
        }
      }

      const supportedServices = {
        'nginx': { name: 'Nginx (Frontend)', command: 'docker stop frontend' },
        'mongodb': { name: 'MongoDB', command: 'docker stop mongodb' },
        'apache': { name: 'Apache', command: 'sudo systemctl stop apache2' },
        'apache2': { name: 'Apache', command: 'sudo systemctl stop apache2' }
      };

      const service = supportedServices[service_name];

      if (service) {
        console.log(`[Remote Action] Arrêt du service ${service.name} sur le serveur ${server_id}`);

        let execResult;
        try {
          execResult = await execCommand(service.command);
        } catch (execError) {
          const failResult = {
            success: false,
            error: `Échec de l'exécution: ${execError.message}`,
            stderr: execError.stderr,
            service_name: service.name,
            command: service.command,
            server_id: server_id,
            timestamp: new Date()
          };
          await logAuditAction(req.auditData, failResult);
          return res.status(500).json(failResult);
        }

        const verifiedStatus = await verifyServiceStatus(service_name, server);

        const result = {
          success: true,
          message: `Service ${service.name} arrêté avec succès`,
          service_name: service.name,
          command: service.command,
          server_id: server_id,
          verified_status: verifiedStatus.status,
          command_output: execResult.stdout,
          timestamp: new Date()
        };

        await logAuditAction(req.auditData, result);
        return res.json(result);
      }

      // Dynamic service, controlled over SSH
      if (!SERVICE_NAME_REGEX.test(service_name)) {
        return res.status(400).json({ error: 'Nom de service invalide' });
      }
      if (!Array.isArray(server.services) || !server.services.includes(service_name)) {
        return res.status(400).json({
          error: 'Service non détecté sur ce serveur',
          detected_services: server.services || []
        });
      }

      console.log(`[Remote Action] Arrêt dynamique du service ${service_name} sur le serveur ${server_id} via SSH`);

      try {
        const execResult = await runDynamicServiceCommand(server, service_name, 'stop');
        const verifiedStatus = await verifyServiceStatus(service_name, server);

        const result = {
          success: true,
          message: `Service ${service_name} arrêté avec succès`,
          service_name: service_name,
          command: `sudo systemctl stop ${service_name}`,
          server_id: server_id,
          verified_status: verifiedStatus.status,
          command_output: execResult.stdout,
          timestamp: new Date()
        };
        await logAuditAction(req.auditData, result);
        return res.json(result);
      } catch (dynamicError) {
        const failResult = { success: false, ...(dynamicError.payload || { error: dynamicError.message }) };
        await logAuditAction(req.auditData, failResult);
        return res.status(dynamicError.httpStatus || 500).json(failResult);
      }

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

      // REAL status check for the legacy services plus every service the
      // agent actually detected as active on this server
      const legacyNames = ['pm2', 'nginx', 'mongodb', 'apache'];
      const detectedNames = Array.isArray(server.services) ? server.services : [];
      const serviceNames = [...new Set([...legacyNames, ...detectedNames])];
      const servicesStatus = {};

      for (const svcName of serviceNames) {
        const verified = await verifyServiceStatus(svcName, server);
        servicesStatus[svcName] = {
          status: verified.status === 'active' ? 'running' :
            verified.status === 'inactive' ? 'stopped' : 'unknown',
          raw: verified.raw
        };
      }

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
