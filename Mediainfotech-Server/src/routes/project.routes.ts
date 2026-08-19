import { Router } from 'express';
import {
  getProjects,
  getProjectStats,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  addProjectSite,
  updateProjectSite,
  deleteProjectSite,
  addProjectDocument,
  deleteProjectDocument,
} from '../controllers/project.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

// High-level overview & KPI Stats
router.get('/stats', getProjectStats);
router.get('/', getProjects);
router.get('/:id', getProjectById);

// Project Lifecycle CRUD
router.post('/', requirePermission('projects', 'create'), createProject);
router.put('/:id', requirePermission('projects', 'update'), updateProject);
router.delete('/:id', requirePermission('projects', 'delete'), deleteProject);

// Milestones
router.post('/:id/milestones', requirePermission('projects', 'update'), addMilestone);
router.put('/milestones/:milestoneId', requirePermission('projects', 'update'), updateMilestone);
router.delete('/milestones/:milestoneId', requirePermission('projects', 'delete'), deleteMilestone);

// Sites / Junctions
router.post('/:id/sites', requirePermission('projects', 'update'), addProjectSite);
router.put('/sites/:siteId', requirePermission('projects', 'update'), updateProjectSite);
router.delete('/sites/:siteId', requirePermission('projects', 'delete'), deleteProjectSite);

// Documents & Certificates
router.post('/:id/documents', requirePermission('projects', 'update'), addProjectDocument);
router.delete('/documents/:docId', requirePermission('projects', 'delete'), deleteProjectDocument);

export default router;
