// services/emailService.js
import sendEmail from '../configs/resend.js';

export const sendVerificationEmail = async (user, verificationCode, origin) => {
  const verificationUrl = `${origin}/verify-email?code=${verificationCode}&email=${user.email}`;
  
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">Verify Your Email Address</h1>
        <p style="color: #666; font-size: 16px;">Welcome to The Burns Brothers Project Management!</p>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
        <h2 style="color: #007bff; margin: 0 0 15px 0;">Hi ${user.name},</h2>
        <p style="color: #555; margin: 0 0 15px 0; line-height: 1.5;">
          Thank you for signing up! To complete your registration and start using our project management platform, please verify your email address using the code below:
        </p>
        
        <div style="text-align: center; margin: 25px 0;">
          <div style="background: #007bff; color: white; padding: 15px 30px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
            ${verificationCode}
          </div>
        </div>

        <p style="color: #555; margin: 15px 0 0 0; line-height: 1.5;">
          Alternatively, you can click the button below to verify your email:
        </p>
        
        <div style="text-align: center; margin: 20px 0;">
          <a href="${verificationUrl}" 
            style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
      </div>

      <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This verification code will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Verify Your Email - The Burns Brothers',
      body: emailContent,
    });
    console.log(`✅ Verification email sent to: ${user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (user, resetToken, origin) => {
  const resetUrl = `${origin}/reset-password?token=${resetToken}&email=${user.email}`;
  
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">Reset Your Password</h1>
        <p style="color: #666; font-size: 16px;">You requested to reset your password</p>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
        <h2 style="color: #007bff; margin: 0 0 15px 0;">Hi ${user.name},</h2>
        <p style="color: #555; margin: 0 0 15px 0; line-height: 1.5;">
          We received a request to reset your password for your The Burns Brothers account. Click the button below to create a new password:
        </p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${resetUrl}" 
            style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p style="color: #555; margin: 15px 0 0 0; line-height: 1.5; font-size: 14px;">
          If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>

      <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This password reset link will expire in 1 hour for security reasons.
        </p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset Your Password - The Burns Brothers',
      body: emailContent,
    });
    console.log(`✅ Password reset email sent to: ${user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return false;
  }
};

export const sendWelcomeEmail = async (user, origin) => {
  const loginUrl = `${origin}/login`;
  
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">Welcome to The Burns Brothers! 🎉</h1>
        <p style="color: #666; font-size: 16px;">Your account has been successfully verified</p>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
        <h2 style="color: #007bff; margin: 0 0 15px 0;">Hi ${user.name},</h2>
        <p style="color: #555; margin: 0 0 15px 0; line-height: 1.5;">
          Welcome to The Burns Brothers Project Management platform! Your email has been successfully verified and your account is now active.
        </p>
        
        <div style="background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #0056b3; margin: 0 0 10px 0;">What you can do now:</h3>
          <ul style="color: #555; margin: 0; padding-left: 20px;">
            <li>Create and manage projects</li>
            <li>Invite team members to collaborate</li>
            <li>Assign tasks and track progress</li>
            <li>Communicate with your team in real-time</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${loginUrl}" 
            style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Get Started
          </a>
        </div>
      </div>

      <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          If you have any questions, feel free to reach out to our support team.
        </p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Welcome to The Burns Brothers!',
      body: emailContent,
    });
    console.log(`✅ Welcome email sent to: ${user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
};