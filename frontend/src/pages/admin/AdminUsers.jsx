// pages/admin/AdminUsers.jsx — search, verify and ban users.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, BadgeCheck, Ban, RotateCcw, Eye, Phone, Mail, MapPin, ExternalLink, ShieldAlert, Users } from '@/components/icons';
import api, { apiError } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate, timeAgo, localPhone } from '../../lib/format';
import useDebounce from '../../hooks/useDebounce';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import Pagination from '../../components/admin/Pagination';
import ReasonModal from '../../components/admin/ReasonModal';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import VerificationReview from '../../components/verification/VerificationReview';
import { Badge } from '../../components/ui/badge';

function UserDetail({ id, onClose, onChanged }) {
  const { t, lang } = useLanguage();
  const [u, setU] = useState(null);
  const [cnic, setCnic] = useState(null);
  const [banOpen, setBanOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const load = useCallback(() => {
    setCnic(null);
    api.get(`/admin/users/${id}`).then((r) => setU(r.data)).catch((err) => { toast.error(apiError(err)); closeRef.current(); });
  }, [id]);
  useEffect(() => { setU(null); load(); }, [load]);

  async function act(action, reason) {
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/users/${id}`, { action, reason });
      toast.success(t(`admin.done.${action}`));
      onChanged(data);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    try {
      const { data } = await api.post(`/admin/users/${id}/cnic`);
      setCnic(data.cnic || '—');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);

  return (
    <Modal open onClose={onClose} title={t('admin.userDetails')} size="xl">
      {!u ? (
        <div className="py-16 flex justify-center text-pine"><Spinner className="w-7 h-7" /></div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar name={u.name} src={u.avatar} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold flex items-center gap-1.5">{u.name} {u.isVerified && <BadgeCheck className="w-5 h-5 text-pine" />}</p>
              <p className="text-sm text-muted">{t(`role.${u.role}`)} · {t('detail.memberSince', { date: formatDate(u.createdAt, lang) })}{u.lastSeenAt ? ` · ${t('chat.lastSeen', { when: timeAgo(u.lastSeenAt, lang) })}` : ''}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={u.isActive ? 'active' : 'banned'} />
                {u.authProviders.map((p) => <span key={p} className="px-2.5 py-1 rounded-full bg-sunken text-xs font-semibold">{p === 'google' ? 'Google' : t('auth.password')}</span>)}
              </div>
            </div>
            {u.role !== 'admin' && (
              <div className="flex flex-wrap gap-2">
                {u.isActive
                  ? <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => setBanOpen(true)}><Ban className="w-4 h-4" /> {t('admin.ban')}</button>
                  : <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => act('unban')}><RotateCcw className="w-4 h-4" /> {t('admin.unban')}</button>}
              </div>
            )}
          </div>

          {!u.isActive && u.banReason && (
            <p className="rounded-xl bg-danger-50 text-danger text-sm p-3 flex gap-2"><ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /> {t('admin.bannedFor', { reason: u.banReason, when: formatDate(u.bannedAt, lang) })}</p>
          )}

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted" /> <span className="ltr-nums">{u.phone ? localPhone(u.phone) : '—'}</span></p>
            <p className="flex items-center gap-2 min-w-0"><Mail className="w-4 h-4 text-muted shrink-0" /> <span className="truncate">{u.email || '—'}</span></p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted" /> {u.place || '—'}</p>
            <p><span className="text-muted">{t('auth.fatherName')}:</span> {u.fatherName || '—'}</p>
            {u.hasCnic && (
              <p className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <span className="text-muted">{t('auth.cnic')}:</span>
                <span className="font-semibold ltr-nums">{cnic || u.cnicMasked}</span>
                {!cnic && <button className="btn btn-ghost btn-sm" onClick={reveal}><Eye className="w-4 h-4" /> {t('admin.revealCnic')}</button>}
                {cnic && <span className="text-xs text-muted">{t('admin.cnicLogged')}</span>}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: t('nav.myListings'), v: u.listings.length },
              { l: t('admin.requestsSent'), v: sum(u.bookings.asTenant) },
              { l: t('admin.requestsReceived'), v: sum(u.bookings.asOwner) },
              { l: t('admin.reportsAgainst'), v: u.reportsAgainst.length },
            ].map((x) => (
              <div key={x.l} className="rounded-xl bg-sunken p-3">
                <p className="text-xs text-muted">{x.l}</p>
                <p className="text-xl font-bold ltr-nums">{x.v}</p>
              </div>
            ))}
          </div>

          {u.role === 'owner' && (
            <div>
              <p className="font-bold mb-2 flex items-center gap-2">
                {t('admin.identityDocuments')}
                <Badge variant={{ approved: 'success', pending: 'warning', rejected: 'destructive' }[u.verification?.status] || 'secondary'}>
                  {t(`verify.status.${u.verification?.status || 'not_submitted'}`)}
                </Badge>
              </p>
              <VerificationReview user={u} onReviewed={(fresh) => { onChanged(fresh); load(); }} />
            </div>
          )}

          {u.listings.length > 0 && (
            <div>
              <p className="font-bold mb-2">{t('admin.listings')}</p>
              <ul className="divide-y divide-line border border-line rounded-xl">
                {u.listings.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <Link to={`/listings/${l.id}`} className="flex-1 truncate hover:underline">{l.title}</Link>
                    <StatusBadge status={l.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {u.reportsAgainst.length > 0 && (
            <div>
              <p className="font-bold mb-2">{t('admin.reportsAgainst')}</p>
              <ul className="space-y-2">
                {u.reportsAgainst.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line p-3 text-sm">
                    <div className="flex justify-between gap-2"><b>{t(`reason.${r.reason}`)}</b><StatusBadge status={r.status} /></div>
                    {r.details && <p className="text-ink-2 mt-1">{r.details}</p>}
                    <p className="text-xs text-muted mt-1">{r.reporter} · {timeAgo(r.createdAt, lang)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}
      <ReasonModal
        open={banOpen}
        onClose={() => setBanOpen(false)}
        title={t('admin.banTitle', { name: u?.name || '' })}
        text={t('admin.banText')}
        label={t('admin.reason')}
        placeholder={t('admin.banPlaceholder')}
        confirmLabel={t('admin.ban')}
        danger
        requireReason
        onConfirm={async (reason) => { await act('ban', reason); setBanOpen(false); }}
      />
    </Modal>
  );
}

export default function AdminUsers() {
  const { t, lang } = useLanguage();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 350);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const openId = sp.get('open');
  useDocumentTitle(t('admin.users'));

  const load = useCallback(() => {
    api.get('/admin/users', { params: { q: debounced || undefined, role: role || undefined, status: status || undefined, page } })
      .then((r) => setData(r.data))
      .catch((err) => { toast.error(apiError(err)); setData({ items: [], total: 0, pages: 1 }); });
  }, [debounced, role, status, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debounced, role, status]);

  const open = (id) => setSp(id ? { open: id } : {});
  const onChanged = (fresh) => setData((d) => d && { ...d, items: d.items.map((x) => (x.id === fresh.id ? { ...x, ...fresh } : x)) });

  return (
    <div>
      <h1 className="text-3xl font-extrabold">{t('admin.users')}</h1>
      <p className="text-ink-2 mt-1">{t('admin.usersSub')}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input ps-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.searchUsers')} />
        </div>
        <select className="input w-auto" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          <option value="">{t('admin.allRoles')}</option>
          {['owner', 'tenant', 'admin'].map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">{t('admin.anyStatus')}</option>
          <option value="active">{t('status.active')}</option>
          <option value="banned">{t('status.banned')}</option>
        </select>
      </div>

      <div className="mt-6 card overflow-hidden">
        {data === null ? (
          <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12" />)}</div>
        ) : data.items.length === 0 ? (
          <div className="p-4"><EmptyState icon={Users} title={t('admin.noUsers')} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sunken text-ink-2">
                <tr>
                  <th className="text-start font-semibold px-4 py-3">{t('admin.user')}</th>
                  <th className="text-start font-semibold px-4 py-3 hidden md:table-cell">{t('admin.contact')}</th>
                  <th className="text-start font-semibold px-4 py-3">{t('admin.role')}</th>
                  <th className="text-start font-semibold px-4 py-3 hidden lg:table-cell">{t('admin.joined')}</th>
                  <th className="text-start font-semibold px-4 py-3">{t('admin.status')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-canvas cursor-pointer" onClick={() => open(u.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={u.name} src={u.avatar} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold truncate flex items-center gap-1">{u.name} {u.isVerified && <BadgeCheck className="w-4 h-4 text-pine shrink-0" />}</p>
                          <p className="text-xs text-muted truncate">{u.place || '—'}{u.openReports > 0 && <span className="text-warning font-semibold"> · {t('admin.nReports', { n: u.openReports })}</span>}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-ink-2">
                      <p className="ltr-nums">{u.phone ? localPhone(u.phone) : ''}</p>
                      <p className="text-xs truncate max-w-[200px]">{u.email || ''}</p>
                    </td>
                    <td className="px-4 py-3">{t(`role.${u.role}`)}{u.role === 'owner' && <span className="text-xs text-muted ltr-nums"> · {u.listingsCount}</span>}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-ink-2">{formatDate(u.createdAt, lang)}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.isActive ? 'active' : 'banned'} /></td>
                    <td className="px-4 py-3 text-end"><ExternalLink className="w-4 h-4 text-muted inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {data && <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />}

      {openId && <UserDetail id={openId} onClose={() => open(null)} onChanged={onChanged} />}
    </div>
  );
}
