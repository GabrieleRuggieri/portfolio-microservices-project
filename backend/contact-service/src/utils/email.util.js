/**
 * Email Utility
 * Handles sending emails for contact form notifications and replies
 */

const nodemailer = require('nodemailer');

// Email configuration from environment variables
const EMAIL_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password'
    }
};

// Admin email addresses to receive notifications
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@example.com').split(',');

// Website info
const WEBSITE_NAME = process.env.WEBSITE_NAME || 'Your Portfolio';
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://example.com';
const CONTACT_DASHBOARD_URL = process.env.CONTACT_DASHBOARD_URL || `${WEBSITE_URL}/admin/contact`;

// Create reusable transporter
let transporter = null;

/**
 * Get email transporter
 * @returns {Object} Nodemailer transporter
 */
const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport(EMAIL_CONFIG);
    }
    return transporter;
};

/**
 * Send email notification to admin for new contact message
 * @param {Object} message - Contact message object
 * @returns {Promise<Object>} Nodemailer send info
 */
const sendEmailNotification = async (message) => {
    try {
        const transport = getTransporter();

        // Format message date
        const messageDate = new Date(message.createdAt).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Create email subject
        const subject = `New Contact Message: ${message.subject}`;

        // Create email content
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Contact Message</h2>
        <p>You have received a new contact message on ${WEBSITE_NAME}.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">From:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${message.name} &lt;${message.email}&gt;</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Subject:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${message.subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Date:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${messageDate}</td>
          </tr>
          ${message.phone ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Phone:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${message.phone}</td>
            </tr>
          ` : ''}
          ${message.company ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Company:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${message.company}</td>
            </tr>
          ` : ''}
        </table>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
          <p style="white-space: pre-wrap;">${message.message}</p>
        </div>
        
        <p>
          <a href="${CONTACT_DASHBOARD_URL}/messages/${message.id}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Message
          </a>
        </p>
        
        <p style="color: #666; font-size: 0.8em; margin-top: 30px;">
          This is an automated notification from your ${WEBSITE_NAME} website.
        </p>
      </div>
    `;

        // Create plain text version
        const textContent = `
      New Contact Message
      
      You have received a new contact message on ${WEBSITE_NAME}.
      
      From: ${message.name} <${message.email}>
      Subject: ${message.subject}
      Date: ${messageDate}
      ${message.phone ? `Phone: ${message.phone}` : ''}
      ${message.company ? `Company: ${message.company}` : ''}
      
      Message:
      ${message.message}
      
      View Message: ${CONTACT_DASHBOARD_URL}/messages/${message.id}
      
      This is an automated notification from your ${WEBSITE_NAME} website.
    `;

        // Send email to all admin emails
        const info = await transport.sendMail({
            from: `"${WEBSITE_NAME}" <${EMAIL_CONFIG.auth.user}>`,
            to: ADMIN_EMAILS.join(','),
            subject,
            text: textContent,
            html: htmlContent
        });

        console.log(`Email notification sent to admins: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('Error sending email notification:', error);
        throw error;
    }
};

/**
 * Send reply email to contact
 * @param {Object} message - Original contact message
 * @param {string} replyContent - Reply content
 * @param {string} replyId - Reply ID
 * @returns {Promise<Object>} Nodemailer send info
 */
const sendReplyEmail = async (message, replyContent, replyId) => {
    try {
        const transport = getTransporter();

        // Create email subject (re: original subject)
        const subject = `Re: ${message.subject}`;

        // Create email content
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${message.name},</p>
        
        <p>Thank you for contacting ${WEBSITE_NAME}. This is a response to your message regarding "${message.subject}".</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
          <p style="white-space: pre-wrap;">${replyContent}</p>
        </div>
        
        <p>If you have any further questions, please don't hesitate to reply to this email.</p>
        
        <p>Best regards,<br>${WEBSITE_NAME} Team</p>
        
        <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; color: #666; font-size: 0.8em;">
          <p>This is in reply to your message sent on ${new Date(message.createdAt).toLocaleString()}:</p>
          <p style="white-space: pre-wrap; color: #777; font-style: italic;">${message.message.substring(0, 300)}${message.message.length > 300 ? '...' : ''}</p>
        </div>
      </div>
    `;

        // Create plain text version
        const textContent = `
      Dear ${message.name},
      
      Thank you for contacting ${WEBSITE_NAME}. This is a response to your message regarding "${message.subject}".
      
      ${replyContent}
      
      If you have any further questions, please don't hesitate to reply to this email.
      
      Best regards,
      ${WEBSITE_NAME} Team
      
      ---
      This is in reply to your message sent on ${new Date(message.createdAt).toLocaleString()}:
      "${message.message.substring(0, 300)}${message.message.length > 300 ? '...' : ''}"
    `;

        // Send email
        const info = await transport.sendMail({
            from: `"${WEBSITE_NAME}" <${EMAIL_CONFIG.auth.user}>`,
            to: `"${message.name}" <${message.email}>`,
            subject,
            text: textContent,
            html: htmlContent,
            // Add headers for tracking and threading
            headers: {
                'X-Reply-To': message.id,
                'X-Reply-ID': replyId,
                'References': `<message-${message.id}@${WEBSITE_URL.replace(/^https?:\/\//, '')}>`,
                'In-Reply-To': `<message-${message.id}@${WEBSITE_URL.replace(/^https?:\/\//, '')}>`
            }
        });

        console.log(`Reply email sent to ${message.email}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('Error sending reply email:', error);
        throw error;
    }
};

module.exports = {
    sendEmailNotification,
    sendReplyEmail
};