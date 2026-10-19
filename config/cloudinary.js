const cloudinary = require('cloudinary').v2;

// Accepts either CLOUDINARY_URL (cloudinary://key:secret@cloud) or the three separate variables
const isConfigured = () =>
  Boolean(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));

if (!process.env.CLOUDINARY_URL && isConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const FOLDER = process.env.CLOUDINARY_FOLDER || 'jobzdxb';

// Upload a Buffer and resolve with Cloudinary's result
const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: FOLDER, ...options }, (err, result) =>
      err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });

module.exports = { cloudinary, isConfigured, uploadBuffer, FOLDER };
