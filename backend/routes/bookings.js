// routes/bookings.js — /api/bookings (rental requests)
const express = require('express');
const { body, param } = require('express-validator');
const c = require('../controllers/booking.controller');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const idRule = param('id').isMongoId().withMessage('Invalid id.');

router.use(requireAuth);

// Tenant asks to rent a listing.
router.post(
  '/',
  requireRole('tenant'),
  writeLimiter,
  [
    body('listingId').isMongoId().withMessage('Invalid listing.'),
    body('message').optional().trim().isLength({ max: 1000 }).withMessage('Message is too long.'),
    body('moveInDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid move-in date.').toDate(),
    body('occupants').optional({ values: 'falsy' }).isInt({ min: 1, max: 30 }).withMessage('Occupants must be 1–30.').toInt(),
  ],
  validate,
  c.create,
);

router.get('/mine', requireRole('tenant'), c.mine);
router.get('/received', requireRole('owner'), c.received);

// Owner accepts or rejects.
router.patch(
  '/:id/status',
  requireRole('owner'),
  [
    idRule,
    body('status').isIn(['accepted', 'rejected']).withMessage("Status must be 'accepted' or 'rejected'."),
    body('note').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  c.respond,
);

// Tenant withdraws a pending request.
router.patch('/:id/cancel', requireRole('tenant'), idRule, validate, c.cancel);

module.exports = router;
