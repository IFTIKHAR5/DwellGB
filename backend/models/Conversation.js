// models/Conversation.js — one thread per (listing, tenant) pair.
const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');

const conversationSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date },
    },
    tenantUnread: { type: Number, default: 0 },
    ownerUnread: { type: Number, default: 0 },
  },
  { timestamps: true },
);

conversationSchema.index({ listing: 1, tenant: 1 }, { unique: true });
conversationSchema.index({ tenant: 1, updatedAt: -1 });
conversationSchema.index({ owner: 1, updatedAt: -1 });

conversationSchema.methods.isParticipant = function isParticipant(userId) {
  const id = String(userId);
  return String(this.tenant._id || this.tenant) === id || String(this.owner._id || this.owner) === id;
};

conversationSchema.methods.otherParticipant = function otherParticipant(userId) {
  return String(this.tenant._id || this.tenant) === String(userId) ? this.owner : this.tenant;
};

conversationSchema.plugin(toJSONPlugin);

module.exports = mongoose.model('Conversation', conversationSchema);
