import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { protect } from '../middlewares/authMiddleware';

const router = Router();
const adminController = new AdminController();

// Public routes
router.post('/register', adminController.register.bind(adminController));
router.post('/login', adminController.login.bind(adminController));

// Protected routes
router.get('/profile', protect, adminController.getProfile.bind(adminController));

export default router; 