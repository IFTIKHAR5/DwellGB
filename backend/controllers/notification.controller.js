// controllers/notification.controller.js
const { Notification } = require('../models');
const { unreadCount } = require('../services/notify');
const { emitToUser } = require('../services/realtime');
const { AppError, asyncHandler } = require('../utils');

// GET /api/notifications?before=<iso>&limit=20
exports.list = asyncHandler(async (req, res) => {
  const filter = { user: req.user.id };
  if (req.query.before) filter.createdAt = { $lt: req.query.before };
  const limit = req.query.limit;
  const rows = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit + 1);
  res.json({
    items: rows.slice(0, limit).map((n) => n.toJSON()),
    hasMore: rows.length > limit,
    unreadCount: await unreadCount(req.user.id),
  });
});

// GET /api/notifications/unread-count
exports.count = asyncHandler(async (req, res) => {
  res.json({ count: await unreadCount(req.user.id) });
});

async function pushCount(userId) {
  emitToUser(userId, 'notification:count', { unreadCount: await unreadCount(userId) });
}

// PATCH /api/notifications/:id/read
exports.markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!n) throw new AppError(404, 'Notification not found.', 'NOT_FOUND');
  await pushCount(req.user.id);
  res.json(n.toJSON());
});

// PATCH /api/notifications/read-all
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user.id, readAt: null }, { readAt: new Date() });
  await pushCount(req.user.id);
  res.json({ ok: true });
});

// DELETE /api/notifications/:id
exports.remove = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!n) throw new AppError(404, 'Notification not found.', 'NOT_FOUND');
  await pushCount(req.user.id);
  res.json({ ok: true });
});
