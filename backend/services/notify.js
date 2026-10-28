// services/notify.js — create a notification, push it live over Socket.IO and to the user's phones.
// Notification failures are logged but never break the request that caused them.
const { Notification } = require('../models');
const { emitToUser } = require('./realtime');
const { sendPush } = require('./push');

async function unreadCount(userId) {
  return Notification.countDocuments({ user: userId, readAt: null });
}

/**
 * @param {string} userId  recipient
 * @param {object} n       { type, title, body, link, data, groupKey }
 * If `groupKey` is given and an UNREAD notification with the same key exists,
 * it is updated in place (count++) instead of creating a new one — so 20 chat
 * messages become one "3 new messages from Ali" notification, not 20.
 */
async function notify(userId, n) {
  try {
    let doc = null;
    if (n.groupKey) {
      doc = await Notification.findOneAndUpdate(
        { user: userId, groupKey: n.groupKey, readAt: null },
        {
          $set: { title: n.title, body: n.body || '', link: n.link || '', data: n.data || {} },
          $inc: { count: 1 },
        },
        { new: true },
      );
    }
    if (!doc) {
      doc = await Notification.create({
        user: userId,
        type: n.type,
        title: n.title,
        body: n.body || '',
        link: n.link || '',
        data: n.data || {},
        groupKey: n.groupKey,
      });
    }
    emitToUser(userId, 'notification:new', { notification: doc.toJSON(), unreadCount: await unreadCount(userId) });
    sendPush(userId, { title: doc.title, body: doc.body, link: doc.link, type: doc.type }); // phones (not awaited)
    return doc;
  } catch (err) {
    console.error('[notify] failed:', err.message);
    return null;
  }
}

module.exports = { notify, unreadCount };
