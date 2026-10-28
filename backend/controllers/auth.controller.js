// controllers/auth.controller.js — sign up, log in (password or Google), log out, my profile.
const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');
const { User } = require('../models');
const { setTokenCookie, clearTokenCookie, createToken, isMobileApp } = require('../utils/token');
const { saveImage, removeFile } = require('../services/storage');
const { selfUser } = require('../services/serialize');
const { prepareDocuments, storeDocuments } = require('../services/verification');
const { AppError, asyncHandler, normalizePhone } = require('../utils');

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

// Logs the user in: puts the JWT in a cookie and returns their profile.
// The mobile app can't use cookies, so it gets the JWT in the response instead
// (the website never does — its token stays in the httpOnly cookie).
function sendLoggedIn(req, res, user, status = 200) {
  if (isMobileApp(req)) return res.status(status).json({ user: selfUser(user), token: createToken(user) });
  setTokenCookie(res, user);
  res.status(status).json({ user: selfUser(user) });
}

// POST /api/auth/register  (owners send multipart with cnicFront, cnicBack, selfie)
exports.register = asyncHandler(async (req, res) => {
  const { name, fatherName, email, phone, cnic, place, password, role } = req.body;

  // Friendly message if the email / phone / CNIC is already used.
  const sameDetails = [email && { email }, phone && { phone }, cnic && { cnic }].filter(Boolean);
  const existing = await User.findOne({ $or: sameDetails }).select('+cnic email phone');
  if (existing) {
    let field = 'CNIC';
    if (email && existing.email === email) field = 'email';
    else if (phone && existing.phone === phone) field = 'phone number';
    throw new AppError(409, `An account with this ${field} already exists.`, 'DUPLICATE');
  }

  // Owners must upload CNIC front, CNIC back and a selfie. The photos are checked
  // first, so no account is created if one of them is missing or broken.
  const documents = role === 'owner' ? await prepareDocuments(req.files) : null;

  // `|| undefined`: an empty email/phone is not stored (two empty values would clash on the unique index).
  let user = new User({ name, fatherName, email: email || undefined, phone: phone || undefined, cnic, place, role, authProviders: ['password'] });
  await user.setPassword(password);
  await user.save();

  if (documents) await storeDocuments(user._id, documents);
  // Reload so the response has the full, up-to-date profile (verification status, masked CNIC).
  user = await User.findById(user._id).select('+cnic');
  sendLoggedIn(req, res, user, 201);
});

// POST /api/auth/login — "identifier" is an email or a phone number.
exports.login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  let user = null;
  if (identifier.includes('@')) {
    user = await User.findOne({ email: identifier.toLowerCase() }).select('+passwordHash +cnic');
  } else if (normalizePhone(identifier)) {
    user = await User.findOne({ phone: normalizePhone(identifier) }).select('+passwordHash +cnic');
  }

  if (user && !user.passwordHash && user.authProviders.includes('google')) {
    throw new AppError(401, 'This account uses Google sign-in. Please continue with Google.', 'USE_GOOGLE');
  }
  // Same message whether the account exists or not, so nobody can probe for accounts.
  if (!user || !(await user.checkPassword(password))) {
    throw new AppError(401, 'Incorrect email/phone or password.', 'INVALID_CREDENTIALS');
  }
  if (!user.isActive) throw new AppError(403, 'This account has been disabled.', 'ACCOUNT_INACTIVE');

  sendLoggedIn(req, res, user);
});

// POST /api/auth/google — { credential, role?, cnic?, phone?, place? }
// New Google users are asked owner/tenant first: the first call answers { needsProfile: true },
// the second call (same credential + role) creates the account.
exports.google = asyncHandler(async (req, res) => {
  if (!googleClient) throw new AppError(503, 'Google sign-in is not set up on the server.', 'GOOGLE_DISABLED');
  const { credential, role, cnic, phone, place } = req.body;

  let google;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleAudiences });
    google = ticket.getPayload();
  } catch {
    throw new AppError(401, 'Google sign-in failed. Please try again.', 'GOOGLE_INVALID');
  }
  if (!google?.email || !google.email_verified) {
    throw new AppError(401, 'Your Google email is not verified.', 'GOOGLE_UNVERIFIED');
  }
  const email = google.email.toLowerCase();

  // 1. Already signed up with Google, or with the same email → link and log in.
  let user = await User.findOne({ $or: [{ googleId: google.sub }, { email }] }).select('+cnic');
  if (user) {
    if (!user.isActive) throw new AppError(403, 'This account has been disabled.', 'ACCOUNT_INACTIVE');
    if (!user.authProviders.includes('google')) user.authProviders.push('google');
    user.googleId = google.sub;
    user.emailVerified = true;
    if (!user.avatar && google.picture) user.avatar = google.picture;
    await user.save();
    return sendLoggedIn(req, res, user);
  }

  // 2. New user who hasn't picked owner/tenant yet.
  if (!role) {
    return res.json({ needsProfile: true, profile: { name: google.name || '', email, avatar: google.picture || null } });
  }
  if (role === 'owner') {
    const missing = [];
    if (!cnic) missing.push({ field: 'cnic', message: 'CNIC is required for owner accounts.' });
    if (!place) missing.push({ field: 'place', message: 'Enter where you live, e.g. Jutial, Gilgit.' });
    if (missing.length) throw new AppError(400, missing[0].message, 'VALIDATION_ERROR', missing);
  }

  // 3. Create the account. Owners upload their CNIC photos afterwards on /verify-identity.
  user = await User.create({
    name: (google.name || email.split('@')[0]).slice(0, 80),
    email,
    emailVerified: true,
    googleId: google.sub,
    avatar: google.picture || null,
    role,
    cnic,
    phone,
    place,
    authProviders: ['google'],
  });
  sendLoggedIn(req, res, user, 201);
});

// POST /api/auth/logout
exports.logout = (req, res) => {
  clearTokenCookie(res);
  res.json({ message: 'Logged out.' });
};

// GET /api/auth/me — the frontend calls this on page load to know who is logged in.
exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+cnic');
  res.json(selfUser(user));
});

// PUT /api/auth/me — role and CNIC can't be changed here.
exports.updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+cnic');
  const { name, fatherName, place, bio, phone, email } = req.body;

  // An empty field means "remove it" (stored as no value, not as an empty string).
  if (email !== undefined && (email || undefined) !== user.email) {
    user.email = email || undefined;
    user.emailVerified = false;
  }
  if (phone !== undefined) user.phone = phone || undefined;
  if (!user.email && !user.phone) {
    throw new AppError(400, 'Keep at least an email or a phone number so you can log in.', 'VALIDATION_ERROR', [{ field: 'email', message: 'Add an email or phone number.' }]);
  }
  if (name !== undefined) user.name = name;
  if (fatherName !== undefined) user.fatherName = fatherName;
  if (place !== undefined) user.place = place;
  if (bio !== undefined) user.bio = bio;

  await user.save(); // a duplicate email/phone becomes a 409 in the error handler
  res.json(selfUser(user));
});

// POST /api/auth/me/avatar
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'No image received.', 'NO_FILE');
  const user = await User.findById(req.user.id).select('+cnic');
  const oldAvatar = user.avatar;

  const saved = await saveImage(req.file.buffer, 'avatar');
  user.avatar = saved.url;
  await user.save();
  await removeFile(oldAvatar);

  res.json(selfUser(user));
});

// PUT /api/auth/me/password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+passwordHash +cnic');

  // Google-only accounts have no password yet, so they can set one directly.
  if (user.passwordHash && !(await user.checkPassword(currentPassword || ''))) {
    throw new AppError(400, 'Your current password is incorrect.', 'WRONG_PASSWORD');
  }
  await user.setPassword(newPassword);
  await user.save();
  res.json({ message: 'Password changed.' });
});

// POST /api/auth/me/verification — owner (re)uploads CNIC front, CNIC back and selfie.
exports.submitVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.role !== 'owner') throw new AppError(403, 'Only owners need to verify their identity.', 'FORBIDDEN');
  if (user.verification?.status === 'approved') throw new AppError(409, 'Your identity is already verified.', 'ALREADY_VERIFIED');

  const documents = await prepareDocuments(req.files);
  await storeDocuments(user._id, documents);

  const updated = await User.findById(user._id).select('+cnic');
  res.json(selfUser(updated));
});
