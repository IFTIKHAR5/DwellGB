// models/Booking.js — a tenant's rental request for a listing.
const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');
const { BOOKING_STATUS } = require('../config/constants');

const bookingSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, trim: true, maxlength: 1000, default: '' },
    moveInDate: { type: Date },
    occupants: { type: Number, min: 1, max: 30, default: 1 },
    status: { type: String, enum: BOOKING_STATUS, default: 'pending' },
    ownerNote: { type: String, trim: true, maxlength: 500, default: '' },
    respondedAt: { type: Date },
  },
  { timestamps: true },
);

bookingSchema.index({ tenant: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });
bookingSchema.index({ listing: 1, status: 1 });
// A tenant can only have ONE pending request per listing — enforced by the DB.
bookingSchema.index(
  { listing: 1, tenant: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' }, name: 'one_pending_per_tenant' },
);

bookingSchema.plugin(toJSONPlugin);

module.exports = mongoose.model('Booking', bookingSchema);
