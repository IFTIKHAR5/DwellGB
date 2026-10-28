// controllers/listing.controller.js
const mongoose = require('mongoose');
const { Listing, Booking, User, Conversation, Report } = require('../models');
const { saveImage, removeFile } = require('../services/storage');
const { listingCard, listingDetail } = require('../services/serialize');
const { cancelPendingBookings } = require('../services/moderation');
const { AppError, asyncHandler, escapeRegex } = require('../utils');

const OWNER_FIELDS = 'name avatar role place bio ratingAvg ratingCount isVerified createdAt lastSeenAt';
const MAX_IMAGES = 10;

async function savedSetFor(req) {
  if (!req.user) return new Set();
  const u = await User.findById(req.user.id).select('savedListings');
  return new Set((u?.savedListings || []).map(String));
}

function buildFilter(q) {
  const filter = {
    status: q.includeRented ? { $in: ['available', 'rented'] } : 'available',
    ownerApproved: true, // owner's CNIC has been checked by an admin
  };
  if (q.district) filter.district = q.district;
  if (q.area) filter.area = { $regex: escapeRegex(q.area), $options: 'i' };
  if (q.propertyType?.length) filter.propertyType = { $in: q.propertyType };
  if (Number.isInteger(q.minRent) || Number.isInteger(q.maxRent)) {
    filter.rent = {};
    if (Number.isInteger(q.minRent)) filter.rent.$gte = q.minRent;
    if (Number.isInteger(q.maxRent)) filter.rent.$lte = q.maxRent;
  }
  if (q.bedrooms) filter.bedrooms = { $gte: q.bedrooms };
  if (q.bathrooms) filter.bathrooms = { $gte: q.bathrooms };
  if (q.furnishing) filter.furnishing = q.furnishing;
  // "Family" searchers should also see listings open to anyone.
  if (q.tenantPreference) filter.tenantPreference = { $in: [q.tenantPreference, 'any'] };
  if (q.heating) filter.heating = q.heating;
  if (q.amenities?.length) filter.amenities = { $all: q.amenities };
  if (q.bbox) {
    const [minLng, minLat, maxLng, maxLat] = q.bbox;
    filter.geo = {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: [[[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]],
        },
      },
    };
  }
  if (q.q) filter.$text = { $search: q.q };
  return filter;
}

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { rent: 1, createdAt: -1 },
  price_desc: { rent: -1, createdAt: -1 },
  popular: { views: -1, createdAt: -1 },
};

// GET /api/listings — public search with filters, map bounds and pagination.
exports.search = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = buildFilter(q);
  const useScore = q.q && (q.sort === 'relevance' || q.sort === 'newest');
  const sort = useScore ? { score: { $meta: 'textScore' }, createdAt: -1 } : SORTS[q.sort] || SORTS.newest;

  let query = Listing.find(filter);
  if (useScore) query = query.select({ score: { $meta: 'textScore' } });
  const [items, total, savedIds] = await Promise.all([
    query.sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).populate('owner', OWNER_FIELDS),
    Listing.countDocuments(filter),
    savedSetFor(req),
  ]);

  res.json({
    items: items.map((l) => listingCard(l, { savedIds })),
    page: q.page,
    limit: q.limit,
    total,
    pages: Math.max(1, Math.ceil(total / q.limit)),
  });
});

// GET /api/listings/facets — which filter options actually have homes right now.
// Uses only the "where + budget" part of the search (district, area, map area,
// keyword, price), so the filter panel can hide options that would show 0 homes.
exports.facets = asyncHandler(async (req, res) => {
  const { district, area, bbox, q, minRent, maxRent } = req.query;
  const match = buildFilter({ district, area, bbox, q, minRent, maxRent });

  const countBy = (field) => [
    { $group: { _id: `$${field}`, n: { $sum: 1 } } },
  ];
  const [result] = await Listing.aggregate([
    { $match: match },
    {
      $facet: {
        total: [{ $count: 'n' }],
        propertyType: countBy('propertyType'),
        furnishing: countBy('furnishing'),
        heating: countBy('heating'),
        tenantPreference: countBy('tenantPreference'),
        bedrooms: countBy('bedrooms'),
        amenities: [{ $unwind: '$amenities' }, { $group: { _id: '$amenities', n: { $sum: 1 } } }],
      },
    },
  ]);

  const toObject = (rows) => Object.fromEntries(rows.filter((r) => r._id !== null).map((r) => [r._id, r.n]));
  res.json({
    total: result.total[0]?.n || 0,
    propertyType: toObject(result.propertyType),
    furnishing: toObject(result.furnishing),
    heating: toObject(result.heating),
    tenantPreference: toObject(result.tenantPreference),
    bedrooms: toObject(result.bedrooms),
    amenities: toObject(result.amenities),
  });
});

// GET /api/listings/stats — public numbers for the home page.
exports.publicStats = asyncHandler(async (req, res) => {
  const [byDistrict, total, owners] = await Promise.all([
    Listing.aggregate([
      { $match: { status: 'available', ownerApproved: true } },
      { $group: { _id: '$district', count: { $sum: 1 }, avgRent: { $avg: '$rent' } } },
      { $sort: { count: -1 } },
    ]),
    Listing.countDocuments({ status: 'available', ownerApproved: true }),
    // Only verified, active owners count on the public home page.
    User.countDocuments({ role: 'owner', isVerified: true, isActive: true }),
  ]);
  res.json({
    total,
    owners,
    districts: byDistrict.map((d) => ({ district: d._id, count: d.count, avgRent: Math.round(d.avgRent) })),
  });
});

// GET /api/listings/:id
exports.getOne = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate('owner', `${OWNER_FIELDS} phone fatherName email`);
  if (!listing || !listing.owner) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');

  const userId = req.user?.id;
  const isOwner = !!userId && String(listing.owner._id) === userId;
  const isAdmin = req.user?.role === 'admin';
  const isPublic = !['hidden', 'removed'].includes(listing.status) && listing.ownerApproved;
  if (!isPublic && !isOwner && !isAdmin) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');

  let myBooking = null;
  let conversationId = null;
  let isAcceptedTenant = false;
  if (userId && !isOwner) {
    const [booking, accepted, convo] = await Promise.all([
      Booking.findOne({ listing: listing._id, tenant: userId }).sort({ createdAt: -1 }).select('status createdAt'),
      Booking.exists({ listing: listing._id, tenant: userId, status: 'accepted' }),
      Conversation.findOne({ listing: listing._id, tenant: userId }).select('_id'),
    ]);
    myBooking = booking ? { id: String(booking._id), status: booking.status, createdAt: booking.createdAt } : null;
    isAcceptedTenant = !!accepted;
    conversationId = convo ? String(convo._id) : null;
  }

  if (!isOwner) Listing.updateOne({ _id: listing._id }, { $inc: { views: 1 } }).catch(() => {});

  const savedIds = await savedSetFor(req);
  res.json({
    ...listingDetail(listing, { isOwner, isAcceptedTenant: isAcceptedTenant || isAdmin }, { savedIds }),
    ...(isOwner || isAdmin ? { moderationReason: listing.moderation?.reason || '' } : {}),
    isAdmin,
    myBooking,
    conversationId,
  });
});

// GET /api/listings/:id/similar
exports.similar = asyncHandler(async (req, res) => {
  const base = await Listing.findById(req.params.id).select('district rent propertyType');
  if (!base) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');
  const items = await Listing.find({
    _id: { $ne: base._id },
    status: 'available',
    ownerApproved: true,
    district: base.district,
    rent: { $gte: Math.round(base.rent * 0.6), $lte: Math.round(base.rent * 1.4) },
  })
    .sort({ createdAt: -1 })
    .limit(4)
    .populate('owner', OWNER_FIELDS);
  const savedIds = await savedSetFor(req);
  res.json(items.map((l) => listingCard(l, { savedIds })));
});

// GET /api/listings/mine — owner's listings (all statuses) with request counts.
exports.mine = asyncHandler(async (req, res) => {
  const ownerId = new mongoose.Types.ObjectId(req.user.id);
  const [listings, counts] = await Promise.all([
    Listing.find({ owner: ownerId }).sort({ createdAt: -1 }),
    Booking.aggregate([
      { $match: { owner: ownerId, status: 'pending' } },
      { $group: { _id: '$listing', pending: { $sum: 1 } } },
    ]),
  ]);
  const pendingBy = new Map(counts.map((c) => [String(c._id), c.pending]));
  res.json(
    listings.map((l) => ({
      ...listingCard(l),
      views: l.views,
      savesCount: l.savesCount,
      pendingRequests: pendingBy.get(String(l._id)) || 0,
      updatedAt: l.updatedAt,
    })),
  );
});

// GET /api/listings/mine/stats — owner dashboard numbers.
exports.ownerStats = asyncHandler(async (req, res) => {
  const ownerId = new mongoose.Types.ObjectId(req.user.id);
  const [listingAgg, bookingAgg, me] = await Promise.all([
    Listing.aggregate([
      { $match: { owner: ownerId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
          rented: { $sum: { $cond: [{ $eq: ['$status', 'rented'] }, 1, 0] } },
          views: { $sum: '$views' },
          saves: { $sum: '$savesCount' },
        },
      },
    ]),
    Booking.aggregate([{ $match: { owner: ownerId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    User.findById(ownerId).select('ratingAvg ratingCount'),
  ]);
  const b = Object.fromEntries(bookingAgg.map((x) => [x._id, x.n]));
  const l = listingAgg[0] || { total: 0, available: 0, rented: 0, views: 0, saves: 0 };
  res.json({
    listings: { total: l.total, available: l.available, rented: l.rented },
    views: l.views,
    saves: l.saves,
    requests: { pending: b.pending || 0, accepted: b.accepted || 0, rejected: b.rejected || 0, cancelled: b.cancelled || 0 },
    rating: { average: me?.ratingAvg || 0, count: me?.ratingCount || 0 },
  });
});

async function processImages(files) {
  const saved = [];
  try {
    for (const f of files || []) saved.push(await saveImage(f.buffer, 'listing'));
  } catch (err) {
    await Promise.all(saved.map((s) => removeFile(s.url)));
    throw err;
  }
  return saved;
}

const hasLocation = (body) => typeof body.lat === 'number' && typeof body.lng === 'number';

function applyFields(listing, body) {
  const simple = [
    'title', 'description', 'district', 'area', 'address', 'propertyType', 'rent', 'deposit', 'utilitiesIncluded',
    'bedrooms', 'bathrooms', 'kitchens', 'floorAreaSqft', 'furnishing', 'tenantPreference', 'waterSupply',
    'heating', 'amenities', 'availableFrom', 'minStayMonths',
  ];
  for (const key of simple) {
    if (body[key] !== undefined && body[key] !== '') listing[key] = body[key];
  }
  if (hasLocation(body)) {
    listing.geo = { type: 'Point', coordinates: [body.lng, body.lat] };
  }
}

// POST /api/listings (multipart, field "images")
exports.create = asyncHandler(async (req, res) => {
  const owner = await User.findById(req.user.id).select('verification.status');
  const verification = owner?.verification?.status;
  if (!['pending', 'approved'].includes(verification)) {
    throw new AppError(403, 'Please verify your identity (CNIC + selfie) before posting a property.', 'VERIFICATION_REQUIRED');
  }
  if (!req.files?.length) throw new AppError(400, 'Please add at least one photo of the property.', 'NO_IMAGES');
  if (!hasLocation(req.body)) throw new AppError(400, 'Please pin the property location on the map.', 'NO_LOCATION');

  const images = await processImages(req.files);
  // Goes public only once an admin has approved the owner's documents.
  const listing = new Listing({ owner: req.user.id, images, ownerApproved: verification === 'approved' });
  applyFields(listing, req.body);
  try {
    await listing.save();
  } catch (err) {
    await Promise.all(images.map((i) => removeFile(i.url)));
    throw err;
  }
  res.status(201).json(listingDetail(listing, { isOwner: true }));
});

// PUT /api/listings/:id (multipart; new photos in "images", removals in "removeImages")
exports.update = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');
  if (String(listing.owner) !== req.user.id) throw new AppError(403, 'You can only edit your own listings.', 'FORBIDDEN');

  const toRemove = new Set(req.body.removeImages || []);
  const remaining = listing.images.filter((img) => !toRemove.has(String(img._id)));
  const incoming = req.files?.length || 0;
  if (remaining.length + incoming > MAX_IMAGES) throw new AppError(400, `A listing can have at most ${MAX_IMAGES} photos.`, 'TOO_MANY_IMAGES');
  if (remaining.length + incoming === 0) throw new AppError(400, 'A listing needs at least one photo.', 'NO_IMAGES');

  const added = await processImages(req.files);
  const removed = listing.images.filter((img) => toRemove.has(String(img._id)));

  applyFields(listing, req.body);
  if (req.body.status && listing.status !== 'removed') listing.status = req.body.status;

  let images = [...remaining, ...added];
  if (req.body.imageOrder?.length) {
    const order = new Map(req.body.imageOrder.map((id, i) => [id, i]));
    images = images.sort((a, b) => (order.get(String(a._id)) ?? 999) - (order.get(String(b._id)) ?? 999));
  }
  listing.images = images;

  try {
    await listing.save();
  } catch (err) {
    await Promise.all(added.map((i) => removeFile(i.url)));
    throw err;
  }
  await Promise.all(removed.map((i) => removeFile(i.url)));
  const populated = await listing.populate('owner', `${OWNER_FIELDS} phone fatherName email`);
  res.json(listingDetail(populated, { isOwner: true }));
});

// PATCH /api/listings/:id/status — quick toggle from the dashboard.
exports.setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  // Listings removed by an admin stay removed.
  const listing = await Listing.findOneAndUpdate({ _id: req.params.id, owner: req.user.id, status: { $ne: 'removed' } }, { status }, { new: true });
  if (!listing) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');
  res.json(listingCard(listing));
});

// DELETE /api/listings/:id
exports.remove = asyncHandler(async (req, res) => {
  const listing = await Listing.findOne({ _id: req.params.id, owner: req.user.id });
  if (!listing) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');

  // Tenants with open requests are told the listing is gone (their history is kept).
  await cancelPendingBookings(listing, 'Listing was removed by the owner.');

  await User.updateMany({ savedListings: listing._id }, { $pull: { savedListings: listing._id } });
  // Close open reports about it, so they don't stay stuck in the admin queue.
  await Report.updateMany(
    { listing: listing._id, status: 'open' },
    { status: 'resolved', resolution: 'Listing deleted by the owner.', resolvedAt: new Date() },
  );
  await listing.deleteOne();
  await Promise.all(listing.images.map((i) => removeFile(i.url)));
  res.json({ message: 'Listing deleted.' });
});
