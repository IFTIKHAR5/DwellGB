// pages/OwnerListings.jsx — manage own listings.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, Heart, CalendarClock, Building2, ExternalLink } from '@/components/icons';
import api, { apiError, mediaUrl } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { formatRent, timeAgo } from '../lib/format';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function OwnerListings() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  useDocumentTitle(t('nav.myListings'));

  useEffect(() => {
    api.get('/listings/mine').then((r) => setItems(r.data)).catch((err) => { toast.error(apiError(err)); setItems([]); });
  }, []);

  async function setStatus(l, status) {
    const prev = items;
    setItems((xs) => xs.map((x) => (x.id === l.id ? { ...x, status } : x)));
    try {
      await api.patch(`/listings/${l.id}/status`, { status });
      toast.success(t('owner.statusUpdated'));
    } catch (err) {
      setItems(prev);
      toast.error(apiError(err));
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.delete(`/listings/${toDelete.id}`);
      setItems((xs) => xs.filter((x) => x.id !== toDelete.id));
      toast.success(t('owner.deleted'));
      setToDelete(null);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{t('nav.myListings')}</h1>
          {items && <p className="text-ink-2 mt-1">{t('owner.count', { n: items.length })}</p>}
        </div>
        <Link to="/dashboard/listings/new" className="btn btn-primary"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t('nav.newListing')}</span></Link>
      </div>

      <div className="mt-8 space-y-4">
        {items === null && Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        {items?.length === 0 && (
          <EmptyState icon={Building2} title={t('dash.noListings')} text={t('dash.noListingsText')} action={<Link to="/dashboard/listings/new" className="btn btn-primary"><Plus className="w-4 h-4" /> {t('nav.newListing')}</Link>} />
        )}
        {items?.map((l) => (
          <article key={l.id} className="card p-4 flex flex-col sm:flex-row gap-4">
            <Link to={`/listings/${l.id}`} className="shrink-0">
              <img src={mediaUrl(l.cover)} alt="" className="w-full sm:w-44 h-40 sm:h-28 rounded-xl object-cover bg-sunken" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/listings/${l.id}`} className="font-bold hover:underline line-clamp-1">{l.title}</Link>
                  <p className="text-sm text-muted">{l.area}, {t(`district.${l.district}`)} · <span className="ltr-nums">{formatRent(l.rent)}</span>/{t('listing.month')}</p>
                </div>
                {l.status === 'removed' ? (
                  <span className="shrink-0 inline-flex px-2.5 py-1 rounded-full bg-danger-50 text-danger text-xs font-semibold">{t('status.removed')}</span>
                ) : (
                <select
                  value={l.status}
                  onChange={(e) => setStatus(l, e.target.value)}
                  className={`input h-9 w-auto text-xs font-semibold rounded-full ${l.status === 'available' ? 'text-success' : 'text-ink-2'}`}
                  aria-label={t('owner.status')}
                >
                  {['available', 'rented', 'hidden'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                </select>
                )}
              </div>
              {!l.ownerApproved && l.status !== 'removed' && (
                <p className="mt-2 text-sm text-warning bg-warning-50 rounded-xl px-3 py-2">{t('owner.waitingApproval')}</p>
              )}
              {l.status === 'removed' && (
                <p className="mt-2 text-sm text-danger bg-danger-50 rounded-xl px-3 py-2">{t('owner.removedNotice', { reason: l.moderationReason || '—' })}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-2">
                <span className="inline-flex items-center gap-1.5"><Eye className="w-4 h-4" /> <span className="ltr-nums">{l.views}</span> {t('owner.views')}</span>
                <span className="inline-flex items-center gap-1.5"><Heart className="w-4 h-4" /> <span className="ltr-nums">{l.savesCount}</span> {t('owner.saves')}</span>
                {l.pendingRequests > 0 && (
                  <Link to="/dashboard/requests" className="inline-flex items-center gap-1.5 text-brand font-semibold"><CalendarClock className="w-4 h-4" /> {t('owner.pending', { n: l.pendingRequests })}</Link>
                )}
                <span className="text-xs text-muted">{t('owner.updated', { when: timeAgo(l.updatedAt, lang) })}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to={`/dashboard/listings/${l.id}/edit`} className="btn btn-secondary btn-sm"><Pencil className="w-4 h-4" /> {t('common.edit')}</Link>
                <Link to={`/listings/${l.id}`} className="btn btn-ghost btn-sm"><ExternalLink className="w-4 h-4" /> {t('common.view')}</Link>
                <button onClick={() => setToDelete(l)} className="btn btn-ghost btn-sm text-danger ms-auto"><Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">{t('common.delete')}</span></button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        title={t('owner.deleteTitle')}
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setToDelete(null)} disabled={deleting}>{t('common.cancel')}</button>
            <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>{deleting ? <Spinner /> : t('common.delete')}</button>
          </>
        }
      >
        <p className="text-ink-2">{t('owner.deleteText', { title: toDelete?.title || '' })}</p>
      </Modal>
    </div>
  );
}
