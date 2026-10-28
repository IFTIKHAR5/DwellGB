// lib/images.js — photos that ship with the website (frontend/public/images).
// Photos: Unsplash (free to use). After adding a new .jpg, run
// `node scripts/optimize-images.js` in backend/ to turn it into a small .webp.

export const SITE_IMAGES = {
  hero: '/images/site/hero.webp',
  auth: '/images/site/auth.webp',
  cta: '/images/site/cta.webp', // Hunza at night — used in "Privacy & trust"
  owner: '/images/site/owner.webp', // closing "List your property" banner
};

// Districts without a photo fall back to a coloured card.
export const DISTRICT_IMAGES = {
  Gilgit: '/images/districts/gilgit.webp',
  Hunza: '/images/districts/hunza.webp',
  Skardu: '/images/districts/skardu.webp',
  Nagar: '/images/districts/nagar.webp',
  Ghanche: '/images/districts/ghanche.webp',
  Astore: '/images/districts/astore.webp',
};
