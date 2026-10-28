// middleware/rateLimit.js — brute-force & abuse protection.
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const make = (windowMs, limit, error) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { error, code: 'RATE_LIMITED' },
  });

module.exports = {
  apiLimiter: make(15 * 60 * 1000, 600, 'Too many requests. Please slow down.'),
  authLimiter: make(15 * 60 * 1000, 20, 'Too many login attempts. Try again in 15 minutes.'),
  writeLimiter: make(60 * 60 * 1000, 60, 'You are doing that too often. Try again later.'),
  messageLimiter: make(60 * 1000, 30, 'You are sending messages too fast.'),
};
