const multer = require('multer');
const path = require('path');
const { isConfigured, uploadBuffer } = require('../config/cloudinary');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

const MB = 1024 * 1024;

const CV_TYPES = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

// Keep files in memory and stream them straight to Cloudinary (nothing written to Render's disk)
const makeUpload = (types, maxMb) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * MB, files: 1 },
    fileFilter: (req, file, cb) =>
      types[file.mimetype] ? cb(null, true) : cb(new HttpError(400, `This file type isn't allowed. Use ${[...new Set(Object.values(types))].join(', ').toUpperCase()}.`)),
  }).single('file');

// Wrap multer so its errors become friendly JSON messages
const handle = (mw, maxMb) => (req, res, next) =>
  mw(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(400, `File is too large. Maximum size is ${maxMb} MB.`));
    return next(err.status ? err : new HttpError(400, err.message));
  });

const requireCloudinary = (req, res, next) =>
  isConfigured() ? next() : next(new HttpError(503, 'File uploads are not set up yet. Paste a link instead, or ask the site admin.'));

const safeName = (name = 'file') =>
  path.parse(name).name.replace(/[^\w-]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'file';

// POST /api/uploads/cv  (form field "file") → { url, name, size }
const uploadCv = [
  requireCloudinary,
  handle(makeUpload(CV_TYPES, 5), 5),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose a file to upload');
    const ext = CV_TYPES[req.file.mimetype];
    const isImage = req.file.mimetype.startsWith('image/');
    const result = await uploadBuffer(req.file.buffer, {
      folder: `${process.env.CLOUDINARY_FOLDER || 'jobzdxb'}/cvs`,
      // Documents go up as "raw" so they download as-is (Cloudinary blocks PDF delivery for images on free plans)
      resource_type: isImage ? 'image' : 'raw',
      public_id: `${req.user._id}-${Date.now()}-${safeName(req.file.originalname)}${isImage ? '' : `.${ext}`}`,
      overwrite: false,
    });
    res.status(201).json({ url: result.secure_url, name: req.file.originalname, size: req.file.size });
  }),
];

// POST /api/uploads/logo  (admin, form field "file") → { url }
const uploadLogo = [
  requireCloudinary,
  handle(makeUpload(IMAGE_TYPES, 2), 2),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose an image to upload');
    const result = await uploadBuffer(req.file.buffer, {
      folder: `${process.env.CLOUDINARY_FOLDER || 'jobzdxb'}/logos`,
      resource_type: 'image',
      public_id: `${safeName(req.file.originalname)}-${Date.now()}`,
      // Resize big logos on upload; keeps pages fast
      transformation: [{ width: 400, height: 400, crop: 'limit' }],
    });
    res.status(201).json({ url: result.secure_url });
  }),
];

// GET /api/uploads/status — lets the frontend hide upload buttons when Cloudinary isn't configured
const uploadStatus = (req, res) => res.json({ enabled: isConfigured() });

module.exports = { uploadCv, uploadLogo, uploadStatus };
