// pages/admin/AdminListings.jsx — review and moderate every listing.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Trash2, RotateCcw, ShieldOff, Flag, Eye, Building2, ExternalLink } from '@/components/icons';
import api, { apiError, mediaUrl } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { DISTRICTS } from '../../lib/constants';
import { formatRent, timeAgo } from '../../lib/format';
import useDebounce from '../../hooks/useDebounce';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/admin/Pagination';
import ReasonModal from '../../components/admin/ReasonModal';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function AdminListings() {
  const { t, lang } = useLanguage();
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 350);
  const [status, setStatus] = useState('');
  const [district, setDistrict] = useState('');
  const [reported, setReported] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null); // { type: 'remove'|'restore'|'delete', listing }
  useDocumentTitle(t('admin.listings'));

  const load = useCallback(() => {
    api.get('/admin/listings', { params: { q: debounced || undefined, status: status || undefined, district: district || undefined, reported: reported || undefined, page } })
      .then((r) => setData(r.data))
      .catch((err) => { toast.error(apiError(err)); setData({ items: [], total: 0, pages: 1 }); });
  }, [debounced, status, district, reported, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debounced, status, district, reported]);

  async function confirm(reason) {
    const { type, listing } = modal;
    try {
      if (type === 'delete') await api.delete(`/admin/listings/${listing.id}`);
      else await api.patch(`/admin/listings/${listing.id}`, { action: type, reason: reason || undefined });
      toast.success(t(`admin.done.${type}Listing`));
      setModal(null);
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const modalCopy = {
    remove: { title: t('admin.removeTitle'), text: t('admin.removeText'), label: t('admin.reason'), confirm: t('admin.remove'), danger: true, require: true },
    restore: { title: t('admin.restoreTitle'), text: t('admin.restoreText'), confirm: t('admin.restore') },
    delete: { title: t('admin.deleteTitle'), text: t('admin.deleteText'), confirm: t('common.delete'), danger: true },
  }[modal?.type] || {};

  return (
    <div>
      <h1 className="text-3xl font-extrabold">{t('admin.listings')}</h1>
      <p className="text-ink-2 mt-1">{t('admin.listingsSub')}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input ps-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.searchListings')} />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('admin.status')}>
          <option value="">{t('admin.anyStatus')}</option>
          {['available', 'rented', 'hidden', 'removed'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
        <select className="input w-auto" value={district} onChange={(e) => setDistrict(e.target.value)} aria-label={t('filters.district')}>
          <option value="">{t('home.allDistricts')}</option>
          {DISTRICTS.map((d) => <option key={d} value={d}>{t(`district.${d}`)}</option>)}
        </select>
        <button className="chip h-[2.9rem]" data-active={reported} onClick={() => setReported((r) => !r)}><Flag className="w-4 h-4" /> {t('admin.onlyReported')}</button>
      </div>

      <div className="mt-6 space-y-3">
        {data === null && Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        {data?.items.length === 0 && <EmptyState icon={Building2} title={t('admin.noListings')} />}
        {data?.items.map((l) => (
          <article key={l.id} className="card p-4 flex flex-col sm:flex-row gap-4">
            <Link to={`/listings/${l.id}`} className="shrink-0">
              <img src={mediaUrl(l.cover)} alt="" className="w-full sm:w-36 h-36 sm:h-24 rounded-xl object-cover bg-sunken" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/listings/${l.id}`} className="font-bold hover:underline line-clamp-1">{l.title}</Link>
                  <p className="text-sm text-muted">
                    {l.area}, {t(`district.${l.district}`)} · <span className="ltr-nums">{formatRent(l.rent)}</span> · {timeAgo(l.createdAt, lang)}
                  </p>
                  {l.owner && (
                    <Link to={`/admin/users?open=${l.owner.id}`} className="text-sm text-pine font-semibold hover:underline">
                      {l.owner.name}{!l.owner.isActive && <span className="text-danger"> ({t('status.banned')})</span>}
                    </Link>
                  )}
                </div>
                <StatusBadge status={l.status} />
              </div>
              {l.status === 'removed' && l.moderationReason && <p className="mt-2 text-sm text-danger">{t('admin.removedFor', { reason: l.moderationReason })}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-2 inline-flex items-center gap-1 me-2"><Eye className="w-3.5 h-3.5" /> <span className="ltr-nums">{l.views}</span></span>
                {l.openReports > 0 && (
                  <Link to="/admin/reports" className="text-xs font-semibold text-warning inline-flex items-center gap-1 me-2"><Flag className="w-3.5 h-3.5" /> {t('admin.nReports', { n: l.openReports })}</Link>
                )}
                <Link to={`/listings/${l.id}`} className="btn btn-ghost btn-sm"><ExternalLink className="w-4 h-4" /> {t('common.view')}</Link>
                {l.status === 'removed' ? (
                  <button className="btn btn-secondary btn-sm" onClick={() => setModal({ type: 'restore', listing: l })}><RotateCcw className="w-4 h-4" /> {t('admin.restore')}</button>
                ) : (
                  <button className="btn btn-secondary btn-sm text-danger" onClick={() => setModal({ type: 'remove', listing: l })}><ShieldOff className="w-4 h-4" /> {t('admin.remove')}</button>
                )}
                <button className="btn btn-ghost btn-sm text-danger ms-auto" onClick={() => setModal({ type: 'delete', listing: l })} aria-label={t('common.delete')}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {data && <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />}

      <ReasonModal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modalCopy.title}
        text={modal ? `${modalCopy.text} — “${modal.listing.title}”` : ''}
        label={modalCopy.label}
        placeholder={t('admin.removePlaceholder')}
        confirmLabel={modalCopy.confirm}
        danger={modalCopy.danger}
        requireReason={modalCopy.require}
        onConfirm={confirm}
      />
    </div>
  );
}
