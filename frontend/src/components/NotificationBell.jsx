// components/NotificationBell.jsx — bell with live unread count + dropdown of latest items.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck } from '@/components/icons';
import api from '../api/client';
import { useRealtime } from '../context/RealtimeContext';
import { useLanguage } from '../context/LanguageContext';
import { notificationText, notifIcon } from '../lib/notifications';
import { timeAgo } from '../lib/format';
import { Spinner } from './ui/Spinner';

export function NotificationItem({ n, onOpen, compact = false }) {
  const { t, lang } = useLanguage();
  const Icon = notifIcon(n.type);
  const { title, body } = notificationText(n, t);
  const tone = {
    booking_accepted: 'bg-success-50 text-success',
    booking_rejected: 'bg-danger-50 text-danger',
    booking_cancelled: 'bg-sunken text-muted',
    new_review: 'bg-warning-50 text-warning',
    new_message: 'bg-pine-50 text-pine',
  }[n.type] || 'bg-brand-50 text-brand';
  return (
    <button
      onClick={() => onOpen(n)}
      className={`w-full text-start flex gap-3 rounded-2xl transition-colors hover:bg-sunken ${compact ? 'p-2.5' : 'p-4'} ${!n.readAt ? 'bg-brand-50/50' : ''}`}
    >
      <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-start gap-2">
          <span className={`flex-1 text-sm leading-snug ${n.readAt ? 'text-ink-2' : 'text-ink font-semibold'}`}>{title}</span>
          {!n.readAt && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand shrink-0" />}
        </span>
        {body && <span className={`block text-sm text-muted mt-0.5 ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>{body}</span>}
        <span className="block text-xs text-muted mt-1">{timeAgo(n.updatedAt || n.createdAt, lang)}</span>
      </span>
    </button>
  );
}

export default function NotificationBell({ light = false }) {
  const { notifUnread, setNotifUnread, subscribe } = useRealtime();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 8 } });
      setItems(data.items);
      setNotifUnread(data.unreadCount);
    } catch {
      setItems([]);
    }
  }, [setNotifUnread]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Live-insert new notifications while the dropdown is open.
  useEffect(
    () =>
      subscribe('notification:new', (n) => {
        setItems((prev) => (prev ? [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 8) : prev));
      }),
    [subscribe],
  );

  async function openItem(n) {
    setOpen(false);
    if (!n.readAt) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      api.patch(`/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.link) navigate(n.link);
  }

  async function markAll() {
    await api.patch('/notifications/read-all').catch(() => {});
    setItems((prev) => prev?.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    setNotifUnread(0);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative btn btn-ghost btn-icon ${light ? 'text-white hover:bg-white/10' : ''}`}
        aria-label={t('nav.notifications')}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {notifUnread > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-surface ltr-nums">
            {notifUnread > 99 ? '99+' : notifUnread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:end-0 top-16 sm:top-auto sm:mt-2 sm:w-[380px] card shadow-lift overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <p className="font-bold">{t('nav.notifications')}</p>
              {notifUnread > 0 && (
                <button onClick={markAll} className="text-xs font-semibold text-pine hover:underline inline-flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> {t('notif.markAll')}
                </button>
              )}
            </div>
            <div className="max-h-[min(420px,calc(100dvh-13rem))] overflow-y-auto overscroll-contain scrollbar-thin p-2">
              {items === null ? (
                <div className="py-10 flex justify-center text-pine"><Spinner /></div>
              ) : items.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted">{t('notif.empty')}</div>
              ) : (
                items.map((n) => <NotificationItem key={n.id} n={n} onOpen={openItem} compact />)
              )}
            </div>
            <Link to="/notifications" onClick={() => setOpen(false)} className="block text-center text-sm font-semibold text-pine py-3 border-t border-line hover:bg-sunken">
              {t('notif.viewAll')}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
