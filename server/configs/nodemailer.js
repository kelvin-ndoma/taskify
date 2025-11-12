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
  debug: true, // Enable debug output
  logger: true, // Enable logging
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
  
  console.log('✅ Email environment variables are set');
  console.log('📧 Sender Email:', process.env.SENDER_EMAIL);
  console.log('👤 Sender User:', process.env.SENDER_USER);
  console.log('🔑 Sender Pass:', process.env.SENDER_PASS ? '***' : 'MISSING');
  
  return true;
};

const sendEmail = async ({ to, subject, body }) => {
  console.log(`\n📧 ========== ATTEMPTING TO SEND EMAIL ==========`);
  console.log(`📧 To: ${to}`);
  console.log(`📧 Subject: ${subject}`);
  
  // Check configuration first
  if (!validateEmailConfig()) {
    console.error('❌ Email configuration incomplete');
    return null;
  }

  // Verify transporter
  const isTransporterReady = await verifyTransporter();
  if (!isTransporterReady) {
    console.error('❌ SMTP transporter not ready');
    return null;
  }

  try {
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to,
      subject,
      html: body,
    };

    console.log('📧 Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const response = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('✅ Message ID:', response.messageId);
    console.log('✅ Response:', response.response);
    
    return response;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    console.error('❌ Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return null;
  }
};

export default sendEmail;