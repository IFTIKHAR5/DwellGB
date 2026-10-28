// routes/conversations.js — /api/conversations (chat)
const express = require('express');
const { body, param, query } = require('express-validator');
const c = require('../controllers/conversation.controller');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const idRule = param('id').isMongoId().withMessage('Invalid id.');
const textRule = body('text').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Message cannot be empty (max 2000 characters).');

router.use(requireAuth);

router.get('/', c.list);
router.get('/unread-count', c.unreadCount);

// Start (or reopen) a chat about a listing.
router.post(
  '/',
  messageLimiter,
  [
    body('listingId').isMongoId().withMessage('Invalid listing.'),
    body('tenantId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid tenant.'),
    body('text').optional({ values: 'falsy' }).isString().trim().isLength({ max: 2000 }).withMessage('Message is too long.'),
  ],
  validate,
  c.start,
);

router.get('/:id', idRule, validate, c.getOne);

router.get(
  '/:id/messages',
  [
    idRule,
    query('before').optional({ values: 'falsy' }).isISO8601().toDate(),
    query('limit').default(30).isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  c.messages,
);

router.post('/:id/messages', messageLimiter, [idRule, textRule], validate, c.send);
router.post('/:id/read', idRule, validate, c.markRead);

module.exports = router;
