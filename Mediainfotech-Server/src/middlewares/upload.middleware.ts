import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadBaseDir = path.join(__dirname, '../../uploads');
const dirs = ['avatars', 'attendance-photos', 'payslips', 'documents'];

dirs.forEach((dir) => {
  const fullPath = path.join(uploadBaseDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'documents';
    if (file.fieldname === 'photo' || file.fieldname === 'checkInPhoto' || file.fieldname === 'checkOutPhoto') {
      folder = 'attendance-photos';
    } else if (file.fieldname === 'avatar') {
      folder = 'avatars';
    } else if (file.fieldname === 'payslip' || file.fieldname === 'file') {
      folder = 'payslips';
    }
    cb(null, path.join(uploadBaseDir, folder));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});
