// pages/Notifications.jsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2 } from '@/components/icons';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useRealtime } from '../context/RealtimeContext';
import { NotificationItem } from '../components/NotificationBell';
import EmptyState from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function Notifications() {
  const { t } = useLanguage();
  const { subscribe, setNotifUnread, notifUnread } = useRealtime();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all');
  useDocumentTitle(t('nav.notifications'));

  const load = useCallback(async (before) => {
    const { data } = await api.get('/notifications', { params: { limit: 20, before } });
    setItems((prev) => (before ? [...(prev || []), ...data.items] : data.items));
    setHasMore(data.hasMore);
    setNotifUnread(data.unreadCount);
  }, [setNotifUnread]);

  useEffect(() => { load().catch(() => setItems([])); }, [load]);
  useEffect(() => subscribe('notification:new', (n) => setItems((prev) => (prev ? [n, ...prev.filter((x) => x.id !== n.id)] : prev))), [subscribe]);

  async function open(n) {
    if (!n.readAt) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      api.patch(`/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.link) navigate(n.link);
  }

  async function markAll() {
    await api.patch('/notifications/read-all');
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    setNotifUnread(0);
  }

  async function remove(n) {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    api.delete(`/notifications/${n.id}`).catch(() => {});
  }

  async function more() {
    setLoadingMore(true);
    try { await load(items[items.length - 1].createdAt); } finally { setLoadingMore(false); }
  }

  const shown = (items || []).filter((n) => filter === 'all' || !n.readAt);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">{t('nav.notifications')}</h1>
        {notifUnread > 0 && <button onClick={markAll} className="btn btn-secondary btn-sm"><CheckCheck className="w-4 h-4" /> {t('notif.markAll')}</button>}
      </div>
      <div className="mt-6 flex gap-2">
        <button className="chip" data-active={filter === 'all'} onClick={() => setFilter('all')}>{t('common.all')}</button>
        <button className="chip" data-active={filter === 'unread'} onClick={() => setFilter('unread')}>{t('notif.unread')} {notifUnread > 0 && <span className="ltr-nums">({notifUnread})</span>}</button>
      </div>

      <div className="mt-6 card p-2">
        {items === null ? (
          <div className="py-16 flex justify-center text-pine"><Spinner className="w-7 h-7" /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon={Bell} title={t('notif.empty')} text={t('notif.emptyText')} />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((n) => (
              <li key={n.id} className="group relative">
                {/* Phones have no hover, so the delete button is always shown there (with room for it). */}
                <div className="pe-10 md:pe-0"><NotificationItem n={n} onOpen={open} /></div>
                <button onClick={() => remove(n)} className="absolute top-3 end-2 md:end-3 btn btn-ghost btn-icon w-9 h-9 md:w-8 md:h-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100" aria-label={t('common.delete')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {hasMore && filter === 'all' && (
        <div className="text-center mt-6"><button onClick={more} className="btn btn-secondary" disabled={loadingMore}>{loadingMore ? <Spinner /> : t('common.loadMore')}</button></div>
      )}
    </div>
  );
}
