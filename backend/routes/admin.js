// routes/admin.js — /api/admin (admin accounts only)
const express = require('express');
const { body, param, query } = require('express-validator');
const c = require('../controllers/admin.controller');
const C = require('../config/constants');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const idRule = param('id').isMongoId().withMessage('Invalid id.');
const pageRules = [
  query('page').default(1).isInt({ min: 1 }).toInt(),
  query('limit').default(20).isInt({ min: 1, max: 100 }).toInt(),
];
// A reason is required for some actions (e.g. ban, reject, remove).
const reasonRequiredFor = (action, message) =>
  body('reason')
    .default('')
    .trim()
    .isLength({ max: 500 })
    .custom((reason, { req }) => req.body.action !== action || reason.length >= 3)
    .withMessage(message);

router.use(requireAuth, requireRole('admin'));

router.get('/stats', c.stats);

// ---- users ----
router.get(
  '/users',
  [
    query('q').optional().trim(),
    query('role').optional({ values: 'falsy' }).isIn(['owner', 'tenant', 'admin']),
    query('status').optional({ values: 'falsy' }).isIn(['active', 'banned']),
    query('verified').optional({ values: 'falsy' }).isBoolean().toBoolean(),
    query('sort').default('newest').isIn(['newest', 'oldest', 'name']),
    ...pageRules,
  ],
  validate,
  c.users,
);
router.get('/users/:id', idRule, validate, c.user);
router.post('/users/:id/cnic', idRule, validate, c.revealCnic);
router.patch(
  '/users/:id',
  [
    idRule,
    body('action').isIn(['ban', 'unban']).withMessage('Invalid action.'),
    reasonRequiredFor('ban', 'Give a reason for the ban.'),
  ],
  validate,
  c.updateUser,
);

// ---- identity checks (CNIC + selfie) ----
router.get(
  '/verifications',
  [query('status').optional({ values: 'falsy' }).isIn(C.VERIFICATION_STATUS), ...pageRules],
  validate,
  c.verifications,
);
router.get('/users/:id/documents/:kind', idRule, validate, c.document);
router.patch(
  '/users/:id/verification',
  [
    idRule,
    body('action').isIn(['approve', 'reject']).withMessage('Invalid action.'),
    reasonRequiredFor('reject', 'Tell the owner what to fix (e.g. the CNIC photo is blurry).'),
  ],
  validate,
  c.reviewVerification,
);

// ---- listings ----
router.get(
  '/listings',
  [
    query('q').optional().trim(),
    query('status').optional({ values: 'falsy' }).isIn(C.LISTING_STATUS),
    query('district').optional({ values: 'falsy' }).isIn(C.DISTRICTS),
    query('reported').optional({ values: 'falsy' }).isBoolean().toBoolean(),
    query('owner').optional({ values: 'falsy' }).isMongoId(),
    ...pageRules,
  ],
  validate,
  c.listings,
);
router.patch(
  '/listings/:id',
  [
    idRule,
    body('action').isIn(['remove', 'restore']).withMessage('Invalid action.'),
    reasonRequiredFor('remove', 'Tell the owner why the listing is removed.'),
  ],
  validate,
  c.moderateListing,
);
router.delete('/listings/:id', idRule, validate, c.deleteListing);

// ---- reports ----
router.get(
  '/reports',
  [
    query('status').optional({ values: 'falsy' }).isIn(C.REPORT_STATUS),
    query('targetType').optional({ values: 'falsy' }).isIn(C.REPORT_TARGETS),
    ...pageRules,
  ],
  validate,
  c.reports,
);
router.patch(
  '/reports/:id',
  [
    idRule,
    body('status').isIn(['resolved', 'dismissed']).withMessage('Invalid status.'),
    body('resolution').optional().trim().isLength({ max: 500 }),
    body('enforce').default('none').isIn(['none', 'remove_listing', 'ban_user']).withMessage('Invalid action.'),
  ],
  validate,
  c.updateReport,
);

// ---- announcement to all users ----
router.post(
  '/broadcast',
  [
    body('title').trim().isLength({ min: 3, max: 140 }).withMessage('Title must be 3–140 characters.'),
    body('body').optional().trim().isLength({ max: 400 }),
    body('link')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^\/[^/\\]/)
      .withMessage('Link must be a path on this site, e.g. /listings'),
    body('audience').isIn(['all', 'owners', 'tenants']).withMessage('Choose an audience.'),
  ],
  validate,
  c.broadcast,
);

module.exports = router;
