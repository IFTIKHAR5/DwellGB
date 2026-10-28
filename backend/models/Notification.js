// models/Notification.js
const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');
const { NOTIFICATION_TYPES } = require('../config/constants');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    // English fallback text — the frontend renders a translated version from `type` + `data`.
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, maxlength: 400, default: '' },
    link: { type: String, maxlength: 200, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Groups repeated events (e.g. many messages in one chat) into a single notification.
    groupKey: { type: String },
    count: { type: Number, default: 1 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });
notificationSchema.index({ user: 1, groupKey: 1, readAt: 1 });
// Auto-delete notifications after 90 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

notificationSchema.plugin(toJSONPlugin);

module.exports = mongoose.model('Notification', notificationSchema);
