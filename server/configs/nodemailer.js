// configs/nodemailer.js
import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SENDER_USER,
    pass: process.env.SENDER_PASS,
  },
});

// Verify connection configuration
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('✅ SMTP transporter is ready');
    return true;
  } catch (error) {
    console.error('❌ SMTP transporter verification failed:', error);
    return false;
  }
};

// Validate environment variables
const validateEmailConfig = () => {
  const required = ['SENDER_USER', 'SENDER_PASS', 'SENDER_EMAIL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing email environment variables:', missing);
    return false;
  }
  return true;
};

const sendEmail = async ({ to, subject, body }) => {
  // Check configuration first
  if (!validateEmailConfig()) {
    console.error('Email configuration incomplete');
    return null;
  }

  // Verify transporter
  const isTransporterReady = await verifyTransporter();
  if (!isTransporterReady) {
    console.error('SMTP transporter not ready');
    return null;
  }

  try {
    console.log(`📧 Attempting to send email to: ${to}`);
    
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to,
      subject,
      html: body,
    };

    const response = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', response.messageId);
    console.log('✅ Email accepted by:', response.accepted);
    console.log('❌ Email rejected by:', response.rejected);
    
    return response;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return null;
  }
};

export default sendEmail;