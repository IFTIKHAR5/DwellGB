// controllers/report.controller.js — users flag listings or users for moderation.
const { Report, Listing, User } = require('../models');
const { notify } = require('../services/notify');
const { AppError, asyncHandler } = require('../utils');

// POST /api/reports
exports.create = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, details } = req.body;
  const doc = { reporter: req.user.id, targetType, reason, details };
  let label = '';

  if (targetType === 'listing') {
    const listing = await Listing.findById(targetId).select('owner title status');
    if (!listing || listing.status === 'removed') throw new AppError(404, 'Listing not found.', 'NOT_FOUND');
    if (String(listing.owner) === req.user.id) throw new AppError(400, "You can't report your own listing.", 'OWN_TARGET');
    doc.listing = listing._id;
    label = `listing "${listing.title}"`;
  } else {
    const user = await User.findById(targetId).select('name role isActive');
    if (!user || !user.isActive) throw new AppError(404, 'User not found.', 'NOT_FOUND');
    if (String(user._id) === req.user.id) throw new AppError(400, "You can't report yourself.", 'OWN_TARGET');
    if (user.role === 'admin') throw new AppError(400, 'This account cannot be reported.', 'FORBIDDEN');
    doc.user = user._id;
    label = `user ${user.name}`;
  }

  let report;
  try {
    report = await Report.create(doc);
  } catch (err) {
    if (err.code === 11000) throw new AppError(409, 'You already reported this. Our team is reviewing it.', 'DUPLICATE');
    throw err;
  }

  // Let the moderators know right away.
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  for (const a of admins) {
    await notify(a._id, {
      type: 'system',
      title: 'New report to review',
      body: `${req.user.name} reported ${label} (${reason.replace('_', ' ')}).`,
      link: '/admin/reports',
      groupKey: 'admin:reports',
    });
  }

  res.status(201).json({ id: String(report._id), message: 'Thanks — our team will review this report.' });
});
