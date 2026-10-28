// pages/OwnerBookings.jsx — incoming rental requests for the owner.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, X, MessageCircle, CalendarDays, Users, Phone, Inbox } from '@/components/icons';
import api, { apiError, mediaUrl } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useRealtime } from '../context/RealtimeContext';
import { formatDate, timeAgo, localPhone } from '../lib/format';
import Avatar from '../components/ui/Avatar';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Field } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';
import useDocumentTitle from '../hooks/useDocumentTitle';

const TABS = ['pending', 'accepted', 'rejected', 'all'];

export default function OwnerBookings() {
  const { t, lang } = useLanguage();
  const { subscribe } = useRealtime();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState('pending');
  const [action, setAction] = useState(null); // { booking, status }
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useDocumentTitle(t('nav.requests'));

  const load = () => api.get('/bookings/received').then((r) => setItems(r.data)).catch((err) => { toast.error(apiError(err)); setItems([]); });
  useEffect(() => { load(); }, []);
  // Refresh when a new request / cancellation arrives.
  useEffect(() => subscribe('notification:new', (n) => { if (n.type.startsWith('booking_')) load(); }), [subscribe]);

  const counts = useMemo(() => {
    const c = { all: items?.length || 0 };
    for (const b of items || []) c[b.status] = (c[b.status] || 0) + 1;
    return c;
  }, [items]);
  const shown = (items || []).filter((b) => tab === 'all' || b.status === tab);

  async function respond() {
    setBusy(true);
    try {
      await api.patch(`/bookings/${action.booking.id}/status`, { status: action.status, note: note || undefined });
      toast.success(action.status === 'accepted' ? t('owner.accepted') : t('owner.declined'));
      setAction(null);
      setNote('');
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function message(b) {
    try {
      const { data } = await api.post('/conversations', { listingId: b.listing.id, tenantId: b.tenant.id });
      navigate(`/messages/${data.id}`);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">{t('nav.requests')}</h1>
      <p className="text-ink-2 mt-1">{t('owner.requestsSub')}</p>

      <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((k) => (
          <button key={k} className="chip shrink-0" data-active={tab === k} onClick={() => setTab(k)}>
            {k === 'all' ? t('common.all') : t(`status.${k}`)} <span className="ltr-nums opacity-70">{counts[k] || 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {items === null && Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        {items && shown.length === 0 && <EmptyState icon={Inbox} title={t('owner.noRequests')} text={t('owner.noRequestsText')} />}
        {shown.map((b) => (
          <article key={b.id} className="card p-5">
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex items-start gap-3 md:w-64 shrink-0">
                <Avatar name={b.tenant?.name} src={b.tenant?.avatar} size="md" />
                <div className="min-w-0">
                  <p className="font-bold truncate">{b.tenant?.name}</p>
                  {b.tenant?.place && <p className="text-xs text-muted truncate">{b.tenant.place}</p>}
                  <p className="text-xs text-muted">{t('detail.memberSince', { date: formatDate(b.tenant?.memberSince, lang, { month: 'short', year: 'numeric' }) })}</p>
                  {b.tenant?.phone && (
                    <a href={`tel:+${b.tenant.phone}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-pine"><Phone className="w-3 h-3" /> <span className="ltr-nums">{localPhone(b.tenant.phone)}</span></a>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  {b.listing ? (
                    <Link to={`/listings/${b.listing.id}`} className="flex items-center gap-3 min-w-0 group">
                      <img src={mediaUrl(b.listing.cover)} alt="" className="w-12 h-12 rounded-lg object-cover bg-sunken shrink-0" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-sm truncate group-hover:underline">{b.listing.title}</span>
                        <span className="block text-xs text-muted">{b.listing.area}</span>
                      </span>
                    </Link>
                  ) : <span className="text-sm text-muted">{t('common.listingRemoved')}</span>}
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {b.moveInDate ? formatDate(b.moveInDate, lang) : t('owner.flexible')}</span>
                  <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {t('dash.people', { n: b.occupants })}</span>
                  <span className="text-xs text-muted self-center">{timeAgo(b.createdAt, lang)}</span>
                </div>
                {b.message && <p className="mt-3 text-sm bg-sunken rounded-xl p-3 text-ink-2 whitespace-pre-line">“{b.message}”</p>}
                {b.ownerNote && b.status !== 'pending' && <p className="mt-2 text-xs text-muted">{t('owner.yourNote')}: {b.ownerNote}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {b.status === 'pending' && (
                    <>
                      <button className="btn btn-dark btn-sm" onClick={() => setAction({ booking: b, status: 'accepted' })}><Check className="w-4 h-4" /> {t('owner.accept')}</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setAction({ booking: b, status: 'rejected' })}><X className="w-4 h-4" /> {t('owner.decline')}</button>
                    </>
                  )}
                  {b.listing && b.tenant && (
                    <button className="btn btn-ghost btn-sm" onClick={() => message(b)}><MessageCircle className="w-4 h-4" /> {t('owner.messageTenant')}</button>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={!!action}
        onClose={() => !busy && setAction(null)}
        title={action?.status === 'accepted' ? t('owner.acceptTitle') : t('owner.declineTitle')}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAction(null)} disabled={busy}>{t('common.cancel')}</button>
            <button className={`btn ${action?.status === 'accepted' ? 'btn-dark' : 'btn-danger'}`} onClick={respond} disabled={busy}>
              {busy ? <Spinner /> : action?.status === 'accepted' ? t('owner.accept') : t('owner.decline')}
            </button>
          </>
        }
      >
        <p className="text-ink-2 text-sm">{action?.status === 'accepted' ? t('owner.acceptText') : t('owner.declineText')}</p>
        <Field label={t('owner.noteLabel')} className="mt-4">
          <textarea className="input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('owner.notePlaceholder')} />
        </Field>
      </Modal>
    </div>
  );
}
