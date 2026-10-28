// components/Navbar.jsx
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu, X, Languages, MessageCircle, Plus, LayoutDashboard, Heart, Settings, LogOut, User, Search, CalendarCheck, ShieldCheck, Building2, Mail
} from '@/components/icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRealtime } from '../context/RealtimeContext';
import { Logo } from './PeakMark';
import Avatar from './ui/Avatar';
import NotificationBell from './NotificationBell';

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && onOutside();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOutside]);
}

function Badge({ n }) {
  if (!n) return null;
  return (
    <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-surface ltr-nums">
      {n > 99 ? '99+' : n}
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const { msgUnread } = useRealtime();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);
  useClickOutside(menuRef, () => setMenuOpen(false));

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const isOwner = user?.role === 'owner';
  const isTenant = user?.role === 'tenant';
  const isAdmin = user?.role === 'admin';

  // Main links, always visible in the bar — each role sees its own pages directly.
  //   owner  → Add listing · My listings · Requests
  //   tenant → Browse · My requests
  //   guest  → Browse
  let navLinks = [];
  if (isOwner) {
    navLinks = [
      { to: '/dashboard/listings/new', icon: Plus, label: t('nav.addListing') },
      { to: '/dashboard/listings', icon: Building2, label: t('nav.myListings'), end: true },
      { to: '/dashboard/requests', icon: CalendarCheck, label: t('nav.requests') },
    ];
  } else if (isTenant) {
    navLinks = [
      { to: '/listings', icon: Search, label: t('nav.browse') },
      { to: '/dashboard/requests', icon: CalendarCheck, label: t('nav.myRequests') },
    ];
  } else if (isAdmin) {
    navLinks = [
      { to: '/listings', icon: Search, label: t('nav.browse') },
      { to: '/admin', icon: ShieldCheck, label: t('admin.title') },
    ];
  } else {
    navLinks = [{ to: '/listings', icon: Search, label: t('nav.browse') }];
  }

  // Add Contact link for everyone
  navLinks.push({ to: '/contact', icon: Mail, label: t('nav.contact') });

  const menuItems = isAdmin
    ? [
        { to: '/admin', icon: ShieldCheck, label: t('admin.title') },
        { to: '/admin/reports', icon: CalendarCheck, label: t('admin.reports') },
        { to: '/messages', icon: MessageCircle, label: t('nav.messages') },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
      ]
    : user
    ? [
        { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
        ...(isTenant ? [{ to: '/dashboard/saved', icon: Heart, label: t('nav.saved') }] : []),
        ...(isOwner ? [{ to: '/listings', icon: Search, label: t('nav.browse') }] : []),
        { to: '/messages', icon: MessageCircle, label: t('nav.messages') },
        { to: `/users/${user.id}`, icon: User, label: t('nav.publicProfile') },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
      ]
    : [];

  const home = location.pathname === '/';
  const transparent = home && !scrolled && !mobileOpen;

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        transparent ? 'bg-transparent' : 'bg-surface/90 backdrop-blur-md border-b border-line'
      }`}
    >
      <div className="container-page h-16 md:h-[72px] flex items-center gap-2 sm:gap-4">
        <Link to="/" className="shrink-0" aria-label="DwellGB home">
          <Logo light={transparent} />
        </Link>

        <nav className="hidden md:flex items-center gap-1 ms-6">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  transparent ? 'text-white/85 hover:text-white hover:bg-white/10' : isActive ? 'text-pine bg-pine-50' : 'text-ink-2 hover:text-ink hover:bg-sunken'
                }`
              }
            >
              <l.icon className="w-4 h-4 hidden lg:block" />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={toggleLang}
            className={`hidden sm:inline-flex btn btn-sm btn-ghost ${transparent ? 'text-white/90 hover:bg-white/10 hover:text-white' : ''}`}
            aria-label="Switch language"
          >
            <Languages className="w-4 h-4" />
            <span className={user ? 'hidden xl:inline' : ''}>{lang === 'en' ? 'اردو' : 'English'}</span>
          </button>

          {user ? (
            <>
              <Link
                to="/messages"
                className={`relative btn btn-ghost btn-icon ${transparent ? 'text-white hover:bg-white/10' : ''}`}
                aria-label={t('nav.messages')}
              >
                <MessageCircle className="w-5 h-5" />
                <Badge n={msgUnread} />
              </Link>
              <NotificationBell light={transparent} />

              <div className="relative ms-1" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full ps-1 pe-1 md:pe-3 py-1 border border-line bg-surface hover:shadow-card transition-shadow"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar name={user.name} src={user.avatar} size="sm" />
                  <span className="hidden md:block text-sm font-semibold max-w-[110px] truncate">{user.name.split(' ')[0]}</span>
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.14 }}
                      role="menu"
                      className="absolute end-0 mt-2 w-64 card shadow-lift p-2 origin-top-right"
                    >
                      <div className="px-3 py-2.5 mb-1 border-b border-line">
                        <p className="font-semibold truncate">{user.name}</p>
                        <p className="text-xs text-muted">{t(`role.${user.role}`)}</p>
                      </div>
                      {menuItems.map((m) => (
                        <Link key={m.to} to={m.to} role="menuitem" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-2 hover:bg-sunken hover:text-ink">
                          <m.icon className="w-4 h-4" /> {m.label}
                        </Link>
                      ))}
                      <button onClick={handleLogout} role="menuitem" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-danger-50 mt-1">
                        <LogOut className="w-4 h-4" /> {t('nav.logout')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className={`btn btn-sm btn-ghost ${transparent ? 'text-white hover:bg-white/10 hover:text-white' : ''}`}>
                {t('nav.login')}
              </Link>
              <Link to="/register" className="btn btn-sm btn-primary">{t('nav.signup')}</Link>
            </div>
          )}

          <button
            className={`md:hidden btn btn-ghost btn-icon ${transparent ? 'text-white hover:bg-white/10' : ''}`}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-line bg-surface"
          >
            {/* Scrolls inside itself when the menu is taller than the screen (short / landscape phones). */}
            <div className="container-page py-4 flex flex-col gap-1 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
              {navLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl font-medium ${isActive ? 'text-pine bg-pine-50' : 'hover:bg-sunken'}`}
                >
                  <l.icon className="w-4 h-4" />{l.label}
                </NavLink>
              ))}
              {user && <div className="my-1 border-t border-line" />}
              {user ? (
                <>
                  {menuItems.map((m) => (
                    <Link key={m.to} to={m.to} className="flex items-center gap-3 px-3 py-3 rounded-xl font-medium hover:bg-sunken"><m.icon className="w-4 h-4" />{m.label}</Link>
                  ))}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Link to="/login" className="btn btn-secondary">{t('nav.login')}</Link>
                  <Link to="/register" className="btn btn-primary">{t('nav.signup')}</Link>
                </div>
              )}
              <button onClick={toggleLang} className="flex items-center gap-3 px-3 py-3 rounded-xl font-medium hover:bg-sunken">
                <Languages className="w-4 h-4" /> {lang === 'en' ? 'اردو' : 'English'}
              </button>
              {user && (
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-danger hover:bg-danger-50">
                  <LogOut className="w-4 h-4" /> {t('nav.logout')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}