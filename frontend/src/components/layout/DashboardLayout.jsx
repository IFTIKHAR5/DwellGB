// components/layout/DashboardLayout.jsx — sidebar (desktop) / tabs (mobile) for account pages.
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Building2, CalendarCheck, Heart, MessageCircle, Bell, Settings, Plus, ShieldCheck } from '@/components/icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useRealtime } from '../../context/RealtimeContext';
import VerificationStatus from '../verification/VerificationStatus';

export default function DashboardLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { msgUnread, notifUnread } = useRealtime();
  const isOwner = user?.role === 'owner';

  const items = user?.role === 'admin'
    ? [
        { to: '/admin', icon: ShieldCheck, label: t('admin.title') },
        { to: '/messages', icon: MessageCircle, label: t('nav.messages'), badge: msgUnread },
        { to: '/notifications', icon: Bell, label: t('nav.notifications'), badge: notifUnread },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
      ]
    : isOwner
    ? [
        { to: '/dashboard', end: true, icon: LayoutDashboard, label: t('nav.overview') },
        { to: '/dashboard/listings', icon: Building2, label: t('nav.myListings') },
        { to: '/dashboard/requests', icon: CalendarCheck, label: t('nav.requests') },
        { to: '/messages', icon: MessageCircle, label: t('nav.messages'), badge: msgUnread },
        { to: '/notifications', icon: Bell, label: t('nav.notifications'), badge: notifUnread },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
      ]
    : [
        { to: '/dashboard/requests', icon: CalendarCheck, label: t('nav.myRequests') },
        { to: '/dashboard/saved', icon: Heart, label: t('nav.saved') },
        { to: '/messages', icon: MessageCircle, label: t('nav.messages'), badge: msgUnread },
        { to: '/notifications', icon: Bell, label: t('nav.notifications'), badge: notifUnread },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
      ];

  return (
    <div className="container-page py-6 md:py-10 grid md:grid-cols-[230px_1fr] gap-6 md:gap-10">
      <aside className="md:sticky md:top-24 self-start">
        {/* Phones: tabs scroll sideways; the faded edge shows there are more. */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 [mask-image:linear-gradient(to_right,#000_85%,transparent)] rtl:[mask-image:linear-gradient(to_left,#000_85%,transparent)] md:[mask-image:none] md:rtl:[mask-image:none]">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                `shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-pine text-white shadow-card' : 'text-ink-2 hover:bg-sunken hover:text-ink'
                }`
              }
            >
              <i.icon className="w-[18px] h-[18px]" />
              <span className="flex-1">{i.label}</span>
              {i.badge > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center ltr-nums">{i.badge}</span>}
            </NavLink>
          ))}
        </nav>
        {isOwner && (
          <NavLink to="/dashboard/listings/new" className="hidden md:flex btn btn-primary w-full mt-5">
            <Plus className="w-4 h-4" /> {t('nav.newListing')}
          </NavLink>
        )}
      </aside>
      <section className="min-w-0">
        {/* Owners see where their CNIC check stands until it's approved */}
        {isOwner && user.verification?.status !== 'approved' && <VerificationStatus verification={user.verification} className="mb-6" />}
        <Outlet />
      </section>
    </div>
  );
}
