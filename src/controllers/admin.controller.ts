import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const prisma = new PrismaClient();

export class AdminController {
  /**
   * Register a new admin
   * @route POST /api/admin/register
   * @access Public (should be restricted in production)
   */
  async register(req: Request, res: Response) {
    const { name, email, password } = req.body;

    try {
      // Check if admin already exists
      const adminExists = await prisma.admin.findUnique({
        where: { email },
      });

      if (adminExists) {
        return res.status(400).json({
          success: false,
          error: 'Admin already exists'
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create admin
      const admin = await prisma.admin.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      // Generate token
      const token = generateToken(admin.id);

      return res.status(201).json({
        success: true,
        data: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          token,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }

  /**
   * Login admin
   * @route POST /api/admin/login
   * @access Public
   */
  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    try {
      // Check if admin exists
      const admin = await prisma.admin.findUnique({
        where: { email },
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Check if password matches
      const isMatch = await bcrypt.compare(password, admin.password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate token
      const token = generateToken(admin.id);

      return res.status(200).json({
        success: true,
        data: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          token,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }

  /**
   * Get admin profile
   * @route GET /api/admin/profile
   * @access Private
   */
  async getProfile(req: Request, res: Response) {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: req.admin.id },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: admin,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }
}

// Generate JWT token
const generateToken = (id: string) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}; 