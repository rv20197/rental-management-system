import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';

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
