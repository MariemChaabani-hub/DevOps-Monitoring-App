/**
 * Email Notification Service
 * Sends alert email notifications via nodemailer
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Initialize transporter with Gmail (or your email provider)
    // For Gmail: use App Password (not regular password)
    // For testing: configure with your email service
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    });
  }

  /**
   * Send alert email
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

      // Log instead of sending if email not configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[Email] Alert Email (Demo Mode):`);
        console.log(`  To: ${adminEmail}`);
        console.log(`  Subject: [${type}] CPU Alert on Server ${serverId}`);
        console.log(`  Metric: ${metric} = ${value}% (threshold: ${threshold}%)`);
        console.log(`  Time: ${new Date(timestamp).toISOString()}`);
        return { success: true, mode: 'demo' };
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `[${type}] CPU Alert on Server ${serverId}`,
        html: `
          <h2>[${type}] CPU Usage Alert</h2>
          <p><strong>Server:</strong> ${serverId}</p>
          <p><strong>Metric:</strong> ${metric}</p>
          <p><strong>Current Value:</strong> <span style="color: ${type === 'CRITICAL' ? 'red' : 'orange'}; font-weight: bold;">${value}%</span></p>
          <p><strong>Threshold:</strong> ${threshold}%</p>
          <p><strong>Alert Type:</strong> <span style="color: ${type === 'CRITICAL' ? 'red' : 'orange'};">${type}</span></p>
          <p><strong>Timestamp:</strong> ${new Date(timestamp).toISOString()}</p>
          <hr>
          <p><small>This is an automated alert from your DevOps Monitoring System.</small></p>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Email] Alert sent to ${adminEmail} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('[Email] Error sending alert:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send test email to verify configuration
   */
  async sendTestEmail(testEmail) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: testEmail,
        subject: 'DevOps Monitoring System - Test Email',
        html: `
          <h2>Test Email</h2>
          <p>If you received this, your email configuration is working correctly!</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('[Email] Test email failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
