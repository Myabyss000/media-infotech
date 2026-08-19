import { Router } from 'express';
import {
  getUsers,
  getUserById,
  getUserProfile,
  updateUserProfile,
  getOrgChart,
  assignUserReportingLine,
  autoLinkOrgChart,
  addEmployeeDocument,
  deleteEmployeeDocument,
  getOnboardingTasks,
  createOnboardingTask,
  toggleOnboardingTask,
  deleteOnboardingTask,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  offboardUser,
  reactivateUser,
  purgeUserPermanently,
  getCompanyCelebrations,
} from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticateToken);

// Company Life & Celebrations
router.get('/celebrations', getCompanyCelebrations);

// Org Chart & Directory
router.get('/org-chart', getOrgChart);
router.post('/org-chart/auto-link', autoLinkOrgChart);
router.put('/:id/manager', assignUserReportingLine);
router.get('/', requirePermission('users', 'read'), getUsers);

// Governance Offboarding & Archival
router.post('/:id/offboard', requirePermission('users', 'update'), offboardUser);
router.post('/:id/reactivate', requirePermission('users', 'update'), reactivateUser);
router.delete('/:id/purge', requirePermission('users', 'delete'), purgeUserPermanently);

// 360 Profile Dossier
router.get('/:id/profile', getUserProfile);
router.put('/:id/profile', updateUserProfile);

// Document Vault
router.post('/:id/documents', upload.single('file'), addEmployeeDocument);
router.delete('/documents/:docId', deleteEmployeeDocument);

// Onboarding Checklists
router.get('/:id/onboarding', getOnboardingTasks);
router.post('/:id/onboarding', createOnboardingTask);
router.put('/onboarding/:taskId', toggleOnboardingTask);
router.delete('/onboarding/:taskId', deleteOnboardingTask);

// CRUD
router.get('/:id', requirePermission('users', 'read'), getUserById);
router.post('/', requirePermission('users', 'create'), createUser);
router.put('/:id', requirePermission('users', 'update'), updateUser);
router.put('/:id/role', requirePermission('users', 'update'), updateUserRole);
router.delete('/:id', requirePermission('users', 'delete'), deleteUser);

export default router;
