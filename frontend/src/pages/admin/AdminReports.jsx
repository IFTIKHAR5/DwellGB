// pages/admin/AdminReports.jsx — the moderation queue (oldest open report first).
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Flag, CircleCheck, X, Building2, User as UserIcon } from '@/components/icons';
import api, { apiError, mediaUrl } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { timeAgo } from '../../lib/format';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/admin/Pagination';
import ReasonModal from '../../components/admin/ReasonModal';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function AdminReports() {
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState('open');
  const [targetType, setTargetType] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [action, setAction] = useState(null); // { report, status }
  const [enforce, setEnforce] = useState('none');
  useDocumentTitle(t('admin.reports'));

  const load = useCallback(() => {
    api.get('/admin/reports', { params: { status, targetType: targetType || undefined, page } })
      .then((r) => setData(r.data))
      .catch((err) => { toast.error(apiError(err)); setData({ items: [], total: 0, pages: 1, counts: {} }); });
  }, [status, targetType, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, targetType]);

  async function confirm(resolution) {
    try {
      await api.patch(`/admin/reports/${action.report.id}`, { status: action.status, resolution: resolution || undefined, enforce: action.status === 'resolved' ? enforce : 'none' });
      toast.success(action.status === 'resolved' ? t('admin.done.resolve') : t('admin.done.dismiss'));
      setAction(null);
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const counts = data?.counts || {};

  return (
    <div>
      <h1 className="text-3xl font-extrabold">{t('admin.reports')}</h1>
      <p className="text-ink-2 mt-1">{t('admin.reportsSub')}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {['open', 'resolved', 'dismissed'].map((s) => (
          <button key={s} className="chip" data-active={status === s} onClick={() => setStatus(s)}>
            {t(`status.${s}`)} <span className="ltr-nums opacity-70">{counts[s] ?? ''}</span>
          </button>
        ))}
        <select className="input h-9 w-auto rounded-full text-sm ms-auto" value={targetType} onChange={(e) => setTargetType(e.target.value)} aria-label="Type">
          <option value="">{t('admin.allTypes')}</option>
          <option value="listing">{t('admin.listings')}</option>
          <option value="user">{t('admin.users')}</option>
        </select>
      </div>

      <div className="mt-6 space-y-4">
        {data === null && Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        {data?.items.length === 0 && (
          <EmptyState icon={status === 'open' ? CircleCheck : Flag} title={status === 'open' ? t('admin.queueEmpty') : t('admin.noReports')} text={status === 'open' ? t('admin.queueEmptyText') : undefined} />
        )}
        {data?.items.map((r) => (
          <article key={r.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-50 text-danger font-semibold text-xs">
                <Flag className="w-3.5 h-3.5" /> {t(`reason.${r.reason}`)}
              </span>
              <span className="text-muted">{t('admin.reportedBy', { name: r.reporter?.name || '—', when: timeAgo(r.createdAt, lang) })}</span>
              <StatusBadge status={r.status} className="ms-auto" />
            </div>

            <div className="mt-4 rounded-2xl border border-line p-3">
              {r.targetType === 'listing' ? (
                r.listing ? (
                  <div className="flex items-center gap-3">
                    <img src={mediaUrl(r.listing.cover)} alt="" className="w-16 h-12 rounded-lg object-cover bg-sunken" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/listings/${r.listing.id}`} className="font-semibold hover:underline line-clamp-1 flex items-center gap-1.5"><Building2 className="w-4 h-4 text-muted shrink-0" /> {r.listing.title}</Link>
                      <p className="text-xs text-muted">{r.listing.area}, {t(`district.${r.listing.district}`)} · <Link to={`/admin/users?open=${r.listing.ownerId}`} className="text-pine font-semibold">{r.listing.ownerName}</Link></p>
                    </div>
                    <StatusBadge status={r.listing.status} />
                  </div>
                ) : <p className="text-sm text-muted">{t('common.listingRemoved')}</p>
              ) : r.user ? (
                <div className="flex items-center gap-3">
                  <Avatar name={r.user.name} src={r.user.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <Link to={`/admin/users?open=${r.user.id}`} className="font-semibold hover:underline flex items-center gap-1.5"><UserIcon className="w-4 h-4 text-muted" /> {r.user.name}</Link>
                    <p className="text-xs text-muted">{t(`role.${r.user.role}`)}</p>
                  </div>
                  <StatusBadge status={r.user.isActive ? 'active' : 'banned'} />
                </div>
              ) : <p className="text-sm text-muted">—</p>}
            </div>

            {r.details && <p className="mt-3 text-sm text-ink-2 bg-sunken rounded-xl p-3 whitespace-pre-line">“{r.details}”</p>}
            {r.status !== 'open' && (
              <p className="mt-3 text-sm text-ink-2">
                <b>{r.resolvedBy || '—'}</b>: {r.resolution} <span className="text-xs text-muted">· {timeAgo(r.resolvedAt, lang)}</span>
              </p>
            )}

            {r.status === 'open' && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn btn-dark btn-sm" onClick={() => { setEnforce(r.targetType === 'listing' ? 'remove_listing' : 'ban_user'); setAction({ report: r, status: 'resolved' }); }}>
                  <CircleCheck className="w-4 h-4" /> {t('admin.takeAction')}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setAction({ report: r, status: 'dismissed' })}><X className="w-4 h-4" /> {t('admin.dismiss')}</button>
              </div>
            )}
          </article>
        ))}
      </div>
      {data && <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />}

      <ReasonModal
        open={!!action}
        onClose={() => setAction(null)}
        title={action?.status === 'resolved' ? t('admin.resolveTitle') : t('admin.dismissTitle')}
        text={action?.status === 'resolved' ? t('admin.resolveText') : t('admin.dismissText')}
        label={t('admin.resolutionNote')}
        placeholder={t('admin.resolutionPlaceholder')}
        confirmLabel={action?.status === 'resolved' ? t('admin.confirmAction') : t('admin.dismiss')}
        danger={action?.status === 'resolved' && enforce !== 'none'}
        onConfirm={confirm}
      >
        {action?.status === 'resolved' && (
          <fieldset className="mt-4 space-y-2">
            <legend className="label">{t('admin.enforcement')}</legend>
            {[
              ...(action.report.targetType === 'listing' ? [{ v: 'remove_listing', l: t('admin.enf.remove_listing') }] : []),
              { v: 'ban_user', l: action.report.targetType === 'listing' ? t('admin.enf.ban_owner') : t('admin.enf.ban_user') },
              { v: 'none', l: t('admin.enf.none') },
            ].map((o) => (
              <label key={o.v} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm ${enforce === o.v ? 'border-pine bg-pine-50' : 'border-line'}`}>
                <input type="radio" name="enforce" checked={enforce === o.v} onChange={() => setEnforce(o.v)} className="accent-[var(--color-pine)]" /> {o.l}
              </label>
            ))}
          </fieldset>
        )}
      </ReasonModal>
    </div>
  );
}
