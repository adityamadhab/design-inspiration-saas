import { Router } from 'express';
import { InspirationController } from '../controllers/inspiration.controller';
import { protect } from '../middlewares/authMiddleware';

const router = Router();
const inspirationController = new InspirationController();

router.post('/extract-links', protect, inspirationController.extractLinks.bind(inspirationController));

export default router; 