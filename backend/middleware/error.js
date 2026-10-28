// middleware/error.js — 404 + central error handler.
// Never leaks stack traces or internal messages to clients in production.
const mongoose = require('mongoose');
const multer = require('multer');
const { AppError } = require('../utils');
const env = require('../config/env');

function notFound(req, res) {
  res.status(404).json({ error: 'Route not found.', code: 'NOT_FOUND' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let body = { error: 'Something went wrong on our side. Please try again.', code: 'SERVER_ERROR' };

  if (err instanceof AppError) {
    status = err.status;
    body = { error: err.message, code: err.code || 'ERROR', ...(err.details ? { details: err.details } : {}) };
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    body = { error: details[0]?.message || 'Invalid input.', code: 'VALIDATION_ERROR', details };
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    body = { error: `Invalid ${err.path}.`, code: 'INVALID_ID' };
  } else if (err && err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'value';
    const labels = { email: 'email', phone: 'phone number', cnic: 'CNIC', googleId: 'Google account' };
    body = {
      error: labels[field] ? `An account with this ${labels[field]} already exists.` : 'This record already exists.',
      code: 'DUPLICATE',
      field,
    };
  } else if (err instanceof multer.MulterError) {
    status = 400;
    const map = {
      LIMIT_FILE_SIZE: 'Each photo must be smaller than 8 MB.',
      LIMIT_FILE_COUNT: 'Too many photos — the maximum is 10.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
    };
    body = { error: map[err.code] || 'Upload failed.', code: err.code };
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400;
    body = { error: 'Malformed JSON body.', code: 'BAD_JSON' };
  } else if (err && err.type === 'entity.too.large') {
    status = 413;
    body = { error: 'Request body too large.', code: 'TOO_LARGE' };
  }

  if (status >= 500) {
    console.error('[error]', req.method, req.originalUrl, err);
    if (!env.isProd && err?.message) body.debug = err.message;
  }
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
