// routes/reviews.js — /api/reviews (tenants rate owners after an accepted request)
const express = require('express');
const { body, param } = require('express-validator');
const c = require('../controllers/review.controller');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const idRule = param('id').isMongoId().withMessage('Invalid id.');

router.get('/owner/:id', idRule, validate, c.forOwner);
router.get('/reviewable', requireAuth, requireRole('tenant'), c.reviewable);

router.post(
  '/',
  requireAuth,
  requireRole('tenant'),
  writeLimiter,
  [
    body('bookingId').isMongoId().withMessage('Invalid booking.'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5 stars.').toInt(),
    body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment is too long.'),
  ],
  validate,
  c.create,
);

router.post(
  '/:id/reply',
  requireAuth,
  requireRole('owner'),
  [idRule, body('reply').trim().isLength({ min: 1, max: 1000 }).withMessage('Reply must be 1–1000 characters.')],
  validate,
  c.reply,
);

module.exports = router;
