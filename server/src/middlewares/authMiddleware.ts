// server/src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

// Authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ message: 'Invalid token format' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: string };
    
    // Find user
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({ message: 'Account is disabled' });
      return;
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
    
    res.status(500).json({ message: 'Authentication error' });
  }
};

// Admin role middleware
export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check if user has admin role (would need a role field in User model)
  // This is a simplified version
  if (req.user && (req.user as any).role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

// Optional authentication middleware
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: string };
    const user = await User.findByPk(decoded.id);
    
    if (user && user.isActive) {
      req.user = user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};