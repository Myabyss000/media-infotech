import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadBaseDir = path.join(__dirname, '../../uploads');
const dirs = [
  'avatars',
  'attendance-photos',
  'payslips',
  'documents',
  'ticket-photos',
  'policies',
  'vehicles',
  'expenses',
];

dirs.forEach((dir) => {
  const fullPath = path.join(uploadBaseDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'documents';
    const reqFolder = (req.query?.folder as string) || (req.body?.folder as string);

    if (reqFolder && dirs.includes(reqFolder)) {
      folder = reqFolder;
    } else if (
      file.fieldname === 'ticketPhoto' ||
      file.fieldname === 'proofPhoto' ||
      (file.fieldname === 'photo' && req.baseUrl?.includes('ticket'))
    ) {
      folder = 'ticket-photos';
    } else if (
      file.fieldname === 'photo' ||
      file.fieldname === 'checkInPhoto' ||
      file.fieldname === 'checkOutPhoto'
    ) {
      folder = 'attendance-photos';
    } else if (file.fieldname === 'avatar' || file.fieldname === 'avatarFile') {
      folder = 'avatars';
    } else if (file.fieldname === 'policy' || file.fieldname === 'policyFile') {
      folder = 'policies';
    } else if (file.fieldname === 'vehicle' || file.fieldname === 'vehicleDoc') {
      folder = 'vehicles';
    } else if (file.fieldname === 'receipt' || file.fieldname === 'expenseReceipt') {
      folder = 'expenses';
    } else if (file.fieldname === 'payslip') {
      folder = 'payslips';
    }

    const targetDir = path.join(uploadBaseDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    let ext = path.extname(file.originalname);
    if (!ext || ext === '.') {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else if (file.mimetype === 'image/webp') ext = '.webp';
      else if (file.mimetype === 'image/heic') ext = '.heic';
      else if (file.mimetype === 'application/pdf') ext = '.pdf';
      else ext = '.bin';
    }
    const cleanFieldName = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${cleanFieldName}-${uniqueSuffix}${ext}`);
  },
});

// Strict file type validator to prevent malicious executable uploads
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
]);

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const BLOCKED_EXTS = ['.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.js', '.vbs', '.py', '.cgi', '.pl', '.jar', '.html', '.htm', '.svg'];

  if (BLOCKED_EXTS.includes(ext) || file.mimetype === 'image/svg+xml') {
    return cb(new Error(`File type ${ext || file.mimetype} is blocked for security reasons.`));
  }

  if (ALLOWED_MIME_TYPES.has(file.mimetype) || (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml')) {
    cb(null, true);
  } else {
    // Allow if standard document extension matches
    const SAFE_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.webp', '.zip', '.txt', '.csv'];
    if (SAFE_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});
