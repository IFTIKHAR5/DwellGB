// controllers/admin.controller.js — the admin panel: stats, users, identity checks, listings, reports.
const mongoose = require('mongoose');
const { User, Listing, Booking, Review, Conversation, Message, Notification, Report } = require('../models');
const moderation = require('../services/moderation');
const { reviewVerification } = require('../services/verification');
const { emitToUser } = require('../services/realtime');
const { sendPush } = require('../services/push');
const { notify } = require('../services/notify');
const { listingCard } = require('../services/serialize');
const { documentPath } = require('../services/storage');
const { VERIFICATION_DOCS } = require('../config/constants');
const { AppError, asyncHandler, escapeRegex, formatCnic, maskCnic, formatPhone, normalizePhone, normalizeCnic } = require('../utils');

const TZ = 'Asia/Karachi';
const DAY = 24 * 60 * 60 * 1000;

function adminUser(u, extra = {}) {
  return {
    id: String(u._id),
    name: u.name,
    fatherName: u.fatherName || '',
    email: u.email || null,
    phone: u.phone || null,
    phoneDisplay: formatPhone(u.phone),
    cnicMasked: u.cnic ? maskCnic(u.cnic) : null,
    hasCnic: !!u.cnic,
    place: u.place || '',
    avatar: u.avatar || null,
    role: u.role,
    authProviders: u.authProviders || [],
    isActive: u.isActive,
    isVerified: !!u.isVerified,
    verification: u.role === 'owner' ? { status: u.verification?.status || 'not_submitted', submittedAt: u.verification?.submittedAt || null, reviewedAt: u.verification?.reviewedAt || null, rejectionReason: u.verification?.rejectionReason || '' } : null,
    banReason: u.banReason || '',
    bannedAt: u.bannedAt || null,
    ratingAvg: u.ratingAvg || 0,
    ratingCount: u.ratingCount || 0,
    lastSeenAt: u.lastSeenAt || null,
    createdAt: u.createdAt,
    ...extra,
  };
}

/** Builds a zero-filled day-by-day series for the last `days` days (Pakistan time). */
async function dailySeries(Model, days, match = {}) {
  const since = new Date(Date.now() - (days - 1) * DAY);
  since.setHours(0, 0, 0, 0);
  const rows = await Model.aggregate([
    { $match: { ...match, createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, n: { $sum: 1 } } },
  ]);
  const byDay = new Map(rows.map((r) => [r._id, r.n]));
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = fmt.format(new Date(Date.now() - i * DAY));
    out.push({ date: key, count: byDay.get(key) || 0 });
  }
  return out;
}

const countBy = async (Model, field, match = {}) =>
  Object.fromEntries((await Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }])).map((r) => [r._id, r.n]));

// GET /api/admin/stats
exports.stats = asyncHandler(async (req, res) => {
  const d7 = new Date(Date.now() - 7 * DAY);
  const d30 = new Date(Date.now() - 30 * DAY);
  const [
    roles, banned, verifiedOwners, pendingVerifications, new7, new30, listingStatus, bookingStatus, reportStatus,
    conversations, messages, messages7, reviews, byDistrict, signups, newListings, recentUsers, recentListings,
  ] = await Promise.all([
    countBy(User, 'role'),
    User.countDocuments({ isActive: false }),
    User.countDocuments({ role: 'owner', isVerified: true }),
    User.countDocuments({ role: 'owner', 'verification.status': 'pending' }),
    User.countDocuments({ createdAt: { $gte: d7 } }),
    User.countDocuments({ createdAt: { $gte: d30 } }),
    countBy(Listing, 'status'),
    countBy(Booking, 'status'),
    countBy(Report, 'status'),
    Conversation.countDocuments(),
    Message.countDocuments(),
    Message.countDocuments({ createdAt: { $gte: d7 } }),
    Review.countDocuments(),
    Listing.aggregate([
      { $match: { status: 'available' } },
      { $group: { _id: '$district', count: { $sum: 1 }, avgRent: { $avg: '$rent' } } },
      { $sort: { count: -1 } },
    ]),
    dailySeries(User, 30),
    dailySeries(Listing, 30),
    User.find().sort({ createdAt: -1 }).limit(6),
    Listing.find().sort({ createdAt: -1 }).limit(6).populate('owner', 'name'),
  ]);

  const bookingsTotal = Object.values(bookingStatus).reduce((a, b) => a + b, 0);
  const answered = (bookingStatus.accepted || 0) + (bookingStatus.rejected || 0);
  res.json({
    users: {
      total: Object.values(roles).reduce((a, b) => a + b, 0),
      owners: roles.owner || 0,
      tenants: roles.tenant || 0,
      admins: roles.admin || 0,
      banned,
      verifiedOwners,
      new7d: new7,
      new30d: new30,
    },
    listings: {
      total: Object.values(listingStatus).reduce((a, b) => a + b, 0),
      available: listingStatus.available || 0,
      rented: listingStatus.rented || 0,
      hidden: listingStatus.hidden || 0,
      removed: listingStatus.removed || 0,
    },
    bookings: {
      total: bookingsTotal,
      pending: bookingStatus.pending || 0,
      accepted: bookingStatus.accepted || 0,
      rejected: bookingStatus.rejected || 0,
      cancelled: bookingStatus.cancelled || 0,
      acceptanceRate: answered ? Math.round(((bookingStatus.accepted || 0) / answered) * 100) : null,
    },
    verifications: { pending: pendingVerifications },
    reports: { open: reportStatus.open || 0, resolved: reportStatus.resolved || 0, dismissed: reportStatus.dismissed || 0 },
    engagement: { conversations, messages, messages7d: messages7, reviews },
    byDistrict: byDistrict.map((d) => ({ district: d._id, count: d.count, avgRent: Math.round(d.avgRent) })),
    series: { signups, listings: newListings },
    recentUsers: recentUsers.map((u) => adminUser(u)),
    recentListings: recentListings.map((l) => ({ ...listingCard(l), ownerName: l.owner?.name || '' })),
  });
});

// ------------------------------------------------------------------ users

// GET /api/admin/users
exports.users = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = {};
  if (q.role) filter.role = q.role;
  if (q.status) filter.isActive = q.status === 'active';
  if (q.verified !== undefined) filter.isVerified = q.verified;
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    const or = [{ name: rx }, { email: rx }, { place: rx }];
    const phone = normalizePhone(q.q);
    if (phone) or.push({ phone });
    const cnic = normalizeCnic(q.q);
    if (cnic) or.push({ cnic });
    if (mongoose.isValidObjectId(q.q)) or.push({ _id: q.q });
    filter.$or = or;
  }
  const sort = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { name: 1 } }[q.sort];
  const [rows, total] = await Promise.all([
    User.find(filter).select('+cnic').sort(sort).skip((q.page - 1) * q.limit).limit(q.limit),
    User.countDocuments(filter),
  ]);
  const ids = rows.map((u) => u._id);
  const [listingCounts, reportCounts] = await Promise.all([
    Listing.aggregate([{ $match: { owner: { $in: ids } } }, { $group: { _id: '$owner', n: { $sum: 1 } } }]),
    Report.aggregate([{ $match: { user: { $in: ids }, status: 'open' } }, { $group: { _id: '$user', n: { $sum: 1 } } }]),
  ]);
  const lc = new Map(listingCounts.map((r) => [String(r._id), r.n]));
  const rc = new Map(reportCounts.map((r) => [String(r._id), r.n]));
  res.json({
    items: rows.map((u) => adminUser(u, { listingsCount: lc.get(String(u._id)) || 0, openReports: rc.get(String(u._id)) || 0 })),
    total,
    page: q.page,
    pages: Math.max(1, Math.ceil(total / q.limit)),
  });
});

// GET /api/admin/users/:id
exports.user = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+cnic');
  if (!user) throw new AppError(404, 'User not found.', 'NOT_FOUND');
  const id = user._id;
  const [listings, asTenant, asOwner, reportsAgainst, reportsFiled] = await Promise.all([
    Listing.find({ owner: id }).sort({ createdAt: -1 }).limit(50),
    countBy(Booking, 'status', { tenant: id }),
    countBy(Booking, 'status', { owner: id }),
    Report.find({ user: id }).sort({ createdAt: -1 }).limit(20).populate('reporter', 'name'),
    Report.countDocuments({ reporter: id }),
  ]);
  res.json({
    ...adminUser(user),
    bio: user.bio || '',
    listings: listings.map((l) => listingCard(l)),
    bookings: { asTenant, asOwner },
    reportsAgainst: reportsAgainst.map((r) => ({
      id: String(r._id), reason: r.reason, details: r.details, status: r.status, createdAt: r.createdAt, reporter: r.reporter?.name || '—',
    })),
    reportsFiled,
  });
});

// POST /api/admin/users/:id/cnic — shows the full CNIC number (to compare with the photos).
exports.revealCnic = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+cnic');
  if (!user) throw new AppError(404, 'User not found.', 'NOT_FOUND');
  res.json({ cnic: user.cnic ? formatCnic(user.cnic) : null });
});

// PATCH /api/admin/users/:id — { action: ban | unban, reason }
exports.updateUser = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  const user = action === 'ban'
    ? await moderation.banUser(req.user.id, req.params.id, reason)
    : await moderation.unbanUser(req.params.id);
  const fresh = await User.findById(user._id).select('+cnic');
  res.json(adminUser(fresh));
});

// ------------------------------------------------------------------ identity verification

// GET /api/admin/verifications?status=pending — owners waiting for a document check.
exports.verifications = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = { role: 'owner', 'verification.status': q.status || 'pending' };
  const [rows, total, counts] = await Promise.all([
    User.find(filter).select('+cnic').sort({ 'verification.submittedAt': 1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    User.countDocuments(filter),
    countBy(User, 'verification.status', { role: 'owner' }),
  ]);
  res.json({
    items: rows.map((u) => adminUser(u)),
    total,
    page: q.page,
    pages: Math.max(1, Math.ceil(total / q.limit)),
    counts: { pending: counts.pending || 0, approved: counts.approved || 0, rejected: counts.rejected || 0, not_submitted: counts.not_submitted || 0 },
  });
});

// GET /api/admin/users/:id/documents/:kind — streams a private identity photo (admins only).
exports.document = asyncHandler(async (req, res) => {
  const { kind } = req.params;
  if (!VERIFICATION_DOCS.includes(kind)) throw new AppError(404, 'Document not found.', 'NOT_FOUND');
  const user = await User.findById(req.params.id).select(`+verification.${kind}`);
  const file = documentPath(user?.verification?.[kind]);
  if (!file) throw new AppError(404, 'Document not found.', 'NOT_FOUND');
  res.set({ 'Cache-Control': 'private, no-store', 'Content-Type': 'image/webp' });
  // A file that was deleted from disk is a 404, not a server error.
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Document not found.', code: 'NOT_FOUND' });
  });
});

// PATCH /api/admin/users/:id/verification — { action: approve | reject, reason }
exports.reviewVerification = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  const user = await reviewVerification(req.user.id, req.params.id, action === 'approve', reason);
  const fresh = await User.findById(user._id).select('+cnic');
  res.json(adminUser(fresh));
});

// ------------------------------------------------------------------ listings

// GET /api/admin/listings
exports.listings = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.district) filter.district = q.district;
  if (q.owner) filter.owner = q.owner;
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ title: rx }, { area: rx }];
    if (mongoose.isValidObjectId(q.q)) filter.$or.push({ _id: q.q });
  }
  if (q.reported) {
    const reportedIds = await Report.distinct('listing', { status: 'open', targetType: 'listing' });
    filter._id = { $in: reportedIds };
  }
  const [rows, total] = await Promise.all([
    Listing.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate('owner', 'name avatar isActive isVerified'),
    Listing.countDocuments(filter),
  ]);
  const reportCounts = await Report.aggregate([
    { $match: { listing: { $in: rows.map((l) => l._id) }, status: 'open' } },
    { $group: { _id: '$listing', n: { $sum: 1 } } },
  ]);
  const rc = new Map(reportCounts.map((r) => [String(r._id), r.n]));
  res.json({
    items: rows.map((l) => ({
      ...listingCard(l),
      views: l.views,
      owner: l.owner ? { id: String(l.owner._id), name: l.owner.name, avatar: l.owner.avatar, isActive: l.owner.isActive, isVerified: !!l.owner.isVerified } : null,
      moderationReason: l.moderation?.reason || '',
      openReports: rc.get(String(l._id)) || 0,
    })),
    total,
    page: q.page,
    pages: Math.max(1, Math.ceil(total / q.limit)),
  });
});

// PATCH /api/admin/listings/:id — { action: remove|restore, reason }
exports.moderateListing = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  const listing = action === 'remove'
    ? await moderation.removeListing(req.user.id, req.params.id, reason)
    : await moderation.restoreListing(req.params.id);
  if (action === 'remove') {
    await Report.updateMany(
      { listing: listing._id, status: 'open' },
      { status: 'resolved', resolution: `Listing removed: ${reason}`, resolvedBy: req.user.id, resolvedAt: new Date() },
    );
  }
  res.json({ ...listingCard(listing), moderationReason: listing.moderation?.reason || '' });
});

// DELETE /api/admin/listings/:id — permanent.
exports.deleteListing = asyncHandler(async (req, res) => {
  await moderation.deleteListing(req.user.id, req.params.id);
  res.json({ ok: true });
});

// ------------------------------------------------------------------ reports

function shapeReport(r) {
  const l = r.listing;
  const u = r.user;
  return {
    id: String(r._id),
    targetType: r.targetType,
    reason: r.reason,
    details: r.details,
    status: r.status,
    resolution: r.resolution || '',
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt || null,
    resolvedBy: r.resolvedBy?.name || null,
    reporter: r.reporter ? { id: String(r.reporter._id), name: r.reporter.name, avatar: r.reporter.avatar || null } : null,
    listing: l && l.title
      ? { id: String(l._id), title: l.title, area: l.area, district: l.district, cover: l.images?.[0]?.url || null, status: l.status, ownerId: String(l.owner?._id || l.owner), ownerName: l.owner?.name || '' }
      : null,
    user: u && u.name ? { id: String(u._id), name: u.name, avatar: u.avatar || null, role: u.role, isActive: u.isActive } : null,
  };
}

// GET /api/admin/reports
exports.reports = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = { status: q.status || 'open' };
  if (q.targetType) filter.targetType = q.targetType;
  const [rows, total, counts] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: q.status === 'open' || !q.status ? 1 : -1 }) // oldest open first = fair queue
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('reporter', 'name avatar')
      .populate({ path: 'listing', select: 'title area district images status owner', populate: { path: 'owner', select: 'name' } })
      .populate('user', 'name avatar role isActive')
      .populate('resolvedBy', 'name'),
    Report.countDocuments(filter),
    countBy(Report, 'status'),
  ]);
  res.json({
    items: rows.map(shapeReport),
    total,
    page: q.page,
    pages: Math.max(1, Math.ceil(total / q.limit)),
    counts: { open: counts.open || 0, resolved: counts.resolved || 0, dismissed: counts.dismissed || 0 },
  });
});

// PATCH /api/admin/reports/:id — { status, resolution, enforce }
exports.updateReport = asyncHandler(async (req, res) => {
  const { status, resolution, enforce } = req.body;
  const report = await Report.findById(req.params.id).populate('listing', 'title owner');
  if (!report) throw new AppError(404, 'Report not found.', 'NOT_FOUND');
  if (report.status !== 'open') throw new AppError(409, 'This report was already handled.', 'ALREADY_HANDLED');

  const note = resolution || (status === 'dismissed' ? 'No violation found.' : 'Action taken.');
  if (status === 'resolved' && enforce === 'remove_listing') {
    if (report.targetType !== 'listing' || !report.listing) throw new AppError(400, 'This report is not about a listing.', 'BAD_ENFORCEMENT');
    await moderation.removeListing(req.user.id, report.listing._id, note);
  }
  if (status === 'resolved' && enforce === 'ban_user') {
    const target = report.targetType === 'user' ? report.user : report.listing?.owner;
    if (!target) throw new AppError(400, 'No user to ban for this report.', 'BAD_ENFORCEMENT');
    await moderation.banUser(req.user.id, target, note);
  }

  report.status = status;
  report.resolution = note;
  report.resolvedBy = req.user.id;
  report.resolvedAt = new Date();
  await report.save();

  // Close duplicates about the same target in one go.
  // populated('listing') still gives the id when the listing itself was deleted.
  const listingId = report.populated('listing') || report.listing?._id;
  const same = report.targetType === 'listing' ? { listing: listingId } : { user: report.user };
  await Report.updateMany({ ...same, targetType: report.targetType, status: 'open' }, { status, resolution: note, resolvedBy: req.user.id, resolvedAt: new Date() });

  await notify(report.reporter, {
    type: 'system',
    title: 'Update on your report',
    body: status === 'resolved' ? 'Thanks for reporting — our moderators took action.' : 'Thanks for reporting — our moderators reviewed it and found no violation.',
    link: '/notifications',
  });

  const fresh = await Report.findById(report._id)
    .populate('reporter', 'name avatar')
    .populate({ path: 'listing', select: 'title area district images status owner', populate: { path: 'owner', select: 'name' } })
    .populate('user', 'name avatar role isActive')
    .populate('resolvedBy', 'name');
  res.json(shapeReport(fresh));
});

// ------------------------------------------------------------------ broadcast

// POST /api/admin/broadcast — { title, body, link, audience }
exports.broadcast = asyncHandler(async (req, res) => {
  const { title, body, link, audience } = req.body;
  const filter = { isActive: true };
  if (audience === 'owners') filter.role = 'owner';
  if (audience === 'tenants') filter.role = 'tenant';
  const ids = await User.distinct('_id', filter);

  const docs = ids.map((id) => ({ user: id, type: 'system', title, body: body || '', link: link || '', data: { broadcast: true } }));
  for (let i = 0; i < docs.length; i += 1000) {
    const inserted = await Notification.insertMany(docs.slice(i, i + 1000));
    // unreadCount: null tells the client to re-fetch its own count.
    for (const n of inserted) emitToUser(n.user, 'notification:new', { notification: n.toJSON(), unreadCount: null });
    sendPush(inserted.map((n) => n.user), { title: inserted[0]?.title, body: inserted[0]?.body, link: inserted[0]?.link, type: 'system' });
  }

  res.status(201).json({ recipients: ids.length });
});

