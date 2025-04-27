import { Router } from 'express';
import { InspirationController } from '../controllers/inspiration.controller';
import { protect } from '../middlewares/authMiddleware';

const router = Router();
const inspirationController = new InspirationController();

// Routes
router.post('/', protect, inspirationController.create.bind(inspirationController));
router.get('/', protect, inspirationController.findAll.bind(inspirationController));
router.get('/:slug', protect, inspirationController.findOne.bind(inspirationController));

export default router; 