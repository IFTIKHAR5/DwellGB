// controllers/booking.controller.js — rental requests between tenants and owners.
const { Booking, Listing, Review, Conversation } = require('../models');
const { notify } = require('../services/notify');
const { AppError, asyncHandler } = require('../utils');

const LISTING_FIELDS = 'title district area rent images status owner';
const cover = (l) => l?.images?.[0]?.url || null;

function shape(b, { withTenant = false, withOwner = false, reviewed = false } = {}) {
  const l = b.listing;
  return {
    id: String(b._id),
    status: b.status,
    message: b.message,
    moveInDate: b.moveInDate || null,
    occupants: b.occupants,
    ownerNote: b.ownerNote || '',
    respondedAt: b.respondedAt || null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    listing: l && l.title
      ? { id: String(l._id), title: l.title, district: l.district, area: l.area, rent: l.rent, cover: cover(l), status: l.status }
      : null,
    ...(withTenant && b.tenant?.name
      ? {
          tenant: {
            id: String(b.tenant._id), name: b.tenant.name, avatar: b.tenant.avatar || null, place: b.tenant.place || '',
            // Owners see the tenant's phone once the tenant has asked to rent their property.
            phone: b.tenant.phone || null, memberSince: b.tenant.createdAt,
          },
        }
      : {}),
    ...(withOwner && b.owner?.name
      ? { owner: { id: String(b.owner._id), name: b.owner.name, avatar: b.owner.avatar || null, ...(b.status === 'accepted' ? { phone: b.owner.phone || null } : {}) } }
      : {}),
    ...(withOwner ? { reviewed } : {}),
  };
}

// POST /api/bookings — tenant requests to rent a listing.
exports.create = asyncHandler(async (req, res) => {
  const { listingId, message, moveInDate, occupants } = req.body;
  const listing = await Listing.findById(listingId).select('title owner status ownerApproved');
  if (!listing || !listing.ownerApproved) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');
  if (String(listing.owner) === req.user.id) throw new AppError(400, "You can't request your own listing.", 'OWN_LISTING');
  if (listing.status !== 'available') throw new AppError(400, 'This property is no longer available.', 'UNAVAILABLE');
  if (moveInDate && moveInDate < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    throw new AppError(400, 'Move-in date cannot be in the past.', 'VALIDATION_ERROR');
  }

  const already = await Booking.findOne({ listing: listing._id, tenant: req.user.id, status: { $in: ['pending', 'accepted'] } }).select('status');
  if (already) {
    throw new AppError(409, already.status === 'accepted' ? 'Your request for this property was already accepted.' : 'You already have a pending request for this property.', 'DUPLICATE_REQUEST');
  }

  let booking;
  try {
    booking = await Booking.create({
      listing: listing._id, tenant: req.user.id, owner: listing.owner, message, moveInDate: moveInDate || undefined, occupants: occupants || 1,
    });
  } catch (err) {
    if (err.code === 11000) throw new AppError(409, 'You already have a pending request for this property.', 'DUPLICATE_REQUEST');
    throw err;
  }

  await notify(listing.owner, {
    type: 'booking_request',
    title: 'New rental request',
    body: `${req.user.name} wants to rent "${listing.title}".`,
    link: '/dashboard/requests',
    data: { bookingId: String(booking._id), listingId: String(listing._id), listingTitle: listing.title, fromName: req.user.name },
  });

  await booking.populate('listing', LISTING_FIELDS);
  res.status(201).json(shape(booking));
});

// GET /api/bookings/mine — tenant's own requests.
exports.mine = asyncHandler(async (req, res) => {
  const [bookings, reviews] = await Promise.all([
    Booking.find({ tenant: req.user.id })
      .sort({ createdAt: -1 })
      .populate('listing', LISTING_FIELDS)
      .populate('owner', 'name avatar phone'),
    Review.find({ tenant: req.user.id }).select('booking'),
  ]);
  const reviewed = new Set(reviews.map((r) => String(r.booking)));
  res.json(bookings.map((b) => shape(b, { withOwner: true, reviewed: reviewed.has(String(b._id)) })));
});

// GET /api/bookings/received?status=pending — owner's incoming requests.
exports.received = asyncHandler(async (req, res) => {
  const filter = { owner: req.user.id };
  if (['pending', 'accepted', 'rejected', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
  const bookings = await Booking.find(filter)
    .sort({ status: 1, createdAt: -1 })
    .populate('listing', LISTING_FIELDS)
    .populate('tenant', 'name avatar phone place createdAt');
  // pending first, then newest
  const order = { pending: 0, accepted: 1, rejected: 2, cancelled: 3 };
  bookings.sort((a, b) => order[a.status] - order[b.status] || b.createdAt - a.createdAt);
  res.json(bookings.map((b) => shape(b, { withTenant: true })));
});

// PATCH /api/bookings/:id/status — owner accepts or rejects (atomic).
exports.respond = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const notAnswerable = async () => {
    const exists = await Booking.exists({ _id: req.params.id, owner: req.user.id });
    return exists
      ? new AppError(409, 'This request has already been answered.', 'ALREADY_ANSWERED')
      : new AppError(404, 'Request not found.', 'NOT_FOUND');
  };

  // Accepting first "claims" the home in one atomic step: only a home that is not yet
  // rented can be claimed. So two requests can never both be accepted for one home.
  let claimed = null;
  if (status === 'accepted') {
    const pending = await Booking.findOne({ _id: req.params.id, owner: req.user.id, status: 'pending' }).select('listing');
    if (!pending) throw await notAnswerable();
    claimed = await Listing.findOneAndUpdate(
      { _id: pending.listing, owner: req.user.id, status: { $in: ['available', 'hidden'] } },
      { status: 'rented' },
    ); // returns the listing as it was BEFORE the update
    if (!claimed) {
      throw new AppError(409, 'This home is already marked as rented (or was removed). Set it back to available before accepting another request.', 'LISTING_UNAVAILABLE');
    }
  }

  // Only a PENDING booking can change — prevents double answers.
  const booking = await Booking.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id, status: 'pending' },
    { status, ownerNote: note || '', respondedAt: new Date() },
    { new: true },
  ).populate('listing', LISTING_FIELDS);
  if (!booking) {
    // Someone answered it in the meantime: give the home back its old status.
    if (claimed) await Listing.updateOne({ _id: claimed._id }, { status: claimed.status });
    throw await notAnswerable();
  }
  const listing = booking.listing;

  if (status === 'accepted') {

    const others = await Booking.find({ listing: booking.listing?._id, status: 'pending', _id: { $ne: booking._id } }).select('tenant');
    if (others.length) {
      await Booking.updateMany(
        { _id: { $in: others.map((o) => o._id) } },
        { status: 'rejected', ownerNote: 'The property has been rented to another tenant.', respondedAt: new Date() },
      );
      for (const o of others) {
        await notify(o.tenant, {
          type: 'booking_rejected',
          title: 'Property no longer available',
          body: `"${listing?.title}" has been rented to someone else.`,
          link: '/dashboard/requests',
          data: { listingTitle: listing?.title, reason: 'rented_to_other' },
        });
      }
    }

    // Open a chat between them automatically so they can arrange the move-in.
    if (listing) {
      await Conversation.updateOne(
        { listing: listing._id, tenant: booking.tenant },
        { $setOnInsert: { listing: listing._id, tenant: booking.tenant, owner: booking.owner } },
        { upsert: true },
      );
    }
  }

  await notify(booking.tenant, {
    type: status === 'accepted' ? 'booking_accepted' : 'booking_rejected',
    title: status === 'accepted' ? 'Your request was accepted ' : 'Your request was declined',
    body: status === 'accepted'
      ? `The owner of "${listing?.title}" accepted your request. You can now see their contact details.`
      : `The owner of "${listing?.title}" declined your request.`,
    link: listing ? `/listings/${listing._id}` : '/dashboard/requests',
    data: { bookingId: String(booking._id), listingId: listing ? String(listing._id) : null, listingTitle: listing?.title },
  });

  res.json(shape(booking));
});

// PATCH /api/bookings/:id/cancel — tenant withdraws a PENDING request.
exports.cancel = asyncHandler(async (req, res) => {
  const booking = await Booking.findOneAndUpdate(
    { _id: req.params.id, tenant: req.user.id, status: 'pending' },
    { status: 'cancelled' },
    { new: true },
  ).populate('listing', LISTING_FIELDS);
  if (!booking) {
    const exists = await Booking.exists({ _id: req.params.id, tenant: req.user.id });
    throw exists
      ? new AppError(409, 'Only pending requests can be cancelled.', 'NOT_PENDING')
      : new AppError(404, 'Request not found.', 'NOT_FOUND');
  }
  await notify(booking.owner, {
    type: 'booking_cancelled',
    title: 'A request was withdrawn',
    body: `${req.user.name} withdrew their request for "${booking.listing?.title}".`,
    link: '/dashboard/requests',
    data: { bookingId: String(booking._id), listingTitle: booking.listing?.title, fromName: req.user.name },
  });
  res.json(shape(booking));
});
