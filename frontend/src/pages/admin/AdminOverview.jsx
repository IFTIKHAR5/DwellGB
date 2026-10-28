// pages/admin/AdminOverview.jsx — platform health at a glance.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, CalendarCheck, Flag, MessageCircle, BadgeCheck, Ban, Star, ArrowRight, IdCard } from '@/components/icons';
import api, { apiError, mediaUrl } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { formatRent, timeAgo } from '../../lib/format';
import { ColumnChart, BarList, StatTile } from '../../components/admin/Charts';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import { PageLoader } from '../../components/ui/Spinner';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function AdminOverview() {
  const { t, lang } = useLanguage();
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  useDocumentTitle(t('admin.overview'));

  useEffect(() => {
    api.get('/admin/stats').then((r) => setS(r.data)).catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <div className="card p-6 text-danger">{error}</div>;
  if (!s) return <PageLoader />;

  const shortDate = (d, long) => new Intl.DateTimeFormat(lang === 'ur' ? 'ur-PK' : 'en-GB', long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`));
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">{t('admin.overview')}</h1>
        <p className="text-ink-2 mt-1">{t('admin.overviewSub')}</p>
      </div>

      {s.verifications?.pending > 0 && (
        <Link to="/admin/verifications" className="flex items-center gap-3 rounded-2xl bg-pine-50 border border-pine/20 p-4 hover:shadow-card transition-shadow">
          <IdCard className="w-5 h-5 text-pine shrink-0" />
          <p className="flex-1 text-sm"><b className="ltr-nums">{s.verifications.pending}</b> {t('admin.idsWaiting')}</p>
          <ArrowRight className="w-4 h-4 text-pine rtl:rotate-180" />
        </Link>
      )}

      {s.reports.open > 0 && (
        <Link to="/admin/reports" className="flex items-center gap-3 rounded-2xl bg-warning-50 border border-warning/20 p-4 hover:shadow-card transition-shadow">
          <Flag className="w-5 h-5 text-warning shrink-0" />
          <p className="flex-1 text-sm"><b className="ltr-nums">{s.reports.open}</b> {t('admin.reportsWaiting')}</p>
          <ArrowRight className="w-4 h-4 text-warning rtl:rotate-180" />
        </Link>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile icon={Users} label={t('admin.totalUsers')} value={s.users.total} sub={t('admin.usersSplit', { o: s.users.owners, t: s.users.tenants, n: s.users.new7d })} to="/admin/users" />
        <StatTile icon={Building2} tone="success" label={t('admin.liveListings')} value={s.listings.available} sub={t('admin.listingsSplit', { total: s.listings.total, r: s.listings.rented, x: s.listings.removed })} to="/admin/listings" />
        <StatTile icon={CalendarCheck} tone="brand" label={t('admin.bookings')} value={s.bookings.total} sub={s.bookings.acceptanceRate === null ? t('admin.noAnswers') : t('admin.acceptance', { p: s.bookings.acceptanceRate, n: s.bookings.pending })} />
        <StatTile icon={Flag} tone={s.reports.open ? 'warning' : 'pine'} label={t('admin.openReports')} value={s.reports.open} sub={t('admin.reportsHandled', { n: s.reports.resolved + s.reports.dismissed })} to="/admin/reports" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ColumnChart title={t('admin.chartSignups')} subtitle={t('admin.last30')} data={s.series.signups} valueLabel={t('admin.signupsUnit')} formatDate={shortDate} tableLabels={{ date: t('admin.date'), value: t('admin.signupsUnit') }} />
        <ColumnChart title={t('admin.chartListings')} subtitle={t('admin.last30')} data={s.series.listings} valueLabel={t('admin.listingsUnit')} formatDate={shortDate} tableLabels={{ date: t('admin.date'), value: t('admin.listingsUnit') }} />
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
        <BarList
          title={t('admin.byDistrict')}
          empty={t('admin.noData')}
          items={s.byDistrict.map((d) => ({ label: t(`district.${d.district}`), value: d.count, sub: t('admin.avgRent', { r: formatRent(d.avgRent, { compact: true }) }) }))}
        />
        <div className="grid grid-cols-2 gap-4 content-start">
          <StatTile icon={BadgeCheck} label={t('admin.verifiedOwners')} value={s.users.verifiedOwners} sub={pct(s.users.verifiedOwners, s.users.owners)} />
          <StatTile icon={Ban} tone="danger" label={t('admin.banned')} value={s.users.banned} />
          <StatTile icon={MessageCircle} label={t('admin.messages')} value={s.engagement.messages} sub={t('admin.messages7d', { n: s.engagement.messages7d })} />
          <StatTile icon={Star} tone="warning" label={t('admin.reviews')} value={s.engagement.reviews} sub={t('admin.conversations', { n: s.engagement.conversations })} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">{t('admin.newestUsers')}</h2>
            <Link to="/admin/users" className="text-sm font-semibold text-pine">{t('common.viewAll')}</Link>
          </div>
          <ul className="divide-y divide-line">
            {s.recentUsers.map((u) => (
              <li key={u.id}>
                <Link to={`/admin/users?open=${u.id}`} className="flex items-center gap-3 py-3 hover:bg-sunken -mx-2 px-2 rounded-xl">
                  <Avatar name={u.name} src={u.avatar} size="sm" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate">{u.name}</span>
                    <span className="block text-xs text-muted">{t(`role.${u.role}`)} · {timeAgo(u.createdAt, lang)}</span>
                  </span>
                  {!u.isActive && <StatusBadge status="banned" />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">{t('admin.newestListings')}</h2>
            <Link to="/admin/listings" className="text-sm font-semibold text-pine">{t('common.viewAll')}</Link>
          </div>
          <ul className="divide-y divide-line">
            {s.recentListings.map((l) => (
              <li key={l.id}>
                <Link to={`/listings/${l.id}`} className="flex items-center gap-3 py-3 hover:bg-sunken -mx-2 px-2 rounded-xl">
                  <img src={mediaUrl(l.cover)} alt="" className="w-11 h-11 rounded-lg object-cover bg-sunken" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate">{l.title}</span>
                    <span className="block text-xs text-muted truncate">{l.ownerName} · {timeAgo(l.createdAt, lang)}</span>
                  </span>
                  <StatusBadge status={l.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
