// controllers/review.controller.js — tenants rate owners after an ACCEPTED booking only.
const { Review, Booking, Listing } = require('../models');
const { notify } = require('../services/notify');
const { AppError, asyncHandler } = require('../utils');

const shape = (r) => ({
  id: String(r._id),
  rating: r.rating,
  comment: r.comment,
  ownerReply: r.ownerReply || '',
  createdAt: r.createdAt,
  tenant: r.tenant?.name ? { id: String(r.tenant._id), name: r.tenant.name, avatar: r.tenant.avatar || null } : null,
  listing: r.listing?.title ? { id: String(r.listing._id), title: r.listing.title } : null,
});

// GET /api/reviews/owner/:id
exports.forOwner = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ owner: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('tenant', 'name avatar')
    .populate('listing', 'title');
  const count = reviews.length;
  const average = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));
  res.json({ reviews: reviews.map(shape), average, count, breakdown });
});

// GET /api/reviews/reviewable — accepted bookings the tenant hasn't reviewed yet.
exports.reviewable = asyncHandler(async (req, res) => {
  const [accepted, done] = await Promise.all([
    Booking.find({ tenant: req.user.id, status: 'accepted' }).populate('listing', 'title'),
    Review.find({ tenant: req.user.id }).select('booking'),
  ]);
  const reviewed = new Set(done.map((r) => String(r.booking)));
  res.json(
    accepted
      .filter((b) => !reviewed.has(String(b._id)))
      .map((b) => ({ bookingId: String(b._id), listingId: b.listing ? String(b.listing._id) : null, title: b.listing?.title || '(listing removed)' })),
  );
});

// POST /api/reviews
exports.create = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  // Not populated on purpose: if the owner deleted the listing, populate would turn
  // booking.listing into null and the review (which needs the listing id) could not be saved.
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError(404, 'Booking not found.', 'NOT_FOUND');
  if (String(booking.tenant) !== req.user.id) throw new AppError(403, 'You can only review your own bookings.', 'FORBIDDEN');
  if (booking.status !== 'accepted') throw new AppError(400, 'You can only review after your request is accepted.', 'NOT_ACCEPTED');

  const listingTitle = (await Listing.findById(booking.listing).select('title'))?.title;

  let review;
  try {
    review = await Review.create({
      booking: booking._id, listing: booking.listing, owner: booking.owner, tenant: req.user.id, rating, comment,
    });
  } catch (err) {
    if (err.code === 11000) throw new AppError(409, 'You already reviewed this stay.', 'DUPLICATE');
    throw err;
  }
  await Review.recalculateOwner(booking.owner);

  await notify(booking.owner, {
    type: 'new_review',
    title: `New ${rating}-star review`,
    body: `${req.user.name} reviewed you${listingTitle ? ` for "${listingTitle}"` : ''}.`,
    link: `/users/${booking.owner}`,
    data: { rating, fromName: req.user.name, listingTitle },
  });

  await review.populate('tenant', 'name avatar');
  res.status(201).json(shape(review));
});

// POST /api/reviews/:id/reply — owner replies publicly to a review (once, editable).
exports.reply = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { ownerReply: req.body.reply },
    { new: true },
  ).populate('tenant', 'name avatar');
  if (!review) throw new AppError(404, 'Review not found.', 'NOT_FOUND');
  res.json(shape(review));
});
