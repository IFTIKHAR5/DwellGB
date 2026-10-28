// routes/users.js — /api/users (public profiles, saved listings, mobile push tokens)
const express = require('express');
const { param } = require('express-validator');
const c = require('../controllers/user.controller');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const idRule = param('id').isMongoId().withMessage('Invalid id.');

router.get('/me/saved', requireAuth, c.saved);
router.post('/me/saved/:id', requireAuth, idRule, validate, c.save);
router.delete('/me/saved/:id', requireAuth, idRule, validate, c.unsave);
router.post('/me/push-token', requireAuth, c.addPushToken);
router.delete('/me/push-token', requireAuth, c.removePushToken);
router.get('/:id', idRule, validate, c.profile);

module.exports = router;
