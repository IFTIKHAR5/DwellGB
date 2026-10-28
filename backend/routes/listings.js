// routes/listings.js — /api/listings
const express = require('express');
const { body, query, param } = require('express-validator');
const c = require('../controllers/listing.controller');
const C = require('../config/constants');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const ownerOnly = [requireAuth, requireRole('owner')];
const idRule = param('id').isMongoId().withMessage('Invalid id.');
const [MIN_LNG, MIN_LAT, MAX_LNG, MAX_LAT] = C.GB_BBOX;

// Forms send lists as "a,b,c" or '["a","b"]' (multipart can't send real arrays).
function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
  }
}

// Rules for creating a listing. For editing, every field becomes optional.
function listingRules(isCreate) {
  const field = (name) => (isCreate ? body(name) : body(name).optional());
  return [
    field('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be 5–100 characters.'),
    body('description').optional().trim().isLength({ max: 3000 }).withMessage('Description is too long.'),
    field('district').isIn(C.DISTRICTS).withMessage('Choose a district in Gilgit-Baltistan.'),
    field('area').trim().isLength({ min: 2, max: 80 }).withMessage('Enter the area/mohalla, e.g. Jutial.'),
    body('address').optional().trim().isLength({ max: 200 }),
    field('propertyType').isIn(C.PROPERTY_TYPES).withMessage('Choose a property type.'),
    field('rent').isInt({ min: 500, max: 5_000_000 }).withMessage('Enter a monthly rent of at least Rs 500.').toInt(),
    body('deposit').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Enter a valid deposit.').toInt(),
    body('utilitiesIncluded').optional({ values: 'falsy' }).isBoolean().toBoolean(),
    body('bedrooms').optional({ values: 'falsy' }).isInt({ min: 0, max: 30 }).toInt(),
    body('bathrooms').optional({ values: 'falsy' }).isInt({ min: 0, max: 30 }).toInt(),
    body('kitchens').optional({ values: 'falsy' }).isInt({ min: 0, max: 10 }).toInt(),
    body('floorAreaSqft').optional({ values: 'falsy' }).isInt({ min: 0 }).toInt(),
    body('furnishing').optional({ values: 'falsy' }).isIn(C.FURNISHING),
    body('tenantPreference').optional({ values: 'falsy' }).isIn(C.TENANT_PREFERENCES),
    body('waterSupply').optional({ values: 'falsy' }).isIn(C.WATER_SUPPLY),
    body('heating').optional({ values: 'falsy' }).isIn(C.HEATING),
    body('amenities')
      .optional()
      .customSanitizer(toArray)
      .custom((list) => list.every((item) => C.AMENITIES.includes(item)))
      .withMessage('Unknown amenity.'),
    body('availableFrom').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date.').toDate(),
    body('minStayMonths')
      .optional({ values: 'falsy' })
      .isInt({ min: C.MIN_LEASE_MONTHS, max: C.MAX_LEASE_MONTHS })
      .withMessage(`Minimum stay must be ${C.MIN_LEASE_MONTHS}–${C.MAX_LEASE_MONTHS} months — DwellGB is for monthly rentals.`)
      .toInt(),
    // Map pin: both or neither.
    body('lat')
      .optional({ values: 'falsy' })
      .isFloat({ min: MIN_LAT, max: MAX_LAT })
      .withMessage('The location must be inside Gilgit-Baltistan.')
      .toFloat(),
    body('lng')
      .optional({ values: 'falsy' })
      .isFloat({ min: MIN_LNG, max: MAX_LNG })
      .withMessage('The location must be inside Gilgit-Baltistan.')
      .toFloat(),
  ];
}

const searchRules = [
  query('q').optional().isString().trim().isLength({ max: 100 }),
  query('district').optional({ values: 'falsy' }).isIn(C.DISTRICTS),
  query('area').optional().isString().trim().isLength({ max: 80 }),
  query('propertyType').optional({ values: 'falsy' }).customSanitizer(toArray),
  query('minRent').optional({ values: 'falsy' }).isInt({ min: 0 }).toInt(),
  query('maxRent').optional({ values: 'falsy' }).isInt({ min: 0 }).toInt(),
  query('bedrooms').optional({ values: 'falsy' }).isInt({ min: 0 }).toInt(),
  query('bathrooms').optional({ values: 'falsy' }).isInt({ min: 0 }).toInt(),
  query('furnishing').optional({ values: 'falsy' }).isIn(C.FURNISHING),
  query('tenantPreference').optional({ values: 'falsy' }).isIn(C.TENANT_PREFERENCES),
  query('heating').optional({ values: 'falsy' }).isIn(C.HEATING),
  query('amenities').optional({ values: 'falsy' }).customSanitizer(toArray),
  query('includeRented').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('bbox')
    .optional({ values: 'falsy' })
    .customSanitizer((value) => {
      const [w, s, e, n] = String(value).split(',').map(Number);
      // A zoomed-out map can report edges past ±180 / ±90 — clamp them so MongoDB accepts the box.
      const lng = (x) => Math.max(-180, Math.min(180, x));
      const lat = (y) => Math.max(-90, Math.min(90, y));
      return [lng(w), lat(s), lng(e), lat(n)];
    })
    .custom(([w, s, e, n]) => [w, s, e, n].every(Number.isFinite) && w < e && s < n)
    .withMessage('bbox must be minLng,minLat,maxLng,maxLat'),
  query('sort').default('newest').isIn(['newest', 'price_asc', 'price_desc', 'popular', 'relevance']),
  query('page').default(1).isInt({ min: 1 }).toInt(),
  query('limit').default(12).isInt({ min: 1, max: 100 }).toInt(),
];

// ---- public ----
router.get('/', optionalAuth, searchRules, validate, c.search);
router.get('/stats', c.publicStats);
router.get('/facets', searchRules, validate, c.facets);

// ---- owner dashboard ----
router.get('/mine', ownerOnly, c.mine);
router.get('/mine/stats', ownerOnly, c.ownerStats);

router.get('/:id', idRule, validate, optionalAuth, c.getOne);
router.get('/:id/similar', idRule, validate, optionalAuth, c.similar);

router.post('/', ownerOnly, writeLimiter, upload.array('images', 10), listingRules(true), validate, c.create);

router.put(
  '/:id',
  ownerOnly,
  upload.array('images', 10),
  [
    idRule,
    ...listingRules(false),
    body('status').optional({ values: 'falsy' }).isIn(C.OWNER_LISTING_STATUS).withMessage('Invalid status.'),
    body('removeImages').optional().customSanitizer(toArray),
    body('imageOrder').optional().customSanitizer(toArray),
  ],
  validate,
  c.update,
);

router.patch(
  '/:id/status',
  ownerOnly,
  [idRule, body('status').isIn(C.OWNER_LISTING_STATUS).withMessage('Invalid status.')],
  validate,
  c.setStatus,
);

router.delete('/:id', ownerOnly, idRule, validate, c.remove);

module.exports = router;
