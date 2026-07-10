const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Email Service
 * Handles sending OTP emails and other email notifications
 * 
 * Supports multiple email providers with fallback options
 */

// Email provider configurations
const emailProviders = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  },
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  },
  custom: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  }
};

// Determine which provider to use
const getTransporter = () => {
  const provider = process.env.EMAIL_PROVIDER || 'gmail';
  
  if (provider === 'custom' && (!process.env.SMTP_HOST || !process.env.SMTP_PORT)) {
    throw new Error('Custom SMTP provider requires SMTP_HOST and SMTP_PORT environment variables');
  }

  const config = emailProviders[provider];
  if (!config) {
    throw new Error(`Unsupported email provider: ${provider}`);
  }

  return nodemailer.createTransport(config);
};

// Create transporter with retry logic
let transporter = null;
let lastTransporterError = null;

const createTransporterWithRetry = async (maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const newTransporter = getTransporter();
      
      // Test the connection
      await newTransporter.verify();
      console.log(`✅ Email transporter verified successfully using ${process.env.EMAIL_PROVIDER || 'gmail'} provider`);
      transporter = newTransporter;
      lastTransporterError = null;
      return newTransporter;
      
    } catch (error) {
      console.error(`❌ Email transporter verification failed (attempt ${attempt}/${maxRetries}):`, error.message);
      lastTransporterError = error;
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to create email transporter after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

/**
 * Send OTP email to user with retry mechanism
 * @param {string} email - User's email address
 * @param {string} otp - OTP code to send
 * @param {number} maxRetries - Maximum number of retry attempts
 */
const sendOTP = async (email, otp, maxRetries = 3) => {
  // Ensure transporter is available
  if (!transporter) {
    await createTransporterWithRetry(maxRetries);
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'SocietyConnect - Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; border: 1px solid #dee2e6;">
          <h2 style="color: #2c3e50; margin-top: 0;">Welcome to SocietyConnect! 🏠</h2>
          <p style="color: #495057; font-size: 16px; line-height: 1.6;">
            Thank you for registering with SocietyConnect. To complete your registration, please verify your email address using the OTP below:
          </p>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 2px solid #007bff; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; color: #007bff; font-size: 24px;">Your OTP Code</h3>
            <div style="font-size: 36px; font-weight: bold; color: #2c3e50; margin: 15px 0; letter-spacing: 5px;">
              ${otp}
            </div>
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              This code will expire in 10 minutes
            </p>
          </div>

          <p style="color: #495057; font-size: 16px; line-height: 1.6;">
            Please enter this OTP in the verification page to complete your registration.
          </p>

          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">

          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            If you didn't register for SocietyConnect, please ignore this email.
          </p>
        </div>
      </div>
    `,
    // Add timeout for email sending
    socketTimeout: 30000, // 30 seconds
    connectionTimeout: 30000 // 30 seconds
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Attempting to send OTP email to ${email} (attempt ${attempt}/${maxRetries})`);
      
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to: ${email}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Failed to send OTP email (attempt ${attempt}/${maxRetries}):`, error.message);
      
      // Don't retry on authentication errors or invalid email addresses
      if (error.code === 'EAUTH' || error.code === 'EENVELOPE' || error.message.includes('authentication')) {
        console.error('🚨 Authentication or email validation error - not retrying');
        throw new Error(`Email authentication failed: ${error.message}`);
      }
      
      if (attempt === maxRetries) {
        console.error(`💥 Failed to send OTP email after ${maxRetries} attempts`);
        throw new Error(`Failed to send OTP email after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying (exponential backoff)
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Send welcome email after successful verification with retry mechanism
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {number} maxRetries - Maximum number of retry attempts
 */
const sendWelcomeEmail = async (email, name, maxRetries = 3) => {
  // Ensure transporter is available
  if (!transporter) {
    await createTransporterWithRetry(maxRetries);
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Welcome to SocietyConnect! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; border: 1px solid #dee2e6;">
          <h2 style="color: #2c3e50; margin-top: 0;">Welcome to SocietyConnect, ${name}! 🎉</h2>
          <p style="color: #495057; font-size: 16px; line-height: 1.6;">
            Your email has been successfully verified! You now have full access to all SocietyConnect features.
          </p>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 2px solid #28a745; margin: 20px 0;">
            <h3 style="margin: 0; color: #28a745; font-size: 20px;">What you can do now:</h3>
            <ul style="margin: 15px 0 0 20px; color: #495057;">
              <li>View and pay maintenance bills</li>
              <li>Submit and track complaints</li>
              <li>View society notices and announcements</li>
              <li>Manage your profile and settings</li>
            </ul>
          </div>

          <p style="color: #495057; font-size: 16px; line-height: 1.6; margin-top: 20px;">
            Thank you for joining our community. If you have any questions, please don't hesitate to contact our support team.
          </p>

          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">

          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            Best regards,<br>
            The SocietyConnect Team
          </p>
        </div>
      </div>
    `,
    // Add timeout for email sending
    socketTimeout: 30000, // 30 seconds
    connectionTimeout: 30000 // 30 seconds
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Attempting to send welcome email to ${email} (attempt ${attempt}/${maxRetries})`);
      
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent successfully to: ${email}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Failed to send welcome email (attempt ${attempt}/${maxRetries}):`, error.message);
      
      // Don't retry on authentication errors or invalid email addresses
      if (error.code === 'EAUTH' || error.code === 'EENVELOPE' || error.message.includes('authentication')) {
        console.error('🚨 Authentication or email validation error - not retrying');
        throw new Error(`Email authentication failed: ${error.message}`);
      }
      
      if (attempt === maxRetries) {
        console.error(`💥 Failed to send welcome email after ${maxRetries} attempts`);
        throw new Error(`Failed to send welcome email after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying (exponential backoff)
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Test email configuration and connectivity
 * Useful for debugging email issues
 */
const testEmailConfig = async () => {
  try {
    const testTransporter = getTransporter();
    await testTransporter.verify();
    console.log('✅ Email configuration test successful');
    return { success: true, message: 'Email configuration is working correctly' };
  } catch (error) {
    console.error('❌ Email configuration test failed:', error.message);
    return { 
      success: false, 
      message: `Email configuration failed: ${error.message}`,
      error: error.message 
    };
  }
};

const sendMaintenanceDueReminder = async (email, name, flatNumber, amount, dueDate, societyName = 'SocietyConnect') => {
  if (!transporter) await createTransporterWithRetry();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `${societyName} - Maintenance Due Reminder`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff7ed; padding: 30px; border-radius: 10px; border: 2px solid #f97316;">
          <h2 style="color: #c2410c; margin-top: 0;">Maintenance Due Reminder 🏠</h2>
          <p style="color: #374151;">Dear ${name},</p>
          <p style="color: #374151;">This is a reminder that your maintenance payment is due.</p>
          <div style="background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
            <p style="margin:0"><strong>Flat:</strong> ${flatNumber}</p>
            <p style="margin:8px 0 0"><strong>Amount Due:</strong> ₹${amount}</p>
            <p style="margin:8px 0 0"><strong>Due Date:</strong> ${dueDate}</p>
          </div>
          <p style="color: #374151;">Please log in to SocietyConnect to make your payment and avoid late fees.</p>
          <hr style="border: none; border-top: 1px solid #fed7aa; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 13px;">— ${societyName} Committee</p>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};

const sendComplaintStatusUpdate = async (email, name, subject, oldStatus, newStatus, societyName = 'SocietyConnect') => {
  if (!transporter) await createTransporterWithRetry();
  const statusColor = newStatus === 'Resolved' ? '#059669' : newStatus === 'In Progress' ? '#2563eb' : '#d97706';
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `${societyName} - Complaint Update: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 10px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0f172a; margin-top: 0;">Complaint Status Updated</h2>
          <p style="color: #374151;">Dear ${name}, your complaint status has been updated.</p>
          <div style="background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
            <p style="margin:0"><strong>Subject:</strong> ${subject}</p>
            <p style="margin:8px 0 0"><strong>Previous Status:</strong> ${oldStatus}</p>
            <p style="margin:8px 0 0"><strong>New Status:</strong> <span style="color:${statusColor}; font-weight:bold;">${newStatus}</span></p>
          </div>
          <p style="color: #374151;">Log in to SocietyConnect to view full details.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 13px;">— ${societyName} Committee</p>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};

/**
 * Get current email provider status
 */
const getEmailStatus = () => {
  return {
    provider: process.env.EMAIL_PROVIDER || 'gmail',
    emailUser: process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/(.{3}).*@/, '$1***@') : 'Not configured',
    hasTransporter: !!transporter,
    lastError: lastTransporterError ? lastTransporterError.message : null,
    timestamp: new Date().toISOString()
  };
};

/**
 * Send email with delivery tracking
 * Logs delivery status to console and returns delivery info
 */
const sendWithTracking = async (mailerFn, recipientEmail, purpose) => {
  const startTime = Date.now();
  try {
    const result = await mailerFn();
    const duration = Date.now() - startTime;
    const deliveryInfo = {
      status: 'sent',
      recipient: recipientEmail,
      purpose,
      messageId: result?.messageId || null,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    };
    console.log(`📧 [DELIVERY] ${purpose} → ${recipientEmail} (OK, ${duration}ms, id: ${deliveryInfo.messageId})`);
    return { success: true, ...deliveryInfo };
  } catch (error) {
    const duration = Date.now() - startTime;
    const deliveryInfo = {
      status: 'failed',
      recipient: recipientEmail,
      purpose,
      error: error.message,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    };
    console.error(`📧 [DELIVERY] ${purpose} → ${recipientEmail} (FAILED: ${error.message})`);
    return { success: false, ...deliveryInfo };
  }
};

// Export all functions for CommonJS
module.exports = {
  sendOTP,
  sendWelcomeEmail,
  sendMaintenanceDueReminder,
  sendComplaintStatusUpdate,
  testEmailConfig,
  getEmailStatus,
  sendWithTracking
};
