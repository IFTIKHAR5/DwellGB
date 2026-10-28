// pages/MyBookings.jsx — tenant's rental requests + reviews.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarDays, Users, Phone, MessageCircle, Star, Search, CalendarCheck } from '@/components/icons';
import api, { apiError, mediaUrl } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useRealtime } from '../context/RealtimeContext';
import { formatDate, formatRent, timeAgo, localPhone, whatsappLink } from '../lib/format';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { StarInput } from '../components/ui/StarRating';
import { Field } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function MyBookings() {
  const { t, lang } = useLanguage();
  const { subscribe } = useRealtime();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [reviewFor, setReviewFor] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  useDocumentTitle(t('nav.myRequests'));

  const load = () => api.get('/bookings/mine').then((r) => setItems(r.data)).catch((err) => { toast.error(apiError(err)); setItems([]); });
  useEffect(() => { load(); }, []);
  useEffect(() => subscribe('notification:new', (n) => { if (n.type.startsWith('booking_')) load(); }), [subscribe]);

  async function cancel(b) {
    try {
      await api.patch(`/bookings/${b.id}/cancel`);
      toast.success(t('detail.requestCancelled'));
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!rating) return toast.error(t('review.pickStars'));
    setBusy(true);
    try {
      await api.post('/reviews', { bookingId: reviewFor.id, rating, comment: comment || undefined });
      toast.success(t('review.thanks'));
      setReviewFor(null);
      setRating(0);
      setComment('');
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function message(b) {
    try {
      const { data } = await api.post('/conversations', { listingId: b.listing.id });
      navigate(`/messages/${data.id}`);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">{t('nav.myRequests')}</h1>
      <p className="text-ink-2 mt-1">{t('tenant.requestsSub')}</p>

      <div className="mt-8 space-y-4">
        {items === null && Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        {items?.length === 0 && (
          <EmptyState icon={CalendarCheck} title={t('tenant.noRequests')} text={t('tenant.noRequestsText')} action={<Link to="/listings" className="btn btn-primary"><Search className="w-4 h-4" /> {t('nav.browse')}</Link>} />
        )}
        {items?.map((b) => (
          <article key={b.id} className="card p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
            {b.listing ? (
              <Link to={`/listings/${b.listing.id}`} className="shrink-0">
                <img src={mediaUrl(b.listing.cover)} alt="" className="w-full sm:w-40 h-40 sm:h-28 rounded-xl object-cover bg-sunken" />
              </Link>
            ) : <div className="w-full sm:w-40 h-28 rounded-xl bg-sunken shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {b.listing ? (
                    <Link to={`/listings/${b.listing.id}`} className="font-bold hover:underline line-clamp-1">{b.listing.title}</Link>
                  ) : <p className="font-bold text-muted">{t('common.listingRemoved')}</p>}
                  {b.listing && <p className="text-sm text-muted">{b.listing.area}, {t(`district.${b.listing.district}`)} · <span className="ltr-nums">{formatRent(b.listing.rent)}</span></p>}
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {b.moveInDate ? formatDate(b.moveInDate, lang) : t('owner.flexible')}</span>
                <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {t('dash.people', { n: b.occupants })}</span>
                <span className="text-xs text-muted self-center">{t('tenant.sent', { when: timeAgo(b.createdAt, lang) })}</span>
              </div>
              {b.ownerNote && <p className="mt-2 text-sm bg-sunken rounded-xl p-3 text-ink-2">{t('tenant.ownerSaid')}: “{b.ownerNote}”</p>}

              {b.status === 'accepted' && b.owner?.phone && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-success-50 p-3">
                  <span className="text-sm font-semibold text-success me-auto">{t('tenant.contactOwner', { name: b.owner.name })}</span>
                  <a href={`tel:+${b.owner.phone}`} className="btn btn-dark btn-sm"><Phone className="w-4 h-4" /> <span className="ltr-nums">{localPhone(b.owner.phone)}</span></a>
                  <a href={whatsappLink(b.owner.phone)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">WhatsApp</a>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {b.listing && <button className="btn btn-ghost btn-sm" onClick={() => message(b)}><MessageCircle className="w-4 h-4" /> {t('detail.messageOwner')}</button>}
                {b.status === 'pending' && <button className="btn btn-ghost btn-sm text-danger" onClick={() => cancel(b)}>{t('detail.cancelRequest')}</button>}
                {b.status === 'accepted' && !b.reviewed && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setReviewFor(b)}><Star className="w-4 h-4" /> {t('review.leave')}</button>
                )}
                {b.reviewed && <span className="text-xs text-muted self-center inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-gold text-gold" /> {t('review.done')}</span>}
              </div>
            </div>
          </article>
        ))}
      </div>

      <Modal open={!!reviewFor} onClose={() => !busy && setReviewFor(null)} title={t('review.title', { name: reviewFor?.owner?.name || '' })}>
        <form onSubmit={submitReview} className="space-y-5">
          <p className="text-sm text-ink-2">{t('review.subtitle')}</p>
          <div className="flex justify-center"><StarInput value={rating} onChange={setRating} /></div>
          <Field label={t('review.comment')}>
            <textarea className="input" rows={4} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('review.placeholder')} />
          </Field>
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : t('review.submit')}</button>
        </form>
      </Modal>
    </div>
  );
}
