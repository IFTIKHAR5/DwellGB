// middleware/upload.js — multer in memory; files are validated/re-encoded by services/storage.
const multer = require('multer');
const { AppError } = require('../utils');

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10, fields: 40, fieldSize: 20 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new AppError(400, 'Only JPG, PNG, WebP or AVIF images are allowed.', 'INVALID_FILE_TYPE'));
  },
});

module.exports = { upload };
