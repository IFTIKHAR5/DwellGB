// controllers/conversation.controller.js — in-app messaging between tenants and owners.
// Messages are persisted via REST (reliable, rate-limited, validated) and pushed
// live over Socket.IO to both participants.
const mongoose = require('mongoose');
const { Conversation, Message, Listing, Notification, Booking } = require('../models');
const { emitToUser, isOnline } = require('../services/realtime');
const { notify } = require('../services/notify');
const { AppError, asyncHandler } = require('../utils');

const PEOPLE = 'name avatar role lastSeenAt isVerified';

function shapeConversation(c, meId) {
  const iAmTenant = String(c.tenant._id || c.tenant) === meId;
  const other = iAmTenant ? c.owner : c.tenant;
  const l = c.listing;
  return {
    id: String(c._id),
    listing: l && l.title ? { id: String(l._id), title: l.title, area: l.area, district: l.district, rent: l.rent, cover: l.images?.[0]?.url || null, status: l.status } : null,
    other: other && other.name
      ? { id: String(other._id), name: other.name, avatar: other.avatar || null, role: other.role, isVerified: !!other.isVerified, online: isOnline(String(other._id)), lastSeenAt: other.lastSeenAt || null }
      : null,
    myRole: iAmTenant ? 'tenant' : 'owner',
    lastMessage: c.lastMessage?.at
      ? { text: c.lastMessage.text, senderId: String(c.lastMessage.sender), at: c.lastMessage.at }
      : null,
    unread: iAmTenant ? c.tenantUnread : c.ownerUnread,
    updatedAt: c.updatedAt,
  };
}

const shapeMessage = (m) => ({
  id: String(m._id),
  conversationId: String(m.conversation),
  senderId: String(m.sender),
  text: m.text,
  readAt: m.readAt,
  createdAt: m.createdAt,
});

async function loadForParticipant(id, meId) {
  const convo = await Conversation.findById(id)
    .populate('listing', 'title area district rent images status owner')
    .populate('tenant', PEOPLE)
    .populate('owner', PEOPLE);
  if (!convo || !convo.isParticipant(meId)) throw new AppError(404, 'Conversation not found.', 'NOT_FOUND');
  return convo;
}

async function postMessage(convo, meId, meName, text) {
  const message = await Message.create({ conversation: convo._id, sender: meId, text });
  const iAmTenant = String(convo.tenant._id || convo.tenant) === meId;
  const otherId = String(iAmTenant ? convo.owner._id || convo.owner : convo.tenant._id || convo.tenant);

  const updated = await Conversation.findByIdAndUpdate(
    convo._id,
    {
      lastMessage: { text: text.slice(0, 200), sender: meId, at: message.createdAt },
      $inc: iAmTenant ? { ownerUnread: 1 } : { tenantUnread: 1 },
    },
    { new: true },
  )
    .populate('listing', 'title area district rent images status owner')
    .populate('tenant', PEOPLE)
    .populate('owner', PEOPLE);

  const payload = shapeMessage(message);
  emitToUser(meId, 'message:new', { conversationId: String(convo._id), message: payload, conversation: shapeConversation(updated, meId) });
  emitToUser(otherId, 'message:new', { conversationId: String(convo._id), message: payload, conversation: shapeConversation(updated, otherId) });

  await notify(otherId, {
    type: 'new_message',
    title: `New message from ${meName}`,
    body: text.length > 120 ? `${text.slice(0, 117)}…` : text,
    link: `/messages/${convo._id}`,
    data: { conversationId: String(convo._id), fromName: meName, listingTitle: updated.listing?.title },
    groupKey: `chat:${convo._id}`,
  });

  return { message: payload, conversation: shapeConversation(updated, meId) };
}

// GET /api/conversations
exports.list = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const convos = await Conversation.find({ $or: [{ tenant: me }, { owner: me }] })
    .sort({ updatedAt: -1 })
    .limit(100)
    .populate('listing', 'title area district rent images status owner')
    .populate('tenant', PEOPLE)
    .populate('owner', PEOPLE);
  res.json(convos.map((c) => shapeConversation(c, me)));
});

// GET /api/conversations/unread-count
exports.unreadCount = asyncHandler(async (req, res) => {
  const me = new mongoose.Types.ObjectId(req.user.id);
  const [agg] = await Conversation.aggregate([
    { $match: { $or: [{ tenant: me }, { owner: me }] } },
    { $group: { _id: null, n: { $sum: { $cond: [{ $eq: ['$tenant', me] }, '$tenantUnread', '$ownerUnread'] } } } },
  ]);
  res.json({ count: agg?.n || 0 });
});

// POST /api/conversations — { listingId, text? } start (or reopen) a chat about a listing.
// Owners may also open a chat with a tenant who sent a request: { listingId, tenantId }.
exports.start = asyncHandler(async (req, res) => {
  const { listingId, text, tenantId } = req.body;
  const listing = await Listing.findById(listingId).select('owner status title ownerApproved');
  if (!listing || !listing.ownerApproved || ['hidden', 'removed'].includes(listing.status)) throw new AppError(404, 'Listing not found.', 'NOT_FOUND');

  const iAmOwner = String(listing.owner) === req.user.id;
  let tenant = req.user.id;
  if (iAmOwner) {
    if (!tenantId) throw new AppError(400, "You can't message yourself about your own listing.", 'OWN_LISTING');
    const hasRequest = await Booking.exists({ listing: listing._id, tenant: tenantId });
    if (!hasRequest) throw new AppError(403, 'You can only message tenants who contacted you about this listing.', 'FORBIDDEN');
    tenant = tenantId;
  }

  await Conversation.updateOne(
    { listing: listing._id, tenant },
    { $setOnInsert: { listing: listing._id, tenant, owner: listing.owner } },
    { upsert: true },
  );
  const convo = await Conversation.findOne({ listing: listing._id, tenant })
    .populate('listing', 'title area district rent images status owner')
    .populate('tenant', PEOPLE)
    .populate('owner', PEOPLE);

  if (text) {
    const out = await postMessage(convo, req.user.id, req.user.name, text);
    return res.status(201).json(out.conversation);
  }
  res.status(201).json(shapeConversation(convo, req.user.id));
});

// GET /api/conversations/:id
exports.getOne = asyncHandler(async (req, res) => {
  const convo = await loadForParticipant(req.params.id, req.user.id);
  res.json(shapeConversation(convo, req.user.id));
});

// GET /api/conversations/:id/messages?before=<iso>&limit=30
exports.messages = asyncHandler(async (req, res) => {
  await loadForParticipant(req.params.id, req.user.id);
  const filter = { conversation: req.params.id };
  if (req.query.before) filter.createdAt = { $lt: req.query.before };
  const limit = req.query.limit;
  const rows = await Message.find(filter).sort({ createdAt: -1 }).limit(limit + 1);
  const hasMore = rows.length > limit;
  res.json({ items: rows.slice(0, limit).reverse().map(shapeMessage), hasMore });
});

// POST /api/conversations/:id/messages — { text }
exports.send = asyncHandler(async (req, res) => {
  const convo = await loadForParticipant(req.params.id, req.user.id);
  const out = await postMessage(convo, req.user.id, req.user.name, req.body.text);
  res.status(201).json(out.message);
});

// POST /api/conversations/:id/read — marks the other person's messages as read.
exports.markRead = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const convo = await loadForParticipant(req.params.id, me);
  const iAmTenant = String(convo.tenant._id) === me;
  const readAt = new Date();
  await Promise.all([
    Message.updateMany({ conversation: convo._id, sender: { $ne: me }, readAt: null }, { readAt }),
    Conversation.updateOne({ _id: convo._id }, iAmTenant ? { tenantUnread: 0 } : { ownerUnread: 0 }, { timestamps: false }),
    Notification.updateMany({ user: me, groupKey: `chat:${convo._id}`, readAt: null }, { readAt }),
  ]);
  const otherId = String(iAmTenant ? convo.owner._id : convo.tenant._id);
  emitToUser(otherId, 'conversation:read', { conversationId: String(convo._id), readerId: me, readAt });
  res.json({ ok: true, readAt });
});
