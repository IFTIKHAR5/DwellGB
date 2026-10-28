// utils/index.js — small shared helpers.

class AppError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Wraps an async route handler so rejected promises reach the error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Normalises a Pakistani mobile number to the canonical "923XXXXXXXXX" form.
 * The old code only stripped non-digits, so "03001234567" and "+923001234567"
 * were treated as two different accounts (this actually happened in rent.json).
 * Returns null if the input is not a valid PK mobile number.
 */
function normalizePhone(input) {
  if (!input) return null;
  let d = String(input).replace(/\D/g, '');
  if (d.startsWith('0092')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('03')) d = '92' + d.slice(1);
  else if (d.length === 10 && d.startsWith('3')) d = '92' + d;
  return /^923\d{9}$/.test(d) ? d : null;
}

function formatPhone(normalized) {
  if (!normalized) return null;
  return `+${normalized.slice(0, 2)} ${normalized.slice(2, 5)} ${normalized.slice(5)}`;
}

/**
 * Normalises a CNIC to 13 digits. "61101-1234567-1" and "6110112345671"
 * are the same person — the old code stored them as two accounts.
 */
function normalizeCnic(input) {
  if (!input) return null;
  const d = String(input).replace(/\D/g, '');
  return d.length === 13 ? d : null;
}

function formatCnic(digits) {
  if (!digits || digits.length !== 13) return null;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function maskCnic(digits) {
  if (!digits || digits.length !== 13) return null;
  return `${digits.slice(0, 5)}-*******-${digits.slice(12)}`;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  AppError, asyncHandler, normalizePhone, formatPhone, normalizeCnic, formatCnic, maskCnic, escapeRegex,
};
