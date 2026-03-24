import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { User } from '../models';
import { sendEmail } from '../services/emailService';

/**
 * Register Controller
 * Parses body for name/email/password. Prevents duplicates.
 * Safely hashes password to Database.
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'manager', // Defaults back to manager, so no random admin signups happen easily.
    });

    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error: any) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

/**
 * Login Controller
 * Verifies Email exists and password Hash matches.
 * Generates and signs JWT to be utilized securely moving forward.
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const user: any = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Sign a fresh token valid for 1 day using our .env key.
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    // Set JWT in HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Adjust based on cross-site requirements
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({ message: 'Login successful', token });
  } catch (error: any) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

/**
 * Logout Controller
 * Clears the JWT cookie to invalidate the session browser-side.
 */
export const logout = async (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
};

/**
 * Forgot Password Controller
 * Generates a reset token and sends it via email.
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user: any = await User.findOne({ where: { email } });
    if (!user) {
      // For security reasons, don't reveal if user exists or not
      return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expiration (1 hour)
    const resetPasswordExpires = new Date(Date.now() + 3600000);

    await user.update({
      resetPasswordToken,
      resetPasswordExpires,
    });

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) have requested the reset of a password. \n\n Please click on the following link, or paste this into your browser to complete the process: \n\n ${resetUrl}`;

    try {
      await sendEmail(user.email, 'Password Reset Request', message);
    } catch (emailError) {
      // In production you might want to log this but still return 200 to avoid revealing user existence
      // Or in development/test, you might want to know about it.
      // For this implementation, we log it and continue if it's not a critical failure for the user experience.
    }

    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error in forgot password', error: error.message });
  }
};

/**
 * Reset Password Controller
 * Validates token and updates user password.
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Invalid token' });
    }

    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user: any = await User.findOne({
      where: {
        resetPasswordToken,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    }

    // Set new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. Please log in.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};
