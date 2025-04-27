import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

// Extend Express Request type to include admin property
declare global {
  namespace Express {
    interface Request {
      admin?: any;
    }
  }
}

const prisma = new PrismaClient();

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);

      // Get admin from token
      req.admin = await prisma.admin.findUnique({
        where: { id: (decoded as any).id },
        select: { id: true, email: true, name: true }
      });

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({
        success: false,
        error: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Not authorized, no token'
    });
  }
}; 