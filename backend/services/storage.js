// services/storage.js — image processing + local disk storage.
//
// Every upload is decoded and RE-ENCODED with sharp. This:
//   • rejects anything that isn't really an image (the old code only checked the
//     file extension, so "virus.exe" renamed to "virus.jpg" was accepted),
//   • strips EXIF metadata — including the GPS location phones embed in photos,
//   • auto-rotates, resizes and converts to WebP (typically 5–10× smaller).
//
// To move to Cloudinary/S3 later, only this file needs to change.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { AppError } = require('../utils');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
// Identity documents live OUTSIDE the public uploads folder — Express never serves
// this folder; admins view the files through an authenticated API route only.
const PRIVATE_ROOT = path.join(__dirname, '..', 'private', 'verification');

// quality: WebP quality (0–100). 88 keeps photos crisp; files stay far smaller than JPEG.
// smartSubsample keeps colour edges sharp (e.g. window frames, text on signs).
// effort: how hard sharp works to compress (0–6). 5 = smaller files at the same quality.
const PRESETS = {
  listing: { folder: 'listings', width: 2048, height: 2048, fit: 'inside', quality: 88 },
  avatar: { folder: 'avatars', width: 512, height: 512, fit: 'cover', quality: 88 },
};

async function ensureDirs() {
  for (const p of Object.values(PRESETS)) {
    await fs.mkdir(path.join(UPLOAD_ROOT, p.folder), { recursive: true });
  }
  await fs.mkdir(PRIVATE_ROOT, { recursive: true });
}

async function saveImage(buffer, presetName) {
  const preset = PRESETS[presetName];
  let out;
  try {
    out = await sharp(buffer, { failOn: 'error', limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: preset.width, height: preset.height, fit: preset.fit, withoutEnlargement: true })
      .webp({ quality: preset.quality, smartSubsample: true, effort: 5 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new AppError(400, 'One of the files is not a valid image.', 'INVALID_IMAGE');
  }
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;
  await fs.writeFile(path.join(UPLOAD_ROOT, preset.folder, name), out.data);
  return { url: `/uploads/${preset.folder}/${name}`, width: out.info.width, height: out.info.height };
}

/** Deletes a previously saved file. Refuses anything outside the uploads folder. */
async function removeFile(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('/uploads/')) return;
  const resolved = path.resolve(UPLOAD_ROOT, '.' + url.slice('/uploads'.length));
  if (!resolved.startsWith(UPLOAD_ROOT + path.sep)) return;
  await fs.unlink(resolved).catch(() => {});
}

// ---------------------------------------------------------------- private documents

/** Converts an uploaded photo to a clean WebP buffer (larger, sharper than listing photos so a CNIC stays readable). */
async function processDocument(buffer) {
  try {
    return await sharp(buffer, { failOn: 'error', limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
  } catch {
    throw new AppError(400, 'One of the photos is not a valid image. Please take it again.', 'INVALID_IMAGE');
  }
}

/** Saves a processed document for a user. Returns the private key, e.g. "<userId>/cnicFront-ab12.webp". */
async function saveDocument(processed, userId, kind) {
  const dir = path.join(PRIVATE_ROOT, String(userId));
  await fs.mkdir(dir, { recursive: true });
  const name = `${kind}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
  await fs.writeFile(path.join(dir, name), processed);
  return `${userId}/${name}`;
}

/** Absolute path of a private document, or null if the key is invalid. */
function documentPath(key) {
  if (!key || typeof key !== 'string') return null;
  const resolved = path.resolve(PRIVATE_ROOT, key);
  return resolved.startsWith(PRIVATE_ROOT + path.sep) ? resolved : null;
}

async function removeDocument(key) {
  const p = documentPath(key);
  if (p) await fs.unlink(p).catch(() => {});
}

module.exports = {
  UPLOAD_ROOT, PRIVATE_ROOT, ensureDirs, saveImage, removeFile,
  processDocument, saveDocument, documentPath, removeDocument,
};
