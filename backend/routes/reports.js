// routes/reports.js — /api/reports (any logged-in user can report a listing or a user)
const express = require('express');
const { body } = require('express-validator');
const c = require('../controllers/report.controller');
const { REPORT_TARGETS, REPORT_REASONS } = require('../config/constants');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  writeLimiter,
  [
    body('targetType').isIn(REPORT_TARGETS).withMessage('Invalid report type.'),
    body('targetId').isMongoId().withMessage('Invalid id.'),
    body('reason').isIn(REPORT_REASONS).withMessage('Choose a reason.'),
    body('details')
      .default('')
      .trim()
      .isLength({ max: 1000 })
      .custom((details, { req }) => req.body.reason !== 'other' || details.length >= 5)
      .withMessage('Please describe the problem.'),
  ],
  validate,
  c.create,
);

module.exports = router;
