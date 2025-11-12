import nodemailer from 'nodemailer';

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SENDER_USER,
        pass: process.env.SENDER_PASS,
    },
});

const sendEmail = async ({ to, subject, body }) => {
    try {
        console.log(`📧 Attempting to send email to: ${to}`);
        console.log(`🔧 Using SMTP: smtp-relay.brevo.com`);
        console.log(`🔧 Sender user: ${process.env.SENDER_USER ? 'Set' : 'Not set'}`);
        
        // Validate required environment variables
        if (!process.env.SENDER_USER || !process.env.SENDER_PASS || !process.env.SENDER_EMAIL) {
            throw new Error('Missing required email environment variables');
        }

        const response = await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to,
            subject,
            html: body,
        });

        console.log(`✅ Email sent successfully! Message ID: ${response.messageId}`);
        console.log(`✅ Response: ${response.response}`);
        
        return response;
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        console.error('❌ Error details:', {
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode
        });
        throw error; // Re-throw to handle in calling function
    }
};

export default sendEmail;