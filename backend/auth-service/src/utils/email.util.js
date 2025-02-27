/**
 * Email Utility Functions
 * Handles sending emails for authentication processes
 */

const nodemailer = require('nodemailer');
const config = require('../config/auth.config');

// Create transporter once
let transporter = null;

/**
 * Initialize email transporter
 * @returns {Object} Nodemailer transporter
 */
const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.email.smtp.host,
            port: config.email.smtp.port,
            secure: config.email.smtp.secure,
            auth: {
                user: config.email.smtp.auth.user,
                pass: config.email.smtp.auth.pass
            }
        });
    }

    return transporter;
};

/**
 * Create verification email content
 * @param {string} token - Verification token
 * @returns {Object} Email content with subject, text, and HTML
 */
const createVerificationEmailContent = (token) => {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;

    return {
        subject: config.email.verificationSubject,
        text: `
      Thank you for registering! Please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you did not create an account, you can safely ignore this email.
    `,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #0066cc;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, you can safely ignore this email.</p>
      </div>
    `
    };
};

/**
 * Create password reset email content
 * @param {string} token - Password reset token
 * @returns {Object} Email content with subject, text, and HTML
 */
const createPasswordResetEmailContent = (token) => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;

    return {
        subject: config.email.passwordResetSubject,
        text: `
      You requested a password reset. Please click the link below to reset your password:
      
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you did not request a password reset, you can safely ignore this email.
    `,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested a password reset. Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #0066cc;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `
    };
};

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text email content
 * @param {string} html - HTML email content
 * @returns {Promise<Object>} Delivery information
 */
const sendEmail = async (to, subject, text, html) => {
    try {
        const mailOptions = {
            from: config.email.from,
            to,
            subject,
            text,
            html
        };

        const info = await getTransporter().sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

/**
 * Send verification email
 * @param {string} email - Recipient email address
 * @param {string} token - Verification token
 * @returns {Promise<Object>} Delivery information
 */
const sendVerificationEmail = async (email, token) => {
    const content = createVerificationEmailContent(token);
    return sendEmail(email, content.subject, content.text, content.html);
};

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} token - Password reset token
 * @returns {Promise<Object>} Delivery information
 */
const sendPasswordResetEmail = async (email, token) => {
    const content = createPasswordResetEmailContent(token);
    return sendEmail(email, content.subject, content.text, content.html);
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};