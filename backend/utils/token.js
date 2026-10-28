// utils/token.js — one JWT per login, stored in an httpOnly cookie.
// httpOnly = JavaScript in the browser can't read it, so XSS can't steal it.
// The mobile app has no cookies, so it sends the same JWT as "Authorization: Bearer <token>".
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE_NAME = 'token';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  secure: env.isProd, // HTTPS only in production
  sameSite: 'lax', // not sent on cross-site POSTs (CSRF protection)
  maxAge: SEVEN_DAYS,
};

function createToken(user) {
  return jwt.sign({ id: String(user._id), role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function setTokenCookie(res, user) {
  res.cookie(COOKIE_NAME, createToken(user), cookieOptions);
}

function clearTokenCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
}

/** True when the request comes from the DwellGB mobile app (it sends this header on every call). */
function isMobileApp(req) {
  return req.get('X-DwellGB-App') === 'mobile';
}

/** The JWT from the "Authorization: Bearer ..." header, or null. */
function tokenFromAuthHeader(header = '') {
  const match = /^Bearer\s+(\S+)$/i.exec(header || '');
  return match ? match[1] : null;
}

/** The JWT of a request: the website's cookie first, then the mobile app's header. */
function tokenFromRequest(req) {
  return req.cookies?.[COOKIE_NAME] || tokenFromAuthHeader(req.get('Authorization'));
}

/** Reads our cookie from a raw "Cookie" header (used by Socket.IO). */
function tokenFromCookieHeader(header = '') {
  const pair = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return pair ? decodeURIComponent(pair.slice(COOKIE_NAME.length + 1)) : null;
}

module.exports = {
  COOKIE_NAME, createToken, verifyToken, setTokenCookie, clearTokenCookie,
  tokenFromCookieHeader, tokenFromAuthHeader, tokenFromRequest, isMobileApp,
};
