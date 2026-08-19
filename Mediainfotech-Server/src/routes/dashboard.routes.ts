import { Router } from 'express';
import { getDashboardOverview } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/overview', getDashboardOverview);

export default router;
