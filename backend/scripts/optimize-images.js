// scripts/optimize-images.js — turns the website photos into small WebP files.
//
//   cd backend
//   node scripts/optimize-images.js
//
// Every .jpg/.jpeg/.png in frontend/public/images becomes a .webp with the same
// name (max 1920px wide, about 150–300 KB). The original file is moved to
// frontend/image-originals so it is kept but no longer shipped with the website.
// Safe to run again: files that are already .webp are left alone.
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const IMAGES = path.join(__dirname, '..', '..', 'frontend', 'public', 'images');
const ORIGINALS = path.join(__dirname, '..', '..', 'frontend', 'image-originals');

async function findPhotos(dir) {
  const found = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await findPhotos(full)));
    else if (/\.(jpe?g|png)$/i.test(entry.name)) found.push(full);
  }
  return found;
}

async function run() {
  const photos = await findPhotos(IMAGES);
  if (!photos.length) return console.log('No .jpg/.png photos found — nothing to do.');

  for (const file of photos) {
    const name = path.relative(IMAGES, file);
    const webp = file.replace(/\.(jpe?g|png)$/i, '.webp');
    const before = (await fs.stat(file)).size;

    await sharp(file)
      .rotate() // respect the phone's orientation
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(webp);
    const after = (await fs.stat(webp)).size;

    // Keep the original outside public/ so it isn't part of the website.
    const backup = path.join(ORIGINALS, name);
    await fs.mkdir(path.dirname(backup), { recursive: true });
    await fs.rename(file, backup);

    console.log(`  ${name}  ${(before / 1024 / 1024).toFixed(1)} MB → ${path.basename(webp)} ${(after / 1024).toFixed(0)} KB`);
  }
  console.log('\nDone. Originals moved to frontend/image-originals');
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
