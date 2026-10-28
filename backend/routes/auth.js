// routes/auth.js — /api/auth
const express = require('express');
const { body } = require('express-validator');
const c = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { authLimiter, writeLimiter } = require('../middleware/rateLimit');
const { normalizePhone, normalizeCnic } = require('../utils');

const router = express.Router();

// Owners send their CNIC front, CNIC back and selfie as files.
const identityPhotos = upload.fields([
  { name: 'cnicFront', maxCount: 1 },
  { name: 'cnicBack', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]);

// ---- fields used by several routes below ----

// "0355 1234567", "+92 355 1234567" … are all saved as "923551234567".
const phoneRule = body('phone')
  .optional({ values: 'falsy' })
  .custom((value) => !!normalizePhone(value))
  .withMessage('Enter a valid Pakistani mobile number (e.g. 0355 1234567).')
  .customSanitizer(normalizePhone);

// "71501-1234567-1" and "7150112345671" are saved as 13 digits.
const cnicRule = body('cnic')
  .optional({ values: 'falsy' })
  .custom((value) => !!normalizeCnic(value))
  .withMessage('Enter a valid 13-digit CNIC (e.g. 71501-1234567-1).')
  .customSanitizer(normalizeCnic);

const emailRule = body('email')
  .optional({ values: 'falsy' })
  .trim()
  .toLowerCase()
  .isEmail()
  .withMessage('Enter a valid email address.');

const passwordRule = (field) =>
  body(field)
    .isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter.')
    .matches(/\d/).withMessage('Password must contain a number.');

// ---- routes ----

router.post(
  '/register',
  authLimiter,
  identityPhotos,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Please enter your full name.'),
    body('fatherName').optional().trim().isLength({ max: 80 }),
    body('role').isIn(['owner', 'tenant']).withMessage('Choose owner or tenant.'),
    body('email')
      .custom((email, { req }) => !!(email || req.body.phone))
      .withMessage('Please provide an email or a phone number.'),
    emailRule,
    phoneRule,
    body('cnic').if(body('role').equals('owner')).notEmpty().withMessage('CNIC is required for owner accounts.'),
    cnicRule,
    body('place').optional().trim().isLength({ max: 120 }),
    body('place').if(body('role').equals('owner')).notEmpty().withMessage('Enter where you live, e.g. Jutial, Gilgit.'),
    passwordRule('password'),
  ],
  validate,
  c.register,
);

router.post(
  '/login',
  authLimiter,
  [
    body('identifier').isString().trim().notEmpty().withMessage('Enter your email or phone number.'),
    body('password').isString().notEmpty().withMessage('Enter your password.'),
  ],
  validate,
  c.login,
);

router.post(
  '/google',
  authLimiter,
  [
    body('credential').isString().notEmpty().withMessage('Invalid Google credential.'),
    body('role').optional({ values: 'falsy' }).isIn(['owner', 'tenant']).withMessage('Choose owner or tenant.'),
    cnicRule,
    phoneRule,
    body('place').optional().trim().isLength({ max: 120 }),
  ],
  validate,
  c.google,
);

router.post('/logout', c.logout);

router.get('/me', requireAuth, c.me);

router.put(
  '/me',
  requireAuth,
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters.'),
    body('fatherName').optional().trim().isLength({ max: 80 }),
    body('place').optional().trim().isLength({ max: 120 }),
    body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be at most 500 characters.'),
    phoneRule,
    emailRule,
  ],
  validate,
  c.updateMe,
);

router.put(
  '/me/password',
  requireAuth,
  authLimiter,
  [body('currentPassword').optional().isString(), passwordRule('newPassword')],
  validate,
  c.changePassword,
);

router.post('/me/avatar', requireAuth, writeLimiter, upload.single('avatar'), c.uploadAvatar);
router.post('/me/verification', requireAuth, writeLimiter, identityPhotos, c.submitVerification);

module.exports = router;
