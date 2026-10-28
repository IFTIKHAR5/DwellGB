// routes/notifications.js — /api/notifications
const express = require('express');
const { param, query } = require('express-validator');
const c = require('../controllers/notification.controller');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const idRule = param('id').isMongoId().withMessage('Invalid id.');

router.use(requireAuth);

router.get(
  '/',
  [
    query('before').optional({ values: 'falsy' }).isISO8601().toDate(),
    query('limit').default(20).isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  c.list,
);
router.get('/unread-count', c.count);
router.patch('/read-all', c.markAllRead);
router.patch('/:id/read', idRule, validate, c.markRead);
router.delete('/:id', idRule, validate, c.remove);

module.exports = router;
