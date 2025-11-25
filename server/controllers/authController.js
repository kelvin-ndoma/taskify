// controllers/authController.js
import prisma from '../configs/prisma.js';
import { inngest } from '../inngest/index.js';
import { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  generateVerificationCode,
  generateRandomToken,
  getTokenExpiry 
} from '../utils/auth.js';
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendWelcomeEmail 
} from '../services/emailService.js';

// User registration
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, profilePhoto } = req.body;
    const origin = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:3000';

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        message: 'First name, last name, email, and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ 
        message: 'Please provide a valid email address' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const fullName = `${firstName} ${lastName}`.trim();
    const verificationCode = generateVerificationCode();

    // Create user with verification code
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: email.toLowerCase(),
        passwordHash: hashedPassword,
        image: profilePhoto || '',
        verificationToken: verificationCode,
        resetTokenExpiry: getTokenExpiry(), // 24 hours expiry
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        createdAt: true
      }
    });

    console.log(`✅ User registered: ${user.name} (${user.email})`);

    // Send verification email
    const emailSent = await sendVerificationEmail(user, verificationCode, origin);

    if (!emailSent) {
      // If email fails, we still create the user but they need to request verification again
      console.warn(`⚠️ Verification email failed to send for: ${user.email}`);
    }

    // Generate temporary token (user can't access protected routes until verified)
    const token = generateToken(user.id);

    res.status(201).json({
      user,
      token,
      requiresVerification: true,
      message: emailSent 
        ? 'Account created successfully! Please check your email for verification instructions.' 
        : 'Account created! Please verify your email later.',
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      message: 'Internal server error during registration' 
    });
  }
};

// Verify email with code
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        message: 'Email and verification code are required' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({ 
        message: 'Email is already verified' 
      });
    }

    // Check if verification code matches and is not expired
    if (user.verificationToken !== code) {
      return res.status(400).json({ 
        message: 'Invalid verification code' 
      });
    }

    if (user.resetTokenExpiry && new Date() > user.resetTokenExpiry) {
      return res.status(400).json({ 
        message: 'Verification code has expired. Please request a new one.' 
      });
    }

    // Mark email as verified and clear verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        resetTokenExpiry: null,
      },
    });

    console.log(`✅ Email verified for: ${user.email}`);

    // Trigger Inngest event for workspace setup
    await inngest.send({
      name: 'app/user.registered',
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });

    // Send welcome email
    const origin = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:3000';
    await sendWelcomeEmail(user, origin);

    // Generate full access token
    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: true,
        createdAt: user.createdAt,
      },
      token,
      message: 'Email verified successfully! Welcome to The Burns Brothers.',
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({ 
      message: 'Internal server error during email verification' 
    });
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const origin = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({ 
        message: 'Email is already verified' 
      });
    }

    // Generate new verification code
    const newVerificationCode = generateVerificationCode();

    // Update user with new verification code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: newVerificationCode,
        resetTokenExpiry: getTokenExpiry(),
      },
    });

    // Send new verification email
    const emailSent = await sendVerificationEmail(user, newVerificationCode, origin);

    if (!emailSent) {
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please try again.' 
      });
    }

    res.json({
      message: 'Verification email sent successfully! Please check your inbox.',
    });

  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// User login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Find user with password hash
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: {
                projects: {
                  include: {
                    folders: true,
                    tasks: true,
                    members: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        requiresVerification: true,
        message: 'Please verify your email before logging in.',
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Return user without sensitive data
    const { passwordHash, verificationToken, resetToken, resetTokenExpiry, ...userWithoutSensitiveData } = user;

    console.log(`✅ User logged in: ${user.name} (${user.email})`);

    res.json({
      user: userWithoutSensitiveData,
      token,
      message: 'Login successful!',
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error during login' 
    });
  }
};

// Forgot password - send reset email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const origin = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Don't reveal whether user exists for security
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token (1 hour expiry)
    const resetToken = generateRandomToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user, resetToken, origin);

    if (!emailSent) {
      return res.status(500).json({ 
        message: 'Failed to send password reset email. Please try again.' 
      });
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({ 
        message: 'Token, email, and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || user.resetToken !== token) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token' 
      });
    }

    // Check if token is expired
    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      return res.status(400).json({ 
        message: 'Reset token has expired. Please request a new one.' 
      });
    }

    // Hash new password and clear reset token
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    console.log(`✅ Password reset for: ${user.email}`);

    res.json({
      message: 'Password reset successfully! You can now login with your new password.',
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      message: 'Internal server error during password reset' 
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        workspaces: {
          include: {
            workspace: {
              include: {
                projects: {
                  include: {
                    folders: true,
                    tasks: true,
                    members: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, profilePhoto } = req.body;
    const userId = req.user.id;

    const updateData = {};
    
    if (firstName && lastName) {
      updateData.name = `${firstName} ${lastName}`.trim();
    }
    
    if (profilePhoto !== undefined) {
      updateData.image = profilePhoto;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        message: 'No valid fields to update' 
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`✅ Profile updated for: ${updatedUser.name}`);

    res.json({
      user: updatedUser,
      message: 'Profile updated successfully!',
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error during profile update' 
    });
  }
};

// Change password (authenticated user)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'New password must be at least 6 characters long' 
      });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    console.log(`✅ Password changed for: ${user.email}`);

    res.json({
      message: 'Password changed successfully!',
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ 
      message: 'Internal server error during password change' 
    });
  }
};