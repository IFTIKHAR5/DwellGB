// pages/admin/AdminLayout.jsx — shell for the admin panel.
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, Flag, Megaphone, ShieldCheck, IdCard } from '@/components/icons';
import api from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useRealtime } from '../../context/RealtimeContext';

export default function AdminLayout() {
  const { t } = useLanguage();
  const { subscribe } = useRealtime();
  const { pathname } = useLocation();
  const [openReports, setOpenReports] = useState(0);
  const [pendingIds, setPendingIds] = useState(0);

  useEffect(() => {
    const load = () => {
      api.get('/admin/reports', { params: { limit: 1 } }).then((r) => setOpenReports(r.data.counts.open)).catch(() => {});
      api.get('/admin/verifications', { params: { limit: 1 } }).then((r) => setPendingIds(r.data.counts.pending)).catch(() => {});
    };
    load();
    return subscribe('notification:new', (n) => { if (['/admin/reports', '/admin/verifications'].includes(n.link)) load(); });
  }, [subscribe, pathname]);

  const items = [
    { to: '/admin', end: true, icon: LayoutDashboard, label: t('admin.overview') },
    { to: '/admin/verifications', icon: IdCard, label: t('admin.verifications'), badge: pendingIds },
    { to: '/admin/reports', icon: Flag, label: t('admin.reports'), badge: openReports },
    { to: '/admin/users', icon: Users, label: t('admin.users') },
    { to: '/admin/listings', icon: Building2, label: t('admin.listings') },
    { to: '/admin/broadcast', icon: Megaphone, label: t('admin.broadcast') },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 md:py-10 grid md:grid-cols-[230px_1fr] gap-6 md:gap-10">
      <aside className="md:sticky md:top-24 self-start">
        <div className="hidden md:flex items-center gap-2.5 px-3.5 mb-5">
          <span className="w-9 h-9 rounded-xl bg-ink text-white flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></span>
          <div>
            <p className="font-bold leading-tight">{t('admin.title')}</p>
            <p className="text-xs text-muted">{t('admin.subtitle')}</p>
          </div>
        </div>
        {/* Phones: tabs scroll sideways; the faded edge shows there are more. */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 [mask-image:linear-gradient(to_right,#000_85%,transparent)] rtl:[mask-image:linear-gradient(to_left,#000_85%,transparent)] md:[mask-image:none] md:rtl:[mask-image:none]">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                `shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'bg-ink text-white shadow-card' : 'text-ink-2 hover:bg-sunken hover:text-ink'}`
              }
            >
              <i.icon className="w-[18px] h-[18px]" />
              <span className="flex-1">{i.label}</span>
              {i.badge > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center ltr-nums">{i.badge}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
