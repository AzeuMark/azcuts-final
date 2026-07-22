const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Store on local disk with a random, unguessable filename (keeps the original
// extension). The relative URL saved on the model is `/uploads/<filename>`.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
  return cb(new ApiError(400, 'Only image files are allowed (jpeg, png, webp, gif)'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = upload;
