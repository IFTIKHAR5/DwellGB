// middleware/auth.js — reads the JWT (website cookie or mobile app Bearer header) and loads the user.
const { User } = require('../models');
const { verifyToken, tokenFromRequest } = require('../utils/token');
const { AppError } = require('../utils');

/**
 * Turns a token into { id, role, name, avatar }.
 * The user is re-loaded from the database, so a banned or deleted account
 * is locked out immediately even though its token hasn't expired yet.
 */
async function getUserFromToken(token) {
  if (!token) throw new AppError(401, 'Please log in to continue.', 'NOT_LOGGED_IN');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError(401, 'Your session has expired. Please log in again.', 'SESSION_EXPIRED');
  }

  const user = await User.findById(payload.id).select('role isActive name avatar');
  if (!user || !user.isActive) throw new AppError(401, 'Account not found or disabled.', 'ACCOUNT_INACTIVE');
  return { id: String(user._id), role: user.role, name: user.name, avatar: user.avatar };
}

async function requireAuth(req, res, next) {
  try {
    req.user = await getUserFromToken(tokenFromRequest(req));
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError(403, `Only ${roles.join(' or ')} accounts can do this.`, 'FORBIDDEN'));
    }
    next();
  };
}

// For public pages that show a bit more to logged-in users. Never blocks.
async function optionalAuth(req, res, next) {
  req.user = null;
  const token = tokenFromRequest(req);
  if (token) {
    try {
      req.user = await getUserFromToken(token);
    } catch {
      req.user = null;
    }
  }
  next();
}

module.exports = { requireAuth, requireRole, optionalAuth, getUserFromToken };
