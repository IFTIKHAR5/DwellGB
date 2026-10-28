const express = require('express');
const rateLimit = require('express-rate-limit');
const { handleChat } = require('../controllers/chatbotController.js');

const router = express.Router();

// Each visitor can send 20 messages every 10 minutes.
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many messages. Please wait a few minutes and try again.' },
});

router.post('/', chatLimiter, handleChat);

module.exports = router;