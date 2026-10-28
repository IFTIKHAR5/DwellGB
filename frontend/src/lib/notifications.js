// lib/notifications.js — turns a notification (type + data) into translated text.
import { BellRing, CalendarCheck, CalendarX, CalendarClock, MessageCircle, Star, Info } from '@/components/icons';

export const NOTIF_ICON = {
  booking_request: CalendarClock,
  booking_accepted: CalendarCheck,
  booking_rejected: CalendarX,
  booking_cancelled: CalendarX,
  new_message: MessageCircle,
  new_review: Star,
  system: Info,
};

export function notifIcon(type) {
  return NOTIF_ICON[type] || BellRing;
}

export function notificationText(n, t) {
  const d = n.data || {};
  const vars = { name: d.fromName || '', title: d.listingTitle || '', rating: d.rating || '', count: n.count || 1 };
  const key = `notif.${n.type}`;
  const title = t(`${key}.title`, vars);
  let body = t(`${key}.body`, vars);
  if (n.type === 'new_message') body = n.count > 1 ? t('notif.new_message.many', vars) + ' — ' + n.body : n.body;
  if (n.type === 'booking_rejected' && d.reason === 'rented_to_other') body = t('notif.booking_rejected.other', vars);
  if (n.type === 'booking_cancelled' && d.reason === 'listing_removed') body = t('notif.booking_cancelled.removed', vars);
  // Fall back to the server's English text if a translation is missing.
  return {
    title: title === `${key}.title` ? n.title : title,
    body: body === `${key}.body` ? n.body : body,
  };
}
