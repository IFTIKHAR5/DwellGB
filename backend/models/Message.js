// models/Message.js
const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ conversation: 1, createdAt: -1 });

messageSchema.plugin(toJSONPlugin);

module.exports = mongoose.model('Message', messageSchema);
