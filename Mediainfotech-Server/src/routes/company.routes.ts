import { Router } from 'express';
import { getCompanySettings, updateCompanySettings } from '../controllers/company.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Public / Authenticated read
router.get('/', getCompanySettings);
router.get('/settings', getCompanySettings);

// Admin / HR / Manager update
router.put('/', authenticateToken, updateCompanySettings);
router.put('/settings', authenticateToken, updateCompanySettings);

export default router;
