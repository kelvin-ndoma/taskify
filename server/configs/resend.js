import { Resend } from 'resend';

// Validate environment variable
if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, body }) => {
  try {
    console.log(`📧 Attempting to send email to: ${to}`);
    
    const { data, error } = await resend.emails.send({
      from: process.env.SENDER_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: body,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      throw new Error(`Resend error: ${error.message}`);
    }

    console.log(`✅ Email sent successfully to ${to}: ${data.id}`);
    return data;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export default sendEmail;