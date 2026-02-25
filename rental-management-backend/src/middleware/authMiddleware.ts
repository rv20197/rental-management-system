import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Extend Express Request slightly to hold decoded JWT User Data locally
 */
export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Validates 'Bearer' Token inside request headers.
 * Denies requests without valid token.
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    // First check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Fallback to checking for JWT in cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. Please provide a valid token.' });
    }

    // Cast secret to string for TypeScript to be happy (env var is technically string | undefined)
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    
    // Inject user data decoded back into req context
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

/**
 * Verifies if currently authenticated user has required role(s).
 * Useful for Admin-only routes.
 * 
 * @param roles Array of string representing authorized roles
 */
export const authorize = (roles: string | string[] = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // req.user has been injected by 'authenticate'
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden. You do not have access to this resource.' });
    }
    next();
  };
};
