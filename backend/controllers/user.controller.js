// controllers/user.controller.js — public profiles and saved listings.
const { User, Listing } = require('../models');
const { publicUser, listingCard } = require('../services/serialize');
const { AppError, asyncHandler } = require('../utils');
const { isValidToken } = require('../services/push');

// GET /api/users/:id — public profile (no phone, no CNIC).
exports.profile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || !user.isActive) throw new AppError(404, 'User not found.', 'NOT_FOUND');
  const listings = user.role === 'owner'
    ? await Listing.find({ owner: user._id, status: { $in: ['available', 'rented'] }, ownerApproved: true }).sort({ createdAt: -1 }).limit(24)
    : [];
  res.json({ ...publicUser(user), listings: listings.map((l) => listingCard(l)) });
});

// GET /api/users/me/saved
exports.saved = asyncHandler(async (req, res) => {
  const me = await User.findById(req.user.id).select('savedListings');
  const listings = await Listing.find({ _id: { $in: me?.savedListings || [] }, status: { $nin: ['hidden', 'removed'] }, ownerApproved: true })
    .populate('owner', 'name avatar ratingAvg ratingCount isVerified');
  const savedIds = new Set(listings.map((l) => String(l._id)));
  // keep "most recently saved first"
  const order = (me?.savedListings || []).map(String).reverse();
  listings.sort((a, b) => order.indexOf(String(a._id)) - order.indexOf(String(b._id)));
  res.json(listings.map((l) => listingCard(l, { savedIds })));
});

// POST /api/users/me/saved/:id
exports.save = asyncHandler(async (req, res) => {
  // Only public listings can be saved (same rule as the saved list and the listing page).
  const listing = await Listing.findOne({ _id: req.params.id, status: { $nin: ['hidden', 'removed'] }, ownerApproved: true }).select('_id owner');
  if (!listing) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');
  const r = await User.updateOne({ _id: req.user.id, savedListings: { $ne: listing._id } }, { $push: { savedListings: listing._id } });
  if (r.modifiedCount) await Listing.updateOne({ _id: listing._id }, { $inc: { savesCount: 1 } });
  res.json({ saved: true });
});

// DELETE /api/users/me/saved/:id
exports.unsave = asyncHandler(async (req, res) => {
  const r = await User.updateOne({ _id: req.user.id, savedListings: req.params.id }, { $pull: { savedListings: req.params.id } });
  if (r.modifiedCount) await Listing.updateOne({ _id: req.params.id, savesCount: { $gt: 0 } }, { $inc: { savesCount: -1 } });
  res.json({ saved: false });
});

// POST /api/users/me/push-token  { token } — the mobile app registers a phone for notifications.
exports.addPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!isValidToken(token)) throw new AppError(400, 'Invalid push token.', 'VALIDATION_ERROR');
  // A phone belongs to one account at a time: remove it from anyone else first.
  await User.updateMany({ _id: { $ne: req.user.id }, pushTokens: token }, { $pull: { pushTokens: token } });
  await User.updateOne({ _id: req.user.id }, { $addToSet: { pushTokens: token } });
  // Keep at most 5 phones per account (the newest ones).
  const me = await User.findById(req.user.id).select('+pushTokens');
  if (me.pushTokens.length > 5) await User.updateOne({ _id: req.user.id }, { $set: { pushTokens: me.pushTokens.slice(-5) } });
  res.json({ ok: true });
});

// DELETE /api/users/me/push-token  { token } — on log out.
exports.removePushToken = asyncHandler(async (req, res) => {
  const { token } = req.body || {};
  if (token) await User.updateOne({ _id: req.user.id }, { $pull: { pushTokens: token } });
  res.json({ ok: true });
});
