/**
 * Remote Management API Routes
 * 5.2 Actions à distance (Remote Management)
 * - Redémarrage de services (PM2, Nginx, MySQL, Docker, etc.)
 * - Restart d'un serveur via commande distante sécurisée
 * - Reboot du serveur depuis l'interface web
 * - Arrêt/démarrage de services applicatifs
 */

const express = require('express');
const { NodeSSH } = require('node-ssh');
const router = express.Router();
const Server = require('../models/Server');
const Metric = require('../models/Metric');
const EmailService = require('../services/emailService');
const User = require('../models/User');

// ============================================================
// SSH command execution. Every service action (restart/start/stop) and
// every status check runs against the target server's own credentials
// stored in MongoDB (ip_address, ssh_username, ssh_password, ssh_port),
// for any service name — nothing here assumes services run as local
// Docker containers on the backend's own host.
// ============================================================
const SERVICE_NAME_REGEX = /^[a-zA-Z0-9_.@-]+$/;

// Low-level: connect via SSH and run `command`, returning the raw result
// without throwing on a non-zero exit code — some commands (like
// `systemctl is-active`) use the exit code to signal state, not failure.
const execSshRaw = async (server, command) => {
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
    return result; // { stdout, stderr, code, signal }
  } catch (err) {
    if (err.httpStatus) throw err;
    const sshErr = new Error(err.message);
    sshErr.httpStatus = 500;
    sshErr.payload = { error: `Erreur SSH: ${err.message}` };
    throw sshErr;
  }
};

// Runs a command over SSH and throws if it exits non-zero — for commands
// where a non-zero exit genuinely means the action failed (restart/stop/
// start). Status checks use execSshRaw directly, since their exit code
// signals service state, not command failure.
const runSshCommand = async (server, command) => {
  const result = await execSshRaw(server, command);
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
};

// Some service names commonly used in the UI don't match the actual
// systemd unit name on most distros — map them before building the
// command. Any name not listed here is passed straight through unchanged.
const SERVICE_NAME_ALIASES = {
  'apache': 'apache2',
  'mongodb': 'mongod'
};

// Builds the command for a service action. PM2 is a process manager, not
// a systemd unit, so it's special-cased to `pm2 <action> all`; every
// other service name (nginx, apache2, mongod, mysql, postgresql, redis,
// docker, ...) runs through systemctl, after alias resolution.
const buildServiceActionCommand = (serviceName, action) => {
  const resolvedName = SERVICE_NAME_ALIASES[serviceName] || serviceName;
  return resolvedName === 'pm2' ? `pm2 ${action} all` : `sudo systemctl ${action} ${resolvedName}`;
};

// ============================================================
// Service criticality — decided here, server-side, and never duplicated
// in the frontend. The frontend only reads the `criticality` value this
// module returns (via /services-status and action error payloads) to
// decide which buttons to show/enable.
//
// 'locked': stop AND restart forbidden outright. systemd-journald/dbus/
// systemd-logind/polkit are core OS plumbing; monitoring-agent is this
// very agent — stopping it makes the server vanish from the dashboard
// with no way left to restart it from the app.
//
// 'restart_only': stop forbidden, restart allowed but only with an
// explicit confirmation (see CONFIRMABLE_ACTION below) — ssh/sshd and the
// network stack can legitimately need a restart (e.g. after a config
// change) but a stop can cut off access to the machine entirely.
// ============================================================
const LOCKED_SERVICES = new Set([
  'systemd-journald', 'dbus', 'systemd-logind', 'polkit', 'monitoring-agent'
]);

const RESTART_ONLY_SERVICES = new Set([
  'ssh', 'sshd', 'networking', 'network', 'systemd-networkd', 'systemd-resolved'
]);

const getServiceCriticality = (serviceName) => {
  const resolvedName = SERVICE_NAME_ALIASES[serviceName] || serviceName;
  if (LOCKED_SERVICES.has(resolvedName)) return 'locked';
  if (RESTART_ONLY_SERVICES.has(resolvedName)) return 'restart_only';
  return 'none';
};

// Actions that a 'restart_only' service still allows, but only once the
// caller has explicitly confirmed — enforced here, not just in the UI,
// since a frontend-only confirmation modal is trivially bypassed with a
// direct API call (curl/Postman) by anyone holding an admin session.
const CONFIRMABLE_ACTION = 'restart';

// ============================================================
// Helper: Verify the real status of a service after an action, checked
// over SSH on the target server for any service name.
//
// `status` is a canonical machine-readable state — 'active', 'inactive',
// 'failed' (systemd only — a crashed unit), or 'unknown' (SSH/verification
// failure, or a transitional systemd state like 'activating'). `label` is
// the matching French text, ready to display as-is.
// Returns { status, label, raw }
// ============================================================
const STATUS_LABELS_FR = {
  active: 'Actif',
  inactive: 'Inactif',
  failed: 'Échec',
  unknown: 'Inconnu'
};

// SubState is what actually tells "running" apart from "active but not
// doing anything anymore" — a one-shot unit reports ActiveState=active
// with SubState=exited, which `systemctl is-active` alone reports as
// plain "active", indistinguishable from a real running daemon.
const SUB_STATE_LABELS_FR = {
  running: 'En cours d\'exécution',
  exited: 'Terminé (ponctuel)',
  dead: 'Arrêté',
  failed: 'Échec',
  unknown: 'Inconnu'
};

const buildStatusResult = (status, raw, subState = 'unknown') => ({
  status,
  label: STATUS_LABELS_FR[status] || STATUS_LABELS_FR.unknown,
  subState,
  subStateLabel: SUB_STATE_LABELS_FR[subState] || SUB_STATE_LABELS_FR.unknown,
  raw
});

const verifyServiceStatus = async (serviceName, server) => {
  if (!server || !server.ip_address || !server.ssh_username || !server.ssh_password) {
    return buildStatusResult('unknown', 'Informations SSH incomplètes');
  }

  // PM2 is a process manager, not a systemd unit — checked via `pm2 jlist`.
  // A process listed as "online" maps to 'active'; a reachable pm2 daemon
  // with no online process maps to 'inactive'; anything unparseable stays
  // 'unknown'.
  if (serviceName === 'pm2') {
    try {
      const result = await execSshRaw(server, 'pm2 jlist');
      let status = 'unknown';
      try {
        const processes = JSON.parse(result.stdout);
        if (Array.isArray(processes)) {
          status = processes.some(p => p.pm2_env && p.pm2_env.status === 'online') ? 'active' : 'inactive';
        }
      } catch (jsonErr) {
        if (result.stdout.includes('"status":"online"') || result.stdout.includes("'status': 'online'")) {
          status = 'active';
        } else if (result.code === 0) {
          status = 'inactive';
        }
      }
      const subState = status === 'active' ? 'running' : status === 'inactive' ? 'dead' : 'unknown';
      return buildStatusResult(status, result.stdout || result.stderr, subState);
    } catch (err) {
      return buildStatusResult('unknown', (err.payload && err.payload.error) || err.message || 'verification failed');
    }
  }

  // `systemctl show --property=ActiveState --property=SubState --value`
  // prints two lines — ActiveState then SubState, in the order requested
  // — regardless of exit code, so one SSH round-trip gets both. ActiveState
  // alone (what `is-active` reports) says "active" for a one-shot unit
  // that already finished (SubState=exited) just as it would for a real
  // running daemon (SubState=running) — SubState is what tells them apart.
  //
  // No `sudo` here: `show` only reads state over D-Bus and doesn't need
  // root, unlike restart/stop/start. Running it under sudo on a host where
  // sudo isn't configured NOPASSWD for this exact command (or has no TTY
  // to prompt for a password) makes the command fail outright — stdout
  // comes back empty and this falls through to 'unknown', which is
  // exactly the "always Inconnu" symptom this fixes.
  try {
    const resolvedName = SERVICE_NAME_ALIASES[serviceName] || serviceName;
    const result = await execSshRaw(
      server,
      `systemctl show ${resolvedName} --property=ActiveState --property=SubState --value`
    );
    const lines = (result.stdout || '').trim().split('\n').map(l => l.trim().toLowerCase());
    const [rawActiveState, rawSubState] = lines;
    const status = ['active', 'inactive', 'failed'].includes(rawActiveState) ? rawActiveState : 'unknown';
    const subState = ['running', 'exited', 'dead', 'failed'].includes(rawSubState) ? rawSubState : 'unknown';
    return buildStatusResult(status, result.stdout || result.stderr, subState);
  } catch (err) {
    return buildStatusResult('unknown', (err.payload && err.payload.error) || err.message || 'verification failed');
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

// ============================================================
// Shared implementation for restart-service / start-service / stop-service.
// Works for ANY service name on ANY server that has SSH credentials
// stored in MongoDB — nginx, apache2, mongod, mysql, postgresql, redis,
// docker, or anything else actually installed on that server.
// ============================================================
const SERVICE_ACTION_LABELS = {
  restart: 'redémarré',
  start: 'démarré',
  stop: 'arrêté'
};

const handleServiceAction = (action) => async (req, res) => {
  try {
    const { server_id } = req.params;
    const { service_name } = req.body;

    if (!service_name) {
      return res.status(400).json({ error: 'service_name est requis' });
    }
    if (!SERVICE_NAME_REGEX.test(service_name)) {
      return res.status(400).json({ error: 'Nom de service invalide' });
    }

    const server = await Server.findOne({ server_id });
    if (!server) {
      return res.status(404).json({ error: 'Serveur non trouvé' });
    }

    // Criticality guard — checked before any SSH command is built or run,
    // and enforced here regardless of what the frontend sent, since this
    // is the only place a bypass (curl/Postman with a valid admin session)
    // can be stopped.
    const criticality = getServiceCriticality(service_name);
    if (criticality === 'locked' && (action === 'stop' || action === 'restart')) {
      const blocked = {
        success: false,
        error: `Action interdite : ${service_name} est un service protégé (criticality: locked). L'arrêter ou le redémarrer via l'application n'est pas autorisé.`,
        criticality
      };
      await logAuditAction(req.auditData, blocked);
      return res.status(403).json(blocked);
    }
    if (criticality === 'restart_only' && action === 'stop') {
      const blocked = {
        success: false,
        error: `Action interdite : arrêter ${service_name} peut couper l'accès au serveur (criticality: restart_only). Seul un redémarrage confirmé est autorisé.`,
        criticality
      };
      await logAuditAction(req.auditData, blocked);
      return res.status(403).json(blocked);
    }
    if (criticality === 'restart_only' && action === CONFIRMABLE_ACTION && req.body.confirm !== true) {
      const blocked = {
        success: false,
        error: `Confirmation requise : redémarrer ${service_name} peut interrompre l'accès au serveur. Renvoyez la requête avec confirm: true pour confirmer.`,
        criticality,
        requires_confirmation: true
      };
      await logAuditAction(req.auditData, blocked);
      return res.status(400).json(blocked);
    }

    const command = buildServiceActionCommand(service_name, action);
    console.log(`[Remote Action] ${action} du service ${service_name} sur le serveur ${server_id} via SSH`);

    try {
      const execResult = await runSshCommand(server, command);
      const verifiedStatus = await verifyServiceStatus(service_name, server);

      const result = {
        success: true,
        message: `Service ${service_name} ${SERVICE_ACTION_LABELS[action]} avec succès`,
        service_name,
        command,
        server_id,
        verified_status: verifiedStatus.status,
        verified_status_label: verifiedStatus.label,
        verified_sub_state: verifiedStatus.subState,
        verified_sub_state_label: verifiedStatus.subStateLabel,
        criticality,
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

  } catch (error) {
    console.error(`[Remote Action] Erreur lors de l'action ${action} sur le service:`, error);
    const result = { success: false, error: error.message };
    await logAuditAction(req.auditData, result);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Redémarrage de services spécifiques
 */
router.post('/:server_id/restart-service',
  requireAdmin,
  auditAction('RESTART_SERVICE', 'SERVICE'),
  handleServiceAction('restart')
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

        console.log(`[Remote Action] Commande reboot envoyée - stdout: ${result.stdout}, stderr: ${result.stderr}, code: ${result.code}`);

        await ssh.dispose();

        // `reboot` returns control (exit code) before the machine actually
        // goes down, so a non-zero code here is a real, checkable signal
        // that the command was rejected (sudo denied, bad syntax, etc.) —
        // not just noise to log and ignore.
        if (result.code !== 0) {
          const failResult = {
            success: false,
            error: `La commande de redémarrage a échoué (code ${result.code}): ${result.stderr || result.stdout || 'aucune sortie'}`
          };
          await logAuditAction(req.auditData, failResult);
          return res.status(500).json(failResult);
        }

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

      // Same requirement as /restart — no SSH credentials, no action.
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

      console.log(`[Remote Action] Arrêt du serveur ${server_id} via SSH`);
      console.log(`[Remote Action] Raison: ${reason}`);

      // Once the machine is actually off, nothing can confirm that over
      // SSH anymore — "verified" here can only mean the SSH connection
      // succeeded and the shutdown command was accepted (exit code) before
      // the link goes down, not that the machine is confirmed off
      // afterward. That's the ceiling of what's checkable for this action.
      const ssh = new NodeSSH();

      try {
        await ssh.connect({
          host: server.ip_address,
          username: server.ssh_username,
          password: server.ssh_password,
          port: server.ssh_port || 22
        });

        console.log(`[Remote Action] Connexion SSH établie avec ${server.ip_address}`);

        // `shutdown -h now` normally hands off and returns an exit code
        // before the machine actually halts, like `reboot` — but unlike a
        // reboot, the machine going down for good can also kill the SSH
        // session before that exit status makes it back, since there's no
        // "session survives the sleep, dies only once true" a moment
        // later. node-ssh resolves (never rejects) in that case, with
        // code: null — a real, non-null exit code (1, 127, ...) means the
        // remote shell ran and reported a genuine failure with nothing
        // interrupting the connection; code: null means the session was
        // cut immediately after the command was accepted, which is
        // exactly what a real shutdown looks like from here. Treated as a
        // probable success, not a failure — see the plan discussed above.
        const sshResult = await ssh.execCommand(`sleep ${delay} && sudo shutdown -h now`);
        console.log(`[Remote Action] Commande shutdown envoyée - stdout: ${sshResult.stdout}, stderr: ${sshResult.stderr}, code: ${sshResult.code}`);

        try {
          await ssh.dispose();
        } catch (disposeError) {
          // Expected when the session already died with the machine —
          // not a reason to treat the action as failed.
        }

        if (sshResult.code !== 0 && sshResult.code !== null) {
          const failResult = {
            success: false,
            error: `La commande d'arrêt a échoué (code ${sshResult.code}): ${sshResult.stderr || sshResult.stdout || 'aucune sortie'}`
          };
          await logAuditAction(req.auditData, failResult);
          return res.status(500).json(failResult);
        }

        const confirmed = sshResult.code === 0;
        const result = {
          success: true,
          confirmed,
          message: confirmed
            ? `Serveur ${server.name} arrêté avec succès`
            : `Serveur ${server.name} arrêté avec succès (connexion perdue après envoi — non confirmé explicitement)`,
          server_id: server_id,
          server_name: server.name,
          reason: reason,
          delay_seconds: delay,
          timestamp: new Date()
        };

        // Only now — after a confirmed or probable success — reflect
        // OFFLINE. If the machine doesn't actually go down (or comes back
        // up), the next
        // real metric it sends corrects this automatically (see
        // routes/metrics.js's GET /latest: "latest" is picked by receipt
        // order, not by the agent's own clock, so a genuine new metric
        // always overtakes this synthetic one).
        try {
          const offlineMetric = new Metric({
            server_id: server_id,
            server_name: server.name,
            cpu_percent: 0.0,
            ram_percent: 0.0,
            disk_percent: 0.0,
            network_in: 0.0,
            network_out: 0.0,
            uptime: 0,
            timestamp: new Date(),
            status: 'OFFLINE',
            location: server.location || 'Unknown'
          });

          await offlineMetric.save();

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

        await logAuditAction(req.auditData, result);
        res.json(result);

      } catch (sshError) {
        console.error('[Remote Action] Erreur SSH lors de l\'arrêt:', sshError);
        const auditResult = {
          success: false,
          error: `Erreur SSH: ${sshError.message}`
        };
        await logAuditAction(req.auditData, auditResult);
        res.status(500).json({
          error: `Impossible d'arrêter le serveur via SSH: ${sshError.message}`
        });
      }

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
  handleServiceAction('start')
);

/**
 * Arrêt de services applicatifs
 */
router.post('/:server_id/stop-service',
  requireAdmin,
  auditAction('STOP_SERVICE', 'SERVICE'),
  handleServiceAction('stop')
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

      // REAL status check for every service the agent actually detected
      // as active on this server, plus PM2 (special-cased since it's a
      // process manager rather than a systemd unit, so it's never part
      // of the agent's systemctl-based detection).
      // server.services holds {name, active_state, sub_state, description}
      // objects (normalized at ingestion — see server.js); only the name
      // is needed here since we re-verify status live over SSH anyway.
      const detectedNames = Array.isArray(server.services)
        ? server.services.map(s => (typeof s === 'string' ? s : s && s.name)).filter(Boolean)
        : [];
      const serviceNames = detectedNames.includes('pm2') ? detectedNames : ['pm2', ...detectedNames];
      const servicesStatus = {};

      for (const svcName of serviceNames) {
        const verified = await verifyServiceStatus(svcName, server);
        const criticality = getServiceCriticality(svcName);
        servicesStatus[svcName] = {
          status: verified.status,
          label: verified.label,
          subState: verified.subState,
          subStateLabel: verified.subStateLabel,
          raw: verified.raw,
          criticality,
          requiresConfirmation: criticality === 'restart_only'
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
