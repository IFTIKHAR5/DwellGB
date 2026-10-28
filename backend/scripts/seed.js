// scripts/seed.js — fills the database with realistic Gilgit-Baltistan demo data.
//
//   npm run seed         (only runs on an EMPTY database)
//   npm run seed:reset   (wipes everything first and reseeds — dev only!)
//
// Demo logins (password for all: Demo1234):
//   owner  → 0355 1234567      owner2 → 0346 7654321
//   tenant → ayesha@demo.pk    tenant2 → 0312 5550000
//   admin  → admin@demo.pk     (DEV ONLY — create real admins with `npm run create-admin`)
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../db');
const M = require('../models');
const fs = require('fs/promises');
const path = require('path');
const { ensureDirs, saveImage, saveDocument, processDocument, UPLOAD_ROOT, PRIVATE_ROOT } = require('../services/storage');

// Real photos for the demo listings (optional). Put them in:
//   scripts/seed-photos/outside/   photos of houses from outside  (used as the cover)
//   scripts/seed-photos/inside/    rooms, kitchens, bathrooms
// Any JPG / PNG / WebP / AVIF file works; names don't matter. Empty folders → drawn scenes.
const PHOTO_DIR = path.join(__dirname, 'seed-photos');
const PHOTO_EXT = /\.(jpe?g|png|webp|avif)$/i;

async function photoFiles(sub) {
  const dir = path.join(PHOTO_DIR, sub);
  const names = await fs.readdir(dir).catch(() => []);
  return names.filter((n) => PHOTO_EXT.test(n)).sort().map((n) => path.join(dir, n));
}

/** Three different photos for listing number i: a cover, then two inside photos. */
function pickPhotos(i, propertyType, outside, inside) {
  const insideFirst = ['single_room', 'apartment'].includes(propertyType);
  const coverFrom = (insideFirst && inside.length) || !outside.length ? inside : outside;
  const picked = [coverFrom[i % coverFrom.length]];
  const rest = inside.length ? inside : outside;
  for (let k = 0; picked.length < 3 && k < rest.length; k++) {
    const file = rest[(i * 2 + k) % rest.length];
    if (!picked.includes(file)) picked.push(file);
  }
  return picked;
}

/** Deletes everything inside a folder except .gitkeep (the folder itself stays). */
async function emptyFolder(dir, { keepFolders = [] } = {}) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.name === '.gitkeep' || keepFolders.includes(e.name)) continue;
    await fs.rm(path.join(dir, e.name), { recursive: true, force: true });
  }
}

const force = process.argv.includes('--force');

// Demo identity documents (clearly marked SAMPLE — never real CNIC images).
function sampleDocSvg(kind, name) {
  const title = { cnicFront: 'CNIC — FRONT', cnicBack: 'CNIC — BACK', selfie: 'SELFIE WITH CNIC' }[kind];
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="630">
  <rect width="1000" height="630" rx="36" fill="${kind === 'selfie' ? '#E8F3F1' : '#E7F0DC'}"/>
  <rect x="40" y="40" width="920" height="550" rx="24" fill="none" stroke="#0F4C4A" stroke-width="6" stroke-dasharray="18 12"/>
  <text x="500" y="250" font-family="Arial" font-size="64" font-weight="700" text-anchor="middle" fill="#0F4C4A">${title}</text>
  <text x="500" y="340" font-family="Arial" font-size="40" text-anchor="middle" fill="#454B57">${name}</text>
  <text x="500" y="440" font-family="Arial" font-size="34" text-anchor="middle" fill="#D1343B">SAMPLE — DEMO DATA</text>
</svg>`);
}

async function addSampleDocuments(user, status) {
  for (const kind of ['cnicFront', 'cnicBack', 'selfie']) {
    user.verification[kind] = await saveDocument(await processDocument(sampleDocSvg(kind, user.name)), user._id, kind);
  }
  user.verification.status = status;
  user.verification.submittedAt = new Date(Date.now() - 2 * 86400000);
  if (status === 'approved') {
    user.verification.reviewedAt = new Date();
    user.isVerified = true;
  }
  await user.save();
}

// Generates a soft, illustrated "photo" (mountains + house) so the demo looks real
// without shipping copyrighted pictures.
function sceneSvg(i) {
  const palettes = [
    ['#FDE7D3', '#F4A261', '#2A6F77', '#1D3D47', '#F6F1EA'],
    ['#DCEFF2', '#8EC5CF', '#3E7C8A', '#23404A', '#FFF7EC'],
    ['#FBE3E8', '#E9A6A6', '#6C5B7B', '#355C7D', '#FFF3E6'],
    ['#E7F0DC', '#A7C584', '#4F772D', '#31572C', '#FFF8E7'],
    ['#FFF1D6', '#F7B267', '#C05746', '#5D2E46', '#FFFDF7'],
  ];
  const [sky, far, mid, near, wall] = palettes[i % palettes.length];
  const peak = 180 + (i * 37) % 120;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
  <rect width="1200" height="800" fill="url(#s)"/>
  <circle cx="${900 - (i * 90) % 500}" cy="150" r="60" fill="#fff" opacity=".8"/>
  <path d="M0 520 L220 ${peak + 140} L380 400 L560 ${peak} L720 420 L900 ${peak + 80} L1200 470 L1200 800 L0 800Z" fill="${far}"/>
  <path d="M${560 - 60} ${peak + 60} L560 ${peak} L${560 + 70} ${peak + 70} L590 ${peak + 50} L540 ${peak + 75}Z" fill="#fff" opacity=".9"/>
  <path d="M0 600 L300 470 L520 560 L760 480 L1000 560 L1200 520 L1200 800 L0 800Z" fill="${mid}"/>
  <path d="M0 700 L400 620 L800 680 L1200 630 L1200 800 L0 800Z" fill="${near}"/>
  <g transform="translate(${420 + (i * 53) % 200} 470)">
    <rect x="0" y="80" width="300" height="190" fill="${wall}"/>
    <path d="M-25 90 L150 -10 L325 90Z" fill="#8C3B2E"/>
    <rect x="120" y="170" width="60" height="100" rx="4" fill="#5B3A29"/>
    <rect x="30" y="130" width="60" height="50" rx="4" fill="#9CC9D6"/>
    <rect x="210" y="130" width="60" height="50" rx="4" fill="#9CC9D6"/>
  </g>
  <g fill="#2F5233">${[80, 160, 1040, 1120].map((x) => `<path d="M${x} 720 l30 -110 l30 110z"/>`).join('')}</g>
</svg>`);
}

const LISTINGS = [
  // Gilgit - Jutial (Proper Jutial Area)
  { title: 'Sunny 3-bed family house in Jutial', district: 'Gilgit', area: 'Jutial', lat: 35.9032, lng: 74.3415, propertyType: 'full_house', rent: 45000, deposit: 90000, bedrooms: 3, bathrooms: 2, furnishing: 'semi_furnished', tenantPreference: 'family', waterSupply: '24_7', heating: 'gas_heater', amenities: ['parking', 'boundary_wall', 'solar_backup', 'mountain_view', 'geyser'], description: 'Bright family home on a quiet street in Jutial, 5 minutes from the main bazaar. Rakaposhi view from the rooftop, solar backup for load-shedding and a gas heater in every room for winter.' },
  
  // Gilgit - Konodas (Exact KIU Campus surroundings)
  { title: 'Upper portion near KIU — ideal for faculty', district: 'Gilgit', area: 'Konodas', lat: 35.9315, lng: 74.3228, propertyType: 'upper_portion', rent: 28000, deposit: 50000, bedrooms: 2, bathrooms: 1, furnishing: 'furnished', tenantPreference: 'family', waterSupply: 'few_hours', heating: 'bukhari', amenities: ['separate_entrance', 'near_university', 'internet', 'ups_backup'], description: 'Fully furnished upper portion with separate entrance, walking distance from Karakoram International University. Water tank on the roof, bukhari for winters.' },
  
  // Gilgit - Kashrote (Main Kashrote Area)
  { title: 'Single room for students in Kashrote', district: 'Gilgit', area: 'Kashrote', lat: 35.9220, lng: 74.3125, propertyType: 'single_room', rent: 9000, deposit: 9000, bedrooms: 1, bathrooms: 1, furnishing: 'furnished', tenantPreference: 'students', waterSupply: '24_7', heating: 'electric', amenities: ['internet', 'near_market', 'geyser'], description: 'Clean, furnished room with attached bath. Wi-Fi included. Suitable for a student or working bachelor.' },
  
  // Gilgit - Danyore (Across the river)
  { title: 'Lower portion with garden in Danyore', district: 'Gilgit', area: 'Danyore', lat: 35.9285, lng: 74.3755, propertyType: 'lower_portion', rent: 22000, deposit: 40000, bedrooms: 2, bathrooms: 2, furnishing: 'unfurnished', tenantPreference: 'family', waterSupply: 'spring_channel', heating: 'bukhari', amenities: ['garden', 'boundary_wall', 'parking', 'mountain_view'], description: 'Spacious ground floor portion with a private apricot garden, 10 minutes from Gilgit city across the Danyore bridge.' },
  
  // Hunza - Karimabad (Near Baltit Fort)
  { title: 'Modern apartment in Karimabad with Rakaposhi view', district: 'Hunza', area: 'Karimabad', lat: 36.3215, lng: 74.6695, propertyType: 'apartment', rent: 60000, deposit: 120000, bedrooms: 2, bathrooms: 2, furnishing: 'furnished', tenantPreference: 'any', waterSupply: '24_7', heating: 'central', amenities: ['mountain_view', 'internet', 'solar_backup', 'parking', 'geyser'], description: 'Newly built apartment below Baltit Fort with panoramic views of Rakaposhi and Ultar. Perfect for remote workers — fibre internet and solar backup.' },
  
  // Hunza - Aliabad (On KKH)
  { title: 'Traditional Hunza house in Aliabad', district: 'Hunza', area: 'Aliabad', lat: 36.3085, lng: 74.6155, propertyType: 'full_house', rent: 38000, deposit: 60000, bedrooms: 4, bathrooms: 2, furnishing: 'semi_furnished', tenantPreference: 'family', waterSupply: 'spring_channel', heating: 'bukhari', amenities: ['garden', 'boundary_wall', 'near_main_road', 'near_hospital'], description: 'Four-room family house on the KKH in Aliabad, near the hospital and market. Orchard with cherry and apricot trees.' },
  
  // Hunza - Gulmit (Near Attabad Lake side)
  { title: 'Lower portion in Gulmit near Attabad Lake', district: 'Hunza', area: 'Gulmit', lat: 36.3765, lng: 74.8615, propertyType: 'lower_portion', rent: 20000, deposit: 30000, bedrooms: 2, bathrooms: 1, furnishing: 'semi_furnished', tenantPreference: 'family', waterSupply: '24_7', heating: 'bukhari', amenities: ['mountain_view', 'internet', 'boundary_wall'], description: 'Two-room lower portion in Gulmit village, close to the school and Attabad Lake. Yearly lease preferred.' },
  
  // Skardu - Naya Bazaar (Main City Center)
  { title: '3-bed house near Skardu bazaar', district: 'Skardu', area: 'Naya Bazaar', lat: 35.2975, lng: 75.6335, propertyType: 'full_house', rent: 40000, deposit: 80000, bedrooms: 3, bathrooms: 2, furnishing: 'unfurnished', tenantPreference: 'family', waterSupply: 'few_hours', heating: 'gas_heater', amenities: ['parking', 'near_market', 'boundary_wall', 'generator'], description: 'Family house in the heart of Skardu, walking distance to Naya Bazaar, schools and the DHQ hospital.' },
  
  // Skardu - Satpara Road
  { title: 'Apartment on Satpara Road', district: 'Skardu', area: 'Satpara Road', lat: 35.2855, lng: 75.6315, propertyType: 'apartment', rent: 32000, deposit: 50000, bedrooms: 2, bathrooms: 1, furnishing: 'semi_furnished', tenantPreference: 'working_women', waterSupply: '24_7', heating: 'electric', amenities: ['cctv', 'separate_entrance', 'internet'], description: 'Secure apartment with CCTV and separate entrance, preferred for working women or small families.' },
  
  // Ghizer - Gahkuch (Main Area)
  { title: 'Upper portion in Gahkuch with river view', district: 'Ghizer', area: 'Gahkuch', lat: 36.1755, lng: 73.7655, propertyType: 'upper_portion', rent: 18000, deposit: 30000, bedrooms: 2, bathrooms: 1, furnishing: 'unfurnished', tenantPreference: 'any', waterSupply: 'spring_channel', heating: 'bukhari', amenities: ['mountain_view', 'near_main_road'], description: 'Peaceful upper portion overlooking the Ghizer river, close to the district offices.' },
  
  // Ghanche - Khaplu (Near Khaplu Palace)
  { title: 'Family house in Khaplu near the palace', district: 'Ghanche', area: 'Khaplu', lat: 35.1435, lng: 76.3335, propertyType: 'full_house', rent: 30000, deposit: 45000, bedrooms: 3, bathrooms: 2, furnishing: 'semi_furnished', tenantPreference: 'family', waterSupply: 'spring_channel', heating: 'bukhari', amenities: ['garden', 'mountain_view', 'boundary_wall'], description: 'Stone-and-wood house with a big garden, a short walk from Khaplu Palace.' },
  
  // Astore - Eidgah (Near DHQ)
  { title: 'Room for doctors near Astore DHQ', district: 'Astore', area: 'Eidgah', lat: 35.3675, lng: 74.8565, propertyType: 'single_room', rent: 10000, deposit: 10000, bedrooms: 1, bathrooms: 1, furnishing: 'furnished', tenantPreference: 'bachelors', waterSupply: '24_7', heating: 'electric', amenities: ['near_hospital', 'geyser'], description: 'Furnished room next to the DHQ hospital, quiet and clean — ideal for medical staff on posting.' },
];

async function run() {
  await connectDB(env.MONGODB_URI);
  await ensureDirs();

  const existing = await M.User.countDocuments();
  if (existing && !force) {
    console.log('Database already has data. Run `npm run seed:reset` to wipe it and reseed (dev only).');
    return;
  }
  if (force) {
    if (env.isProd) throw new Error('Refusing to wipe a production database.');
    await Promise.all(Object.values(M).map((Model) => Model.deleteMany({})));
    // Collections from older versions of DwellGB that are no longer used.
    for (const old of ['refreshtokens', 'adminactions']) {
      await M.User.db.dropCollection(old).catch(() => {});
    }
    // Old photos would otherwise pile up on disk: listing photos, profile photos,
    // leftovers from the first version, and the private ID photos.
    await emptyFolder(path.join(UPLOAD_ROOT, 'listings'));
    await emptyFolder(path.join(UPLOAD_ROOT, 'avatars'));
    await emptyFolder(UPLOAD_ROOT, { keepFolders: ['listings', 'avatars'] });
    await emptyFolder(PRIVATE_ROOT);
    console.log('Cleared existing data and uploaded files');
  }

  const mk = async (data) => {
    const u = new M.User({ authProviders: ['password'], ...data });
    await u.setPassword('Demo1234');
    return u.save();
  };
  const owner = await mk({ name: 'Karim Khan', fatherName: 'Sher Khan', phone: '923551234567', cnic: '7150112345671', place: 'Jutial, Gilgit', role: 'owner', bio: 'Retired teacher renting out family properties in Gilgit and Hunza.' });
  const owner2 = await mk({ name: 'Fatima Hussain', fatherName: 'Ali Hussain', phone: '923467654321', cnic: '7160198765432', place: 'Skardu', role: 'owner', bio: 'Property owner in Baltistan.' });
  const tenant = await mk({ name: 'Ayesha Baig', email: 'ayesha@demo.pk', place: 'Aliabad, Hunza', role: 'tenant' });
  const tenant2 = await mk({ name: 'Imran Shah', phone: '923125550000', place: 'Nagar', role: 'tenant' });
  await mk({ name: 'DwellGB Admin', email: 'admin@demo.pk', role: 'admin', isVerified: true });
  // Identity documents: two approved owners, one waiting in the admin queue.
  await addSampleDocuments(owner, 'approved');
  await addSampleDocuments(owner2, 'approved');
  const pendingOwner = await mk({ name: 'Nadia Karim', fatherName: 'Karim Baig', phone: '923401112233', cnic: '7150155555551', place: 'Aliabad, Hunza', role: 'owner' });
  await addSampleDocuments(pendingOwner, 'pending');

  const outside = await photoFiles('outside');
  const inside = await photoFiles('inside');
  const usePhotos = outside.length + inside.length > 0;
  console.log(usePhotos
    ? `Using ${outside.length} outside + ${inside.length} inside photos from scripts/seed-photos`
    : 'No photos in scripts/seed-photos — using drawn placeholder scenes');

  const listings = [];
  for (let i = 0; i < LISTINGS.length; i++) {
    const { lat, lng, ...rest } = LISTINGS[i];
    const images = [];
    if (usePhotos) {
      for (const file of pickPhotos(i, rest.propertyType, outside, inside)) images.push(await saveImage(await fs.readFile(file), 'listing'));
    } else {
      for (let k = 0; k < 3; k++) images.push(await saveImage(sceneSvg(i + k), 'listing'));
    }
    const ownerDoc = ['Skardu', 'Ghanche', 'Astore'].includes(rest.district) ? owner2 : owner;
    listings.push(
      await M.Listing.create({
        ...rest,
        owner: ownerDoc._id,
        ownerApproved: true,
        geo: { type: 'Point', coordinates: [lng, lat] },
        images,
        kitchens: 1,
        availableFrom: new Date(Date.now() + ((i % 4) * 7) * 86400000),
        minStayMonths: rest.propertyType === 'single_room' ? 3 : 12,
        views: 20 + ((i * 37) % 180),
      }),
    );
  }

  // A realistic flow: an accepted booking with a review and a chat, plus a pending one.
  const accepted = await M.Booking.create({ listing: listings[5]._id, tenant: tenant._id, owner: owner._id, message: 'Assalam o Alaikum, we are a family of four moving to Aliabad.', occupants: 4, status: 'accepted', respondedAt: new Date() });
  await M.Listing.updateOne({ _id: listings[5]._id }, { status: 'rented' });
  await M.Review.create({ booking: accepted._id, listing: listings[5]._id, owner: owner._id, tenant: tenant._id, rating: 5, comment: 'Very kind owner, the house was exactly as shown. Highly recommended!' });
  await M.Review.recalculateOwner(owner._id);
  await M.Booking.create({ listing: listings[0]._id, tenant: tenant2._id, owner: owner._id, message: 'Is the house available from next month?', occupants: 3, status: 'pending' });

  const convo = await M.Conversation.create({ listing: listings[0]._id, tenant: tenant2._id, owner: owner._id });
  const msgs = [
    [tenant2, 'Assalam o Alaikum! Is gas available in winter at this house?'],
    [owner, 'Walaikum Assalam. Yes, Sui gas line plus a heater in each room. Solar backup too.'],
    [tenant2, 'Great. Can I visit on Saturday afternoon?'],
  ];
  let last;
  for (const [who, text] of msgs) last = await M.Message.create({ conversation: convo._id, sender: who._id, text });
  convo.lastMessage = { text: last.text, sender: last.sender, at: last.createdAt };
  convo.ownerUnread = 1;
  await convo.save();

  await M.Notification.create({ user: owner._id, type: 'booking_request', title: 'New rental request', body: `${tenant2.name} wants to rent "${listings[0].title}".`, link: '/dashboard/requests', data: { listingTitle: listings[0].title, fromName: tenant2.name } });

  // A report waiting in the admin queue.
  await M.Report.create({ reporter: tenant2._id, targetType: 'listing', listing: listings[8]._id, reason: 'wrong_info', details: 'The photos look different from the actual building.' });

  console.log(`\nSeeded ${listings.length} listings, 4 users, bookings, a review and a chat.`);
  console.log('   Password for every demo account: Demo1234');
  console.log('   owner:  0355 1234567   |  tenant: ayesha@demo.pk   |  admin: admin@demo.pk\n');
}

run()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB().catch(() => {}));
