// services/push.js — phone notifications for the mobile app (Expo Push Service).
// The app sends its Expo push token after login (POST /api/users/me/push-token); whenever a
// notification is created we also push it to that user's phones. Failures are logged and never
// break the request. Tokens that Expo says are no longer valid are removed.
const env = require('../config/env');
const { User } = require('../models');

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

const isValidToken = (t) => typeof t === 'string' && TOKEN_RE.test(t);

/**
 * @param {string|string[]} userIds
 * @param {{ title: string, body?: string, link?: string, type?: string }} message
 */
async function sendPush(userIds, message) {
  if (env.isTest || typeof fetch !== 'function') return;
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const users = await User.find({ _id: { $in: ids }, isActive: true, 'pushTokens.0': { $exists: true } }).select('+pushTokens');
    const messages = [];
    for (const u of users) {
      for (const to of u.pushTokens || []) {
        messages.push({
          to,
          sound: 'default',
          title: message.title,
          body: message.body || undefined,
          data: { link: message.link || '', type: message.type || '' },
        });
      }
    }
    // Expo accepts up to 100 messages per request.
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const res = await fetch(EXPO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
      const json = await res.json().catch(() => ({}));
      const dead = (json.data || [])
        .map((r, j) => (r.status === 'error' && r.details?.error === 'DeviceNotRegistered' ? chunk[j].to : null))
        .filter(Boolean);
      if (dead.length) await User.updateMany({}, { $pull: { pushTokens: { $in: dead } } });
    }
  } catch (err) {
    console.error('[push] failed:', err.message);
  }
}

module.exports = { sendPush, isValidToken };
