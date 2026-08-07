/**
 * Email Notification Service
 * Sends CRITICAL alert email notifications via nodemailer (Gmail SMTP)
 *
 * Configuration:
 *   - EMAIL_USER: Gmail address (e.g., user@gmail.com)
 *   - EMAIL_PASS: Gmail App Password (16 character password from Google Account)
 *   - Runs in DEMO MODE if credentials not configured
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', '..', 'frontend', 'public', 'logo-clediss.jpg');
const LOGO_CID = 'clediss-logo';

class EmailService {
  constructor() {
    // Initialize transporter with Gmail SMTP
    // For Gmail: must use App Password, NOT regular account password
    // See: https://myaccount.google.com/apppasswords
    this.isConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      console.log(`[Email] Real email mode ENABLED (sending from ${process.env.EMAIL_USER})`);
    } else {
      this.transporter = null;
      console.log(`[Email] Demo mode - email credentials not configured in .env`);
    }
  }

  /**
   * Attach the Clediss logo (referenced in HTML via cid:clediss-logo).
   * Returns an empty array if the logo file isn't found, so emails still
   * send successfully without it.
   */
  _logoAttachment() {
    try {
      if (fs.existsSync(LOGO_PATH)) {
        return [{ filename: 'logo-clediss.jpg', path: LOGO_PATH, cid: LOGO_CID }];
      }
    } catch (error) {
      console.warn('[Email] Could not attach logo:', error.message);
    }
    return [];
  }

  /**
   * Shared compact header used by every email template.
   */
  _header(color, title, subtitle) {
    // Table-based layout on purpose: Gmail and most email clients ignore
    // flexbox/justify-content in HTML emails, so a <table> is the only
    // reliable way to pin the logo to the top-right corner.
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${color}; border-radius: 8px 8px 0 0;">
        <tr>
          <td style="padding: 18px 24px; vertical-align: middle;">
            <h1 style="margin: 0; font-size: 17px; color: white; font-weight: 600;">${title}</h1>
            <p style="margin: 2px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.9);">${subtitle}</p>
          </td>
          <td width="1" style="padding: 18px 24px 18px 0; vertical-align: middle; text-align: right; white-space: nowrap;">
            <img src="cid:${LOGO_CID}" alt="Clediss" style="height: 40px; width: auto; border-radius: 4px; background: white; padding: 2px; display: block;" />
          </td>
        </tr>
      </table>`;
  }

  _footer() {
    return `
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0 14px 0;">
      <p style="color: #888; font-size: 12px; text-align: center; margin: 0;">
        Système de Supervision CLEDISS — notification automatique
      </p>`;
  }

  /**
   * Send an alert email via Gmail SMTP for both WARNING and CRITICAL alerts.
   * CRITICAL alerts are marked urgent (red, "URGENT" in the subject);
   * WARNING alerts use a lighter, orange, non-urgent treatment.
   */
  async sendAlertEmail(alertData) {
    try {
      const {
        serverId,
        serverName,
        type, // 'WARNING' | 'CRITICAL'
        metric,
        value,
        threshold,
        timestamp,
        adminEmail
      } = alertData;

      const displayName = serverName || serverId;
      const timeStr = new Date(timestamp).toLocaleString('fr-FR');

      // Metric-specific wording (this used to be hardcoded to "CPU" no
      // matter which metric actually triggered the alert, which produced
      // misleading "CPU OVERLOAD" emails for RAM/Disk alerts).
      const METRIC_INFO = {
        cpu_percent: { label: 'CPU', resourceName: 'ressources CPU' },
        ram_percent: { label: 'RAM', resourceName: 'ressources RAM' },
        disk_percent: { label: 'Disque', resourceName: 'espace disque' }
      };
      const metricInfo = METRIC_INFO[metric] || METRIC_INFO.cpu_percent;

      const isCritical = type === 'CRITICAL';
      const SEVERITY_INFO = isCritical
        ? {
          color: '#d32f2f',
          emoji: '🚨',
          subjectTag: '[CRITIQUE — URGENT]',
          headerTitle: 'Alerte Critique — Urgent',
          severityLabel: 'CRITIQUE',
          thresholdLabel: 'Seuil critique',
          sentence: `Le serveur <strong>${displayName}</strong> dépasse le seuil critique de ses ${metricInfo.resourceName}. Une intervention immédiate est recommandée pour éviter tout impact sur la disponibilité du service.`
        }
        : {
          color: '#f59e0b',
          emoji: '⚠️',
          subjectTag: '[ALERTE]',
          headerTitle: 'Alerte',
          severityLabel: 'ALERTE',
          thresholdLabel: 'Seuil d\'alerte',
          sentence: `Le serveur <strong>${displayName}</strong> approche d'un niveau élevé sur ses ${metricInfo.resourceName}. Une surveillance est recommandée.`
        };

      // If not configured, log to console instead
      if (!this.isConfigured) {
        console.log(`[Email] ${SEVERITY_INFO.severityLabel} Alert - DEMO MODE (real email disabled):`);
        console.log(`  To: ${adminEmail}`);
        console.log(`  Server: ${displayName}`);
        console.log(`  Metric: ${metric} = ${value}% (threshold: ${threshold}%)`);
        console.log(`  Time: ${timeStr}`);
        return { success: true, mode: 'demo', type };
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `${SEVERITY_INFO.emoji} ${SEVERITY_INFO.subjectTag} ${metricInfo.label} — ${displayName}`,
        attachments: this._logoAttachment(),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            ${this._header(SEVERITY_INFO.color, SEVERITY_INFO.headerTitle, `${metricInfo.label} à ${value}% — seuil dépassé`)}

            <div style="background-color: #fafafa; padding: 20px 24px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #777; width: 40%;">Serveur</td>
                  <td style="padding: 8px 0; font-weight: 600;">${displayName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Utilisation ${metricInfo.label}</td>
                  <td style="padding: 8px 0; font-weight: 600; color: ${SEVERITY_INFO.color};">${value}%</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">${SEVERITY_INFO.thresholdLabel}</td>
                  <td style="padding: 8px 0;">${threshold}%</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Date</td>
                  <td style="padding: 8px 0;">${timeStr}</td>
                </tr>
              </table>

              <p style="font-size: 14px; line-height: 1.6; color: #333; margin: 18px 0 0 0;">
                ${SEVERITY_INFO.sentence}
              </p>

              ${this._footer()}
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Email] ✓ ${SEVERITY_INFO.severityLabel} alert email sent successfully`);
      console.log(`  To: ${adminEmail} | Server: ${displayName} | Message ID: ${info.messageId}`);
      return { success: true, mode: 'real', type, messageId: info.messageId };

    } catch (error) {
      console.error(`[Email] ✗ FAILED to send alert email`);
      console.error(`  Error: ${error.message}`);
      console.error(`  This could be due to: incorrect credentials, Gmail security settings, or network issues`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send CRITICAL backup failure alert email
   */
  async sendBackupAlertEmail(alertData) {
    try {
      const {
        serverId,
        serverName,
        type,
        severity,
        status,
        duration,
        size,
        date,
        timestamp,
        adminEmail
      } = alertData;

      const displayName = serverName || serverId;
      const timeStr = new Date(timestamp).toLocaleString('fr-FR');
      const dateStr = new Date(date).toLocaleString('fr-FR');

      // Only send real emails for CRITICAL alerts
      if (severity !== 'CRITICAL') {
        console.log(`[Email] Skipping non-CRITICAL backup alert (${severity}) - logging only`);
        console.log(`  Server: ${displayName} | Status: ${status}`);
        return { success: true, mode: 'demo', severity: severity, reason: 'non-critical' };
      }

      // If not configured, log to console instead
      if (!this.isConfigured) {
        console.log(`[Email] CRITICAL Backup Alert - DEMO MODE (real email disabled):`);
        console.log(`  To: ${adminEmail}`);
        console.log(`  Server: ${displayName}`);
        console.log(`  Status: ${status}`);
        console.log(`  Time: ${timeStr}`);
        return { success: true, mode: 'demo', severity: 'CRITICAL' };
      }

      const isLate = type === 'BACKUP_LATE';
      const headerColor = isLate ? '#ff9800' : '#d32f2f';
      const statusText = isLate ? 'manquante ou en retard' : 'échouée';

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `🚨 [CRITIQUE] Sauvegarde ${statusText} — ${displayName}`,
        attachments: this._logoAttachment(),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            ${this._header(headerColor, 'Alerte Critique — Sauvegarde', `Sauvegarde ${statusText}`)}

            <div style="background-color: #fafafa; padding: 20px 24px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #777; width: 40%;">Serveur</td>
                  <td style="padding: 8px 0; font-weight: 600;">${displayName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Statut</td>
                  <td style="padding: 8px 0; font-weight: 600; color: ${headerColor}; text-transform: capitalize;">${statusText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Heure de la sauvegarde</td>
                  <td style="padding: 8px 0;">${dateStr}</td>
                </tr>
                ${status === 'FAILED' ? `
                <tr>
                  <td style="padding: 8px 0; color: #777;">Durée</td>
                  <td style="padding: 8px 0;">${duration}s</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Taille</td>
                  <td style="padding: 8px 0;">${size} MB</td>
                </tr>
                ` : ''}
              </table>

              <p style="font-size: 14px; line-height: 1.6; color: #333; margin: 18px 0 0 0;">
                ${isLate
                  ? `La sauvegarde d'aujourd'hui n'a pas été effectuée pour <strong>${displayName}</strong>. Vos données ne sont pas protégées.`
                  : `La sauvegarde de <strong>${displayName}</strong> n'a pas pu se terminer avec succès. Une intervention est recommandée dès que possible.`
                }
              </p>

              ${this._footer()}
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Email] ✓ CRITICAL backup alert email sent successfully`);
      console.log(`  To: ${adminEmail} | Server: ${displayName} | Status: ${statusText} | Message ID: ${info.messageId}`);
      return { success: true, mode: 'real', severity: 'CRITICAL', messageId: info.messageId };

    } catch (error) {
      console.error(`[Email] ✗ FAILED to send CRITICAL backup alert email`);
      console.error(`  Error: ${error.message}`);
      console.error(`  This could be due to: incorrect credentials, Gmail security settings, or network issues`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a backup completion notification email after EVERY daily backup
   * run (both SUCCESS and FAILED), unlike sendBackupAlertEmail() above
   * which only emails for CRITICAL failures/late backups.
   */
  async sendBackupCompletionEmail(data) {
    try {
      const {
        serverId,
        serverName,
        status, // 'OK' | 'FAILED'
        size,
        duration,
        timestamp,
        adminEmail,
        errorMessage
      } = data;

      const isSuccess = status === 'OK';
      const timeStr = new Date(timestamp).toLocaleString('fr-FR');
      const displayName = serverName || serverId;
      const statusLabel = isSuccess ? 'Succès' : 'Échec';
      const headerColor = isSuccess ? '#2e7d32' : '#d32f2f';

      // If not configured, log to console instead
      if (!this.isConfigured) {
        console.log(`[Email] Backup Completion Notification - DEMO MODE (real email disabled):`);
        console.log(`  To: ${adminEmail}`);
        console.log(`  Server: ${displayName}`);
        console.log(`  Status: ${statusLabel}`);
        console.log(`  Size: ${size} MB | Duration: ${duration}s`);
        console.log(`  Time: ${timeStr}`);
        return { success: true, mode: 'demo', status: statusLabel };
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `[Sauvegarde — ${statusLabel}] ${displayName}`,
        attachments: this._logoAttachment(),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            ${this._header(headerColor, 'Rapport de Sauvegarde Quotidienne', displayName)}

            <div style="background-color: #fafafa; padding: 20px 24px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #777; width: 40%;">Serveur</td>
                  <td style="padding: 8px 0; font-weight: 600;">${displayName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Statut</td>
                  <td style="padding: 8px 0; font-weight: 600; color: ${headerColor};">${statusLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Taille</td>
                  <td style="padding: 8px 0;">${size} MB</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Durée</td>
                  <td style="padding: 8px 0;">${duration}s</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Horodatage</td>
                  <td style="padding: 8px 0;">${timeStr}</td>
                </tr>
                ${!isSuccess && errorMessage ? `
                <tr>
                  <td style="padding: 8px 0; color: #777;">Erreur</td>
                  <td style="padding: 8px 0; color: #d32f2f;">${errorMessage}</td>
                </tr>
                ` : ''}
              </table>

              ${!isSuccess ? `
              <p style="font-size: 14px; line-height: 1.6; color: #333; margin: 18px 0 0 0;">
                Cette sauvegarde a échoué. Une vérification du service de sauvegarde est recommandée.
              </p>
              ` : ''}

              ${this._footer()}
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Email] ✓ Backup completion email sent successfully`);
      console.log(`  To: ${adminEmail} | Server: ${displayName} | Status: ${statusLabel} | Message ID: ${info.messageId}`);
      return { success: true, mode: 'real', status: statusLabel, messageId: info.messageId };

    } catch (error) {
      console.error(`[Email] ✗ FAILED to send backup completion email`);
      console.error(`  Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send test email to verify Gmail SMTP configuration
   */
  async sendTestEmail(testEmail) {
    try {
      if (!this.isConfigured) {
        console.warn('[Email] Cannot send test email - EMAIL_USER and EMAIL_PASS not configured in .env');
        return { success: false, error: 'Email credentials not configured' };
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: testEmail,
        subject: 'CLEDISS Monitor — Email de Test',
        attachments: this._logoAttachment(),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            ${this._header('#1565c0', 'Test de Configuration', 'CLEDISS Monitor')}
            <div style="background-color: #fafafa; padding: 20px 24px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
              <p style="font-size: 14px; line-height: 1.6; color: #333; margin: 0;">
                Si vous recevez cet email, la configuration Gmail SMTP fonctionne correctement.
                Les alertes critiques seront envoyées à cette adresse.
              </p>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px;">
                <tr>
                  <td style="padding: 8px 0; color: #777; width: 40%;">Adresse d'envoi</td>
                  <td style="padding: 8px 0;">${process.env.EMAIL_USER}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Horodatage</td>
                  <td style="padding: 8px 0;">${new Date().toLocaleString('fr-FR')}</td>
                </tr>
              </table>
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Email] ✓ Test email sent successfully to ${testEmail}`);
      console.log(`  Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error(`[Email] ✗ Test email failed:`);
      console.error(`  Error: ${error.message}`);
      console.error(`  Troubleshooting:`);
      console.error(`  1. Verify EMAIL_USER and EMAIL_PASS are set in .env`);
      console.error(`  2. Use Gmail App Password, not your regular password`);
      console.error(`  3. Enable 'Less secure app access' if using regular Gmail password`);
      console.error(`  4. Check Gmail security settings: https://myaccount.google.com/security`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send audit notification email
   */
  async sendAuditNotificationEmail(auditData) {
    try {
      const {
        action,
        target,
        admin_email,
        server_id,
        server_name,
        result,
        timestamp,
        details
      } = auditData;

      const displayName = server_name || server_id;
      const timeStr = new Date(timestamp).toLocaleString('fr-FR');
      const isSuccess = result === 'SUCCESS';

      // If not configured, log to console instead
      if (!this.isConfigured) {
        console.log(`[Email] Audit Notification - DEMO MODE (real email disabled):`);
        console.log(`  To: ${admin_email}`);
        console.log(`  Action: ${action} on ${target}`);
        console.log(`  Server: ${displayName}`);
        console.log(`  Result: ${result}`);
        console.log(`  Time: ${timeStr}`);
        return { success: true, mode: 'demo', type: 'AUDIT' };
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: admin_email,
        subject: `🔐 [AUDIT] ${action} — ${displayName}`,
        attachments: this._logoAttachment(),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            ${this._header('#2e7d32', 'Journal d\'Audit', 'Action à distance effectuée')}

            <div style="background-color: #fafafa; padding: 20px 24px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #777; width: 40%;">Action</td>
                  <td style="padding: 8px 0; font-weight: 600;">${action}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Cible</td>
                  <td style="padding: 8px 0;">${target}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Serveur</td>
                  <td style="padding: 8px 0;">${displayName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Résultat</td>
                  <td style="padding: 8px 0; font-weight: 600; color: ${isSuccess ? '#2e7d32' : '#d32f2f'};">${isSuccess ? 'Succès' : 'Échec'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Administrateur</td>
                  <td style="padding: 8px 0;">${admin_email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Heure</td>
                  <td style="padding: 8px 0;">${timeStr}</td>
                </tr>
                ${details ? `
                <tr>
                  <td style="padding: 8px 0; color: #777;">Détails</td>
                  <td style="padding: 8px 0;">${details}</td>
                </tr>
                ` : ''}
              </table>

              <p style="font-size: 13px; line-height: 1.6; color: #666; margin: 18px 0 0 0;">
                Cette action a été authentifiée et journalisée à des fins d'audit et de sécurité.
              </p>

              ${this._footer()}
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Email] ✓ Audit notification email sent successfully`);
      console.log(`  To: ${admin_email} | Action: ${action} | Result: ${result} | Message ID: ${info.messageId}`);
      return { success: true, mode: 'real', type: 'AUDIT', messageId: info.messageId };

    } catch (error) {
      console.error(`[Email] ✗ FAILED to send audit notification email`);
      console.error(`  Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
