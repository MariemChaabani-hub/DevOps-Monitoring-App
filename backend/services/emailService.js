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
   * Send CRITICAL alert email via Gmail SMTP
   * Only sends real emails for CRITICAL alerts
   * Logs other alert types in demo mode
   */
  async sendAlertEmail(alertData) {
    try {
      const {
        serverId,
        type,
        metric,
        value,
        threshold,
        timestamp,
        adminEmail
      } = alertData;

      const timeStr = new Date(timestamp).toISOString();

      // Only send real emails for CRITICAL alerts
      if (type !== 'CRITICAL') {
        console.log(`[Email] Skipping non-CRITICAL alert (${type}) - demo mode only`);
        console.log(`  Server: ${serverId} | Metric: ${metric} = ${value}% (threshold: ${threshold}%)`);
        return { success: true, mode: 'demo', type: type, reason: 'non-critical' };
      }

      // If not configured, log to console instead
      if (!this.isConfigured) {
        console.log(`[Email] CRITICAL Alert - DEMO MODE (real email disabled):`);
        console.log(`  To: ${adminEmail}`);
        console.log(`  Server: ${serverId}`);
        console.log(`  Metric: ${metric} = ${value}% (threshold: ${threshold}%)`);
        console.log(`  Time: ${timeStr}`);
        return { success: true, mode: 'demo', type: 'CRITICAL' };
      }

      // Send real email via Gmail SMTP
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `🚨 [CRITICAL] CPU OVERLOAD on Server ${serverId} - IMMEDIATE ACTION REQUIRED`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- Header -->
            <div style="background-color: #d32f2f; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🚨 CRITICAL ALERT - IMMEDIATE ACTION REQUIRED</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px;">CPU Usage Exceeds Safe Operating Limits</p>
            </div>

            <!-- Main Content -->
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px;">
              
              <!-- Alert Details -->
              <h2 style="color: #d32f2f; margin-top: 0;">Alert Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 30%;">Server:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${serverId}</td>
                </tr>
                <tr style="background-color: #fafafa;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Current CPU Usage:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;"><span style="color: red; font-weight: bold; font-size: 18px;">${value}%</span></td>
                </tr>
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Critical Threshold:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${threshold}%</td>
                </tr>
                <tr style="background-color: #fafafa;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Alert Time:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${timeStr}</td>
                </tr>
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Severity:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;"><span style="background-color: #d32f2f; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;">CRITICAL</span></td>
                </tr>
              </table>

              <!-- Problem Description -->
              <h2 style="color: #d32f2f; margin-top: 25px;">What is the Problem?</h2>
              <p style="background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 12px; border-radius: 3px; margin: 10px 0;">
                <strong>High CPU Usage Detected:</strong> Your server is using <strong>${value}%</strong> of its CPU resources, 
                which exceeds the critical safety threshold of <strong>${threshold}%</strong>.
              </p>
              <p style="line-height: 1.6; color: #333;">
                This means one or more processes on the server are consuming excessive computational resources. 
                When CPU usage remains this high, the system struggles to respond to new requests and may become unstable.
              </p>

              <!-- Dangers & Impact -->
              <h2 style="color: #d32f2f; margin-top: 25px;">⚠️ Dangers Threatening Your Application</h2>
              <ul style="background-color: #ffebee; border-left: 4px solid #d32f2f; padding: 15px 15px 15px 40px; border-radius: 3px; margin: 10px 0; line-height: 1.8;">
                <li><strong>Service Slowdown:</strong> Your application will respond much slower to user requests</li>
                <li><strong>Request Timeouts:</strong> Requests may fail or timeout, causing poor user experience</li>
                <li><strong>System Crash Risk:</strong> Sustained high CPU can lead to server crashes or forced restarts</li>
                <li><strong>Data Loss Risk:</strong> If the server crashes, unsaved data could be permanently lost</li>
                <li><strong>Cascading Failures:</strong> Other services depending on this server may fail</li>
                <li><strong>Business Impact:</strong> Downtime directly affects revenue and customer satisfaction</li>
              </ul>

              <!-- Actions to Take -->
              <h2 style="color: #1565c0; margin-top: 25px;">✅ Recommended Actions (Priority Order)</h2>
              <ol style="background-color: #e3f2fd; border-left: 4px solid #1565c0; padding: 15px 15px 15px 40px; border-radius: 3px; margin: 10px 0; line-height: 1.8;">
                <li><strong>Monitor Now:</strong> Check the server immediately to identify which process is consuming CPU</li>
                <li><strong>Kill Heavy Process:</strong> Terminate or restart the misbehaving process/service</li>
                <li><strong>Check Logs:</strong> Review application logs for errors or memory leaks</li>
                <li><strong>Scale Up (if needed):</strong> Consider adding resources or load-balancing if this is normal traffic</li>
                <li><strong>Optimize Code:</strong> Review and optimize inefficient database queries or algorithms</li>
                <li><strong>Update Threshold:</strong> If sustained high CPU is expected, adjust alert thresholds accordingly</li>
              </ol>

              <!-- Debugging Tips -->
              <h2 style="color: #1565c0; margin-top: 25px;">🔧 Quick Debugging Commands</h2>
              <div style="background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 3px; padding: 12px; font-family: monospace; font-size: 12px; overflow-x: auto;">
                <p style="margin: 0 0 8px 0;"><strong># Check top CPU consuming processes:</strong></p>
                <p style="margin: 0 0 8px 0; color: #d84315;">top -b -o %CPU | head -20</p>
                
                <p style="margin: 15px 0 8px 0;"><strong># Monitor CPU in real-time:</strong></p>
                <p style="margin: 0; color: #d84315;">watch -n 1 'top -b | head -15'</p>
              </div>

              <!-- System Health -->
              <h2 style="color: #1565c0; margin-top: 25px;">📊 System Health Status</h2>
              <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                <tr style="background-color: #fff9c4;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">CPU Status:</td>
                  <td style="padding: 12px; border: 1px solid #ddd; color: #d32f2f;"><strong>⚠️ CRITICAL - Immediate attention needed</strong></td>
                </tr>
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Risk Level:</td>
                  <td style="padding: 12px; border: 1px solid #ddd; color: #d32f2f;"><strong>🔴 VERY HIGH</strong></td>
                </tr>
              </table>

              <!-- Footer -->
              <hr style="border: none; border-top: 2px solid #ddd; margin: 25px 0;">
              <p style="color: #666; font-size: 13px; text-align: center; margin: 15px 0 0 0;">
                <strong>This is an automated CRITICAL alert</strong> from your DevOps Monitoring System<br>
                <strong>Time-sensitive issue:</strong> Address this within the next few minutes<br>
                <a href="http://localhost:3000/api/dashboard/summary" style="color: #1565c0; text-decoration: none;">View Dashboard →</a>
              </p>
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Email] ✓ CRITICAL alert email sent successfully`);
      console.log(`  To: ${adminEmail} | Server: ${serverId} | Message ID: ${info.messageId}`);
      return { success: true, mode: 'real', type: 'CRITICAL', messageId: info.messageId };

    } catch (error) {
      console.error(`[Email] ✗ FAILED to send CRITICAL alert email`);
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
        type,
        severity,
        status,
        duration,
        size,
        date,
        message,
        timestamp,
        adminEmail
      } = alertData;

      const timeStr = new Date(timestamp).toISOString();
      const dateStr = new Date(date).toISOString();

      // Only send real emails for CRITICAL alerts
      if (severity !== 'CRITICAL') {
        console.log(`[Email] Skipping non-CRITICAL backup alert (${severity}) - logging only`);
        console.log(`  Server: ${serverId} | Status: ${status} | Message: ${message}`);
        return { success: true, mode: 'demo', severity: severity, reason: 'non-critical' };
      }

      // If not configured, log to console instead
      if (!this.isConfigured) {
        console.log(`[Email] CRITICAL Backup Alert - DEMO MODE (real email disabled):`);
        console.log(`  To: ${adminEmail}`);
        console.log(`  Server: ${serverId}`);
        console.log(`  Status: ${status}`);
        console.log(`  Message: ${message}`);
        console.log(`  Time: ${timeStr}`);
        return { success: true, mode: 'demo', severity: 'CRITICAL' };
      }

      // Determine alert emoji and color based on type
      const isLate = type === 'BACKUP_LATE';
      const alertEmoji = isLate ? '⏰' : '✕';
      const headerColor = isLate ? '#ff9800' : '#d32f2f';
      const statusText = isLate ? 'Missing or Late' : 'Failed';

      // Send real email via Gmail SMTP
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `🚨 [CRITICAL] Backup ${statusText} on Server ${serverId} - IMMEDIATE ACTION REQUIRED`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- Header -->
            <div style="background-color: ${headerColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🚨 CRITICAL ALERT - BACKUP ${isLate ? 'MISSING/LATE' : 'FAILURE'}</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px;">Data Protection System Requires Immediate Attention</p>
            </div>

            <!-- Main Content -->
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px;">
              
              <!-- Alert Details -->
              <h2 style="color: ${headerColor}; margin-top: 0;">Alert Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 30%;">Server:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${serverId}</td>
                </tr>
                <tr style="background-color: #fafafa;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Backup Status:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;"><span style="color: ${headerColor}; font-weight: bold; font-size: 18px;">${alertEmoji} ${statusText}</span></td>
                </tr>
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Backup Time:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${dateStr}</td>
                </tr>
                ${status === 'FAILED' ? `
                <tr style="background-color: #fafafa;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Duration:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${duration}s</td>
                </tr>
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Backup Size:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${size} MB</td>
                </tr>
                ` : ''}
                <tr style="background-color: #fafafa;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Alert Time:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${timeStr}</td>
                </tr>
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Severity:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;"><span style="background-color: ${headerColor}; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;">CRITICAL</span></td>
                </tr>
              </table>

              <!-- Problem Description -->
              <h2 style="color: ${headerColor}; margin-top: 25px;">What is the Problem?</h2>
              <p style="background-color: ${isLate ? '#fff3cd' : '#ffebee'}; border-left: 4px solid ${headerColor}; padding: 12px; border-radius: 3px; margin: 10px 0;">
                <strong>${isLate ? 'Backup Missing or Late:' : 'Backup Failed:'}</strong> 
                ${isLate 
                  ? `Today's backup has not been completed. Your data is not being protected and you are at risk of data loss.`
                  : `The backup process failed to complete successfully. Your latest data has not been backed up and you are at risk of data loss.`
                }
              </p>

              <!-- Dangers & Impact -->
              <h2 style="color: ${headerColor}; margin-top: 25px;">⚠️ Dangers Threatening Your Data</h2>
              <ul style="background-color: ${isLate ? '#fff3cd' : '#ffebee'}; border-left: 4px solid ${headerColor}; padding: 15px 15px 15px 40px; border-radius: 3px; margin: 10px 0; line-height: 1.8;">
                <li><strong>Data Loss Risk:</strong> Without a successful backup, any data loss is permanent and unrecoverable</li>
                <li><strong>System Failure Impact:</strong> In case of hardware failure, you have no recovery mechanism</li>
                <li><strong>Ransomware Vulnerability:</strong> You have no clean backup to restore from if attacked</li>
                <li><strong>Business Continuity:</strong> Your disaster recovery plan is compromised</li>
                <li><strong>Compliance Issues:</strong> Regulatory requirements for data backup may be violated</li>
                <li><strong>Recovery Time:</strong> Recovery will be slow or impossible if backups are outdated</li>
              </ul>

              <!-- Actions to Take -->
              <h2 style="color: #1565c0; margin-top: 25px;">✅ Recommended Actions (Priority Order)</h2>
              <ol style="background-color: #e3f2fd; border-left: 4px solid #1565c0; padding: 15px 15px 15px 40px; border-radius: 3px; margin: 10px 0; line-height: 1.8;">
                <li><strong>Investigate Now:</strong> Check backup service logs to identify the root cause</li>
                <li><strong>Verify Storage:</strong> Ensure backup storage has sufficient disk space</li>
                <li><strong>Check Network:</strong> Verify network connectivity to backup destination</li>
                <li><strong>Restart Service:</strong> Try restarting the backup service/job</li>
                <li><strong>Manual Backup:</strong> Perform an immediate manual backup as a temporary solution</li>
                <li><strong>Review Logs:</strong> Check system and application logs for errors or warnings</li>
              </ol>

              <!-- Key Metrics -->
              <h2 style="color: #1565c0; margin-top: 25px;">📊 Backup System Health</h2>
              <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                <tr style="background-color: #fff9c4;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Backup Status:</td>
                  <td style="padding: 12px; border: 1px solid #ddd; color: ${headerColor};"><strong>${alertEmoji} ${statusText}</strong></td>
                </tr>
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Risk Level:</td>
                  <td style="padding: 12px; border: 1px solid #ddd; color: ${headerColor};"><strong>🔴 VERY HIGH</strong></td>
                </tr>
              </table>

              <!-- Footer -->
              <hr style="border: none; border-top: 2px solid #ddd; margin: 25px 0;">
              <p style="color: #666; font-size: 13px; text-align: center; margin: 15px 0 0 0;">
                <strong>This is an automated CRITICAL alert</strong> from your DevOps Monitoring System<br>
                <strong>Data protection is critical:</strong> Address this immediately<br>
                <a href="http://localhost:3000/backups" style="color: #1565c0; text-decoration: none;">View Backup Dashboard →</a>
              </p>
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Email] ✓ CRITICAL backup alert email sent successfully`);
      console.log(`  To: ${adminEmail} | Server: ${serverId} | Status: ${statusText} | Message ID: ${info.messageId}`);
      return { success: true, mode: 'real', severity: 'CRITICAL', messageId: info.messageId };

    } catch (error) {
      console.error(`[Email] ✗ FAILED to send CRITICAL backup alert email`);
      console.error(`  Error: ${error.message}`);
      console.error(`  This could be due to: incorrect credentials, Gmail security settings, or network issues`);
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
        subject: 'DevOps Monitoring System - Test Email',
        html: `
          <h2>Email Configuration Test</h2>
          <p>If you received this, your Gmail SMTP configuration is working correctly!</p>
          <p><strong>Email User:</strong> ${process.env.EMAIL_USER}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p>You can now expect CRITICAL CPU alerts to be sent to this email address.</p>
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
        result,
        timestamp,
        details
      } = auditData;

      const timeStr = new Date(timestamp).toLocaleString();

      // If not configured, log to console instead
      if (!this.isConfigured) {
        console.log(`[Email] Audit Notification - DEMO MODE (real email disabled):`);
        console.log(`  To: ${admin_email}`);
        console.log(`  Action: ${action} on ${target}`);
        console.log(`  Server: ${server_id}`);
        console.log(`  Result: ${result}`);
        console.log(`  Time: ${timeStr}`);
        return { success: true, mode: 'demo', type: 'AUDIT' };
      }

      // Send real email via Gmail SMTP
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: admin_email,
        subject: `🔐 [AUDIT] ${action} on ${target} - ${result}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- Header -->
            <div style="background-color: #2e7d32; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🔐 AUDIT LOG - Remote Action</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px;">Administrative action performed on server infrastructure</p>
            </div>

            <!-- Main Content -->
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px;">
              
              <!-- Action Details -->
              <h2 style="color: #2e7d32; margin-top: 0;">Action Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 30%;">Action:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${action}</td>
                </tr>
                <tr style="background-color: #fafafa;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Target:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${target}</td>
                </tr>
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Server:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${server_id}</td>
                </tr>
                <tr style="background-color: #fafafa;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Result:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">
                    <span style="background-color: ${result === 'SUCCESS' ? '#4caf50' : '#f44336'}; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;">
                      ${result}
                    </span>
                  </td>
                </tr>
                <tr style="background-color: white;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Time:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${timeStr}</td>
                </tr>
                ${details ? `
                <tr style="background-color: #fafafa;">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Details:</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${details}</td>
                </tr>
                ` : ''}
              </table>

              <!-- Security Information -->
              <h2 style="color: #1565c0; margin-top: 25px;">🔒 Security Information</h2>
              <div style="background-color: #e3f2fd; border-left: 4px solid #1565c0; padding: 15px; border-radius: 3px; margin: 10px 0; line-height: 1.8;">
                <p><strong>✅ Authenticated Administrator:</strong> ${admin_email}</p>
                <p><strong>📝 Action Logged:</strong> All remote actions are recorded for audit purposes</p>
                <p><strong>🔐 Secure Protocol:</strong> Action performed through authenticated API</p>
                <p><strong>📊 Monitoring Active:</strong> System health monitoring continues</p>
              </div>

              <!-- Important Notice -->
              <h2 style="color: #f57c00; margin-top: 25px;">⚠️ Important Notice</h2>
              <div style="background-color: #fff3cd; border-left: 4px solid #f57c00; padding: 15px; border-radius: 3px; margin: 10px 0; line-height: 1.8;">
                <p><strong>🔍 This action has been:</strong></p>
                <ul style="margin: 10px 0 0 20px; line-height: 1.6;">
                  <li><strong>Logged in audit trail</strong> with full details</li>
                  <li><strong>Verified for authorization</strong> (admin permissions)</li>
                  <li><strong>Monitored for impact</strong> on system performance</li>
                  <li><strong>Documented for compliance</strong> and security review</li>
                </ul>
                <p><strong>📧 Email notification sent to:</strong> ${admin_email}</p>
              </div>
            </div>

            <!-- Footer -->
            <hr style="border: none; border-top: 2px solid #ddd; margin: 25px 0;">
            <p style="color: #666; font-size: 13px; text-align: center; margin: 15px 0 0 0;">
              <strong>This is an automated AUDIT notification</strong> from your DevOps Monitoring System<br>
              <strong>Remote management action performed:</strong> ${action}<br>
              <strong>For security purposes:</strong> This action has been logged and tracked<br>
              <a href="http://localhost:3000/api/servers/${server_id}/audit-log" style="color: #1565c0; text-decoration: none;">View Audit Log →</a>
            </p>
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
