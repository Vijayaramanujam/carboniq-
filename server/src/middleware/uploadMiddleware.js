import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const UPLOAD_BASE = path.resolve(process.env.UPLOAD_DIR || './uploads/documents');
const TEMP_BASE = path.resolve('./uploads/temp');

// Ensure storage directories exist
if (!fs.existsSync(UPLOAD_BASE)) {
  fs.mkdirSync(UPLOAD_BASE, { recursive: true });
}
if (!fs.existsSync(TEMP_BASE)) {
  fs.mkdirSync(TEMP_BASE, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_BASE);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream', // Some browsers report zip or csv as octet-stream
];

const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.csv', '.xlsx', '.zip'];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTS.includes(ext) || ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed formats: PDF, JPG, PNG, CSV, XLSX, ZIP.`));
  }
}

export const uploadMulti = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25) * 1024 * 1024,
  },
}).array('files', 20);

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_ZIP_SIZE_MB, 10) || 100) * 1024 * 1024,
  },
}).single('file');
