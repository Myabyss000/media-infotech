import { Router } from 'express';
import { handleSingleUpload } from '../controllers/upload.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticateToken);

// Accept any single file field name (file, photo, avatar, document, policy, vehicle, receipt)
router.post(
  '/',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'avatar', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'document', maxCount: 1 },
    { name: 'policy', maxCount: 1 },
    { name: 'vehicle', maxCount: 1 },
    { name: 'receipt', maxCount: 1 },
    { name: 'payslip', maxCount: 1 },
  ]),
  (req, res, next) => {
    // Flatten first uploaded file to req.file
    if (req.files && typeof req.files === 'object') {
      for (const field of Object.keys(req.files)) {
        const fileList = (req.files as any)[field];
        if (fileList && fileList.length > 0) {
          req.file = fileList[0];
          break;
        }
      }
    }
    next();
  },
  handleSingleUpload
);

export default router;
