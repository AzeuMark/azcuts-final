const multer = require('multer');
const ApiError = require('../utils/ApiError');

// Service images are stored in the database (not on disk), so we keep the bytes
// in memory (req.file.buffer) rather than writing a temp file.
// Only PNG / JPG / JPEG are accepted, capped at 5 MB.
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
  return cb(new ApiError(400, 'Only PNG, JPG, and JPEG images are allowed'));
}

const uploadImage = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_BYTES },
});

module.exports = uploadImage;
