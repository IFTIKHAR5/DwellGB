// models/Review.js — tenants review owners, only after an accepted booking.
const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');

const reviewSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: {
      type: Number, required: true, min: 1, max: 5,
      validate: { validator: Number.isInteger, message: 'Rating must be a whole number' },
    },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
    ownerReply: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true },
);

reviewSchema.statics.recalculateOwner = async function recalculateOwner(ownerId) {
  const [agg] = await this.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(String(ownerId)) } },
    { $group: { _id: '$owner', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await mongoose.model('User').updateOne(
    { _id: ownerId },
    { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg ? agg.count : 0 },
  );
};

reviewSchema.plugin(toJSONPlugin);

module.exports = mongoose.model('Review', reviewSchema);
