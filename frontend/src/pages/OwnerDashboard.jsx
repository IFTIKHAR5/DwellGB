// pages/OwnerDashboard.jsx — overview for owners.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Eye, Heart, CalendarClock, Star, Plus, ArrowRight, CircleCheck } from '@/components/icons';
import api, { mediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatRent, timeAgo } from '../lib/format';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import useDocumentTitle from '../hooks/useDocumentTitle';

function Stat({ icon: Icon, label, value, sub, tone = 'pine' }) {
  const tones = { pine: 'bg-pine-50 text-pine', brand: 'bg-brand-50 text-brand', gold: 'bg-warning-50 text-warning', success: 'bg-success-50 text-success' };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-2 font-medium">{label}</p>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="w-[18px] h-[18px]" /></span>
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold ltr-nums">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [listings, setListings] = useState([]);
  useDocumentTitle(t('nav.dashboard'));

  useEffect(() => {
    api.get('/listings/mine/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/bookings/received', { params: { status: 'pending' } }).then((r) => setPending(r.data.slice(0, 5))).catch(() => {});
    api.get('/listings/mine').then((r) => setListings(r.data)).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greet = hour < 12 ? t('dash.morning') : hour < 18 ? t('dash.afternoon') : t('dash.evening');

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-ink-2">{greet},</p>
          <h1 className="text-3xl font-extrabold">{user.name.split(' ')[0]}</h1>
        </div>
        <Link to="/dashboard/listings/new" className="btn btn-primary"><Plus className="w-4 h-4" /> {t('nav.newListing')}</Link>
      </div>

      <div className="mt-8 grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={Building2} label={t('dash.activeListings')} value={stats ? stats.listings.available : '—'} sub={stats && t('dash.ofTotal', { n: stats.listings.total, r: stats.listings.rented })} />
        <Stat icon={CalendarClock} tone="brand" label={t('dash.pendingRequests')} value={stats ? stats.requests.pending : '—'} sub={stats && t('dash.acceptedSoFar', { n: stats.requests.accepted })} />
        <Stat icon={Eye} tone="success" label={t('dash.totalViews')} value={stats ? stats.views : '—'} sub={stats && t('dash.saves', { n: stats.saves })} />
        <Stat icon={Star} tone="gold" label={t('dash.rating')} value={stats ? (stats.rating.count ? stats.rating.average.toFixed(1) : '—') : '—'} sub={stats && t('dash.reviews', { n: stats.rating.count })} />
      </div>

      <div className="mt-10 grid xl:grid-cols-[1.3fr_1fr] gap-6">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t('dash.newRequests')}</h2>
            <Link to="/dashboard/requests" className="text-sm font-semibold text-pine inline-flex items-center gap-1">{t('common.viewAll')} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></Link>
          </div>
          {pending.length === 0 ? (
            <div className="py-10 text-center text-muted text-sm flex flex-col items-center gap-2"><CircleCheck className="w-8 h-8 text-success" /> {t('dash.noPending')}</div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {pending.map((b) => (
                <li key={b.id} className="py-4 flex items-center gap-3">
                  <Avatar name={b.tenant?.name} src={b.tenant?.avatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><b>{b.tenant?.name}</b> <span className="text-ink-2">{t('dash.wantsToRent')}</span> <b>{b.listing?.title}</b></p>
                    <p className="text-xs text-muted mt-0.5">{timeAgo(b.createdAt, lang)} · {t('dash.people', { n: b.occupants })}</p>
                  </div>
                  <Link to="/dashboard/requests" className="btn btn-secondary btn-sm">{t('dash.review')}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t('dash.topListings')}</h2>
            <Link to="/dashboard/listings" className="text-sm font-semibold text-pine inline-flex items-center gap-1">{t('common.viewAll')} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></Link>
          </div>
          {listings.length === 0 ? (
            <div className="mt-4"><EmptyState icon={Building2} title={t('dash.noListings')} text={t('dash.noListingsText')} action={<Link to="/dashboard/listings/new" className="btn btn-primary">{t('nav.newListing')}</Link>} /></div>
          ) : (
            <ul className="mt-4 space-y-3">
              {[...listings].sort((a, b) => b.views - a.views).slice(0, 4).map((l) => (
                <li key={l.id}>
                  <Link to={`/listings/${l.id}`} className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-sunken">
                    <img src={mediaUrl(l.cover)} alt="" className="w-14 h-14 rounded-xl object-cover bg-sunken" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{l.title}</p>
                      <p className="text-xs text-muted ltr-nums">{formatRent(l.rent)} · {l.area}</p>
                    </div>
                    <span className="text-xs text-ink-2 inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> <span className="ltr-nums">{l.views}</span></span>
                    <span className="text-xs text-ink-2 inline-flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> <span className="ltr-nums">{l.savesCount}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
