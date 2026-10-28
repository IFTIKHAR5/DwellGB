// services/moderation.js — admin actions that are used from more than one place
// (the Users / Listings pages and the Reports page).
const { User, Listing, Booking, Report } = require('../models');
const { notify } = require('./notify');
const { disconnectUser } = require('./realtime');
const { removeFile } = require('./storage');
const { AppError } = require('../utils');

// Cancels open requests on a listing and tells each tenant.
async function cancelPendingBookings(listing, reason) {
  const pending = await Booking.find({ listing: listing._id, status: 'pending' }).select('tenant');

  for (const booking of pending) {
    booking.status = 'cancelled';
    booking.ownerNote = reason;
    booking.respondedAt = new Date();
    await booking.save();

    await notify(booking.tenant, {
      type: 'booking_cancelled',
      title: 'A listing you requested was removed',
      body: `"${listing.title}" is no longer available.`,
      link: '/dashboard/requests',
    });
  }
}

async function banUser(adminId, userId, reason) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found.', 'NOT_FOUND');
  if (user.role === 'admin') throw new AppError(403, 'Admins cannot be banned.', 'FORBIDDEN');
  if (String(user._id) === String(adminId)) throw new AppError(400, "You can't ban yourself.", 'FORBIDDEN');
  if (!user.isActive) return user;

  user.isActive = false; // requireAuth checks this on every request, so they're logged out at once
  user.banReason = reason;
  user.bannedAt = new Date();
  await user.save();
  disconnectUser(user._id);

  // Hide all their public listings (available AND rented — rented ones are still visible
  // on the listing page and in saved homes) and cancel the requests made on them.
  const listings = await Listing.find({ owner: user._id, status: { $in: ['available', 'rented'] } });
  for (const listing of listings) {
    listing.status = 'hidden';
    await listing.save();
    await cancelPendingBookings(listing, 'This listing is no longer available.');
  }
  // Withdraw the requests they made as a tenant.
  await Booking.updateMany({ tenant: user._id, status: 'pending' }, { status: 'cancelled' });

  return user;
}

async function unbanUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found.', 'NOT_FOUND');

  user.isActive = true;
  user.banReason = undefined;
  user.bannedAt = undefined;
  await user.save();
  return user;
}

async function removeListing(adminId, listingId, reason) {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');

  listing.status = 'removed';
  listing.moderation = { reason, by: adminId, at: new Date() };
  await listing.save();

  await cancelPendingBookings(listing, 'This listing was removed by DwellGB moderators.');
  await notify(listing.owner, {
    type: 'system',
    title: 'Your listing was removed by a moderator',
    body: `"${listing.title}" was removed: ${reason}`,
    link: '/dashboard/listings',
  });
  return listing;
}

async function restoreListing(listingId) {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');
  if (listing.status !== 'removed') return listing;

  // Comes back hidden — the owner decides when it goes live again.
  listing.status = 'hidden';
  listing.moderation = undefined;
  await listing.save();

  await notify(listing.owner, {
    type: 'system',
    title: 'Your listing was restored',
    body: `"${listing.title}" was restored. It is hidden — set it to Available when you're ready.`,
    link: '/dashboard/listings',
  });
  return listing;
}

async function deleteListing(adminId, listingId) {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');

  await cancelPendingBookings(listing, 'This listing was removed by DwellGB moderators.');
  await User.updateMany({ savedListings: listing._id }, { $pull: { savedListings: listing._id } });
  await Report.updateMany(
    { listing: listing._id, status: 'open' },
    { status: 'resolved', resolution: 'Listing deleted.', resolvedBy: adminId, resolvedAt: new Date() },
  );
  await listing.deleteOne();
  await Promise.all(listing.images.map((image) => removeFile(image.url)));
}

module.exports = { cancelPendingBookings, banUser, unbanUser, removeListing, restoreListing, deleteListing };
