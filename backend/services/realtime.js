// services/realtime.js — Socket.IO server: logged-in users only, one private room per user.
//
// Events the server EMITS:
//   notification:new     { notification, unreadCount }
//   message:new          { conversationId, message, conversation }
//   conversation:read    { conversationId, readerId, readAt }
//   typing               { conversationId, userId, isTyping }
//   presence             { userId, online }
//
// Events the server LISTENS to:
//   typing               { conversationId, isTyping }
//   presence:query       [userId, ...]  (ack → [onlineUserId, ...])
const { Server } = require('socket.io');
const env = require('../config/env');
const { getUserFromToken } = require('../middleware/auth');
const { tokenFromCookieHeader } = require('../utils/token');

let io = null;
const onlineCounts = new Map(); // userId -> number of open sockets

const room = (userId) => `user:${userId}`;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrls, credentials: true },
    maxHttpBufferSize: 1e5,
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // The browser sends our login cookie with the socket connection.
  io.use(async (socket, next) => {
    try {
      const token = tokenFromCookieHeader(socket.handshake.headers.cookie) || socket.handshake.auth?.token; // website cookie / mobile app
      socket.data.user = await getUserFromToken(token);
      next();
    } catch (err) {
      next(new Error(err.code || 'UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    socket.join(room(userId));

    const count = (onlineCounts.get(userId) || 0) + 1;
    onlineCounts.set(userId, count);
    if (count === 1) socket.broadcast.emit('presence', { userId, online: true });

    // Lazy-require to avoid a circular import at startup.
    const { Conversation, User } = require('../models');

    socket.on('typing', async (payload = {}, ack) => {
      try {
        const { conversationId, isTyping } = payload;
        if (typeof conversationId !== 'string' || conversationId.length !== 24) return;
        const convo = await Conversation.findById(conversationId).select('tenant owner');
        if (!convo || !convo.isParticipant(userId)) return;
        const otherId = String(convo.otherParticipant(userId));
        io.to(room(otherId)).emit('typing', { conversationId, userId, isTyping: !!isTyping });
        if (typeof ack === 'function') ack(true);
      } catch {
        /* ignore */
      }
    });

    socket.on('presence:query', (ids, ack) => {
      if (typeof ack !== 'function' || !Array.isArray(ids)) return;
      ack(ids.slice(0, 100).filter((id) => onlineCounts.get(String(id)) > 0));
    });

    socket.on('disconnect', () => {
      const left = (onlineCounts.get(userId) || 1) - 1;
      if (left <= 0) {
        onlineCounts.delete(userId);
        socket.broadcast.emit('presence', { userId, online: false });
        User.updateOne({ _id: userId }, { lastSeenAt: new Date() }).catch(() => {});
      } else {
        onlineCounts.set(userId, left);
      }
    });
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (io) io.to(room(String(userId))).emit(event, payload);
}

/** Force-disconnect every socket of a user (e.g. after a ban). */
function disconnectUser(userId) {
  if (io) io.in(room(String(userId))).disconnectSockets(true);
}

function isOnline(userId) {
  return (onlineCounts.get(String(userId)) || 0) > 0;
}

module.exports = { init, emitToUser, isOnline, disconnectUser };
