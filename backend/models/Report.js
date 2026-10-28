// models/Report.js — a user flags a listing or another user for admins to review.
const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');
const { REPORT_TARGETS, REPORT_REASONS, REPORT_STATUS } = require('../config/constants');

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: REPORT_TARGETS, required: true },
    // Exactly one of these is set, matching targetType.
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: REPORT_STATUS, default: 'open' },
    resolution: { type: String, trim: true, maxlength: 500, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ listing: 1, status: 1 });
reportSchema.index({ user: 1, status: 1 });
// One OPEN report per reporter per target — stops people spamming the queue.
reportSchema.index(
  { reporter: 1, targetType: 1, listing: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: 'open' }, name: 'one_open_report_per_target' },
);

reportSchema.plugin(toJSONPlugin);

module.exports = mongoose.model('Report', reportSchema);
