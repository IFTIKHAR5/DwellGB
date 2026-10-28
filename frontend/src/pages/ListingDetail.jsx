// pages/ListingDetail.jsx — one property: photos, facts, details, amenities, map, owner,
// reviews and the booking card. Calm charcoal + gold styling: hairlines instead of
// coloured boxes, one strong button, generous spacing.
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  MapPin, BedDouble, Bath, Armchair, Thermometer, Droplets, UsersThree, CalendarDots, HourglassMedium, Share2, BadgeCheck, Phone, MessageCircle,
  ShieldCheck, Lock, Pencil, CircleCheck, Hourglass, Eye, ChefHat, FrameCorners, Coins, ChevronLeft, ChevronRight, Star, ShieldOff, RotateCcw, ShieldAlert,
} from '@/components/icons';
import api, { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '@/lib/utils';
import { AMENITY_ICON } from '../lib/constants';
import { formatRent, formatDate, localPhone, whatsappLink, timeAgo } from '../lib/format';
import Gallery from '../components/Gallery';
import SaveButton from '../components/SaveButton';
import ListingCard from '../components/ListingCard';
import Avatar from '../components/ui/Avatar';
import { Stars } from '../components/ui/StarRating';
import { PageLoader, Spinner } from '../components/ui/Spinner';
import StatusBadge from '../components/ui/StatusBadge';
import { Field, Counter } from '../components/ui/Field';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { StaggerGrid, StaggerItem } from '../components/motion';
import ReportButton from '../components/ReportModal';
import ReasonModal from '../components/admin/ReasonModal';

const ListingMap = lazy(() => import('../components/map/ListingMap'));

// The two accent tones of the logo.
const GOLD = 'text-[#B07F2E]';
const GOLD_LINE = 'bg-[#D6A54A]';

/* ------------------------------------------------------------------ small pieces */

/** A page section: small gold kicker line, display heading, anchor for the tabs. */
function Section({ id, title, aside, children }) {
  return (
    <section id={id} className="scroll-mt-36 py-12 border-t border-line first:border-t-0 first:pt-10">
      <div className="flex items-end justify-between gap-4 mb-7">
        <h2 className="font-display text-[1.6rem] md:text-[1.9rem] leading-tight font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A soft rounded tile holding a two-tone icon. tone: gold (warm accent) | ink (neutral). */
function IconTile({ icon: Icon, tone = 'ink', size = 'md' }) {
  return (
    <span
      className={cn(
        'shrink-0 inline-flex items-center justify-center',
        size === 'lg' ? 'w-12 h-12 rounded-2xl' : size === 'sm' ? 'w-9 h-9 rounded-xl' : 'w-11 h-11 rounded-[14px]',
        tone === 'gold'
          ? 'bg-linear-to-br from-[#FBF1DE] to-[#F5E3C0] text-[#9A6B1F] ring-1 ring-inset ring-[#E9C88A]/50'
          : 'bg-linear-to-br from-white to-sunken text-pine ring-1 ring-inset ring-line',
      )}
    >
      <Icon className={size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-[18px] h-[18px]' : 'w-[22px] h-[22px]'} weight="duotone" />
    </span>
  );
}

/** Beds / baths / kitchens / size — one elegant bar of numbers. */
function Facts({ items }) {
  const four = items.length > 3;
  return (
    <div className="rounded-3xl bg-surface border border-line shadow-card overflow-hidden">
      <div className={cn('grid', four ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
        {items.map(({ icon, value, label }, i) => (
          <div
            key={label}
            className={cn(
              'flex flex-col items-start px-4 sm:px-5 py-5 border-line',
              four
                ? cn(i % 2 === 1 && 'border-s', i >= 2 && 'border-t sm:border-t-0', i === 2 && 'sm:border-s')
                : i > 0 && 'border-s',
            )}
          >
            <IconTile icon={icon} tone="gold" />
            <p className="mt-4 font-display text-[1.75rem] font-semibold leading-none ltr-nums">{value}</p>
            <p className="mt-1.5 text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-[0.05em] sm:tracking-[0.12em] text-muted truncate max-w-full">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The three things tenants in GB ask first, as large readable rows (value first, label under). */
function Highlights({ rows }) {
  return (
    <ul className="grid gap-5">
      {rows.map(({ icon, label, value }) => (
        <li key={label} className="flex items-center gap-4">
          <IconTile icon={icon} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-[16.5px] text-ink">{value}</p>
            <p className="text-sm text-muted mt-0.5">{label}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The remaining details as small tiles: label above, value below. */
function DetailList({ rows }) {
  return (
    <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-2xl bg-surface border border-line p-4">
          <Icon className="w-5 h-5 text-[#9A6B1F]" weight="duotone" />
          <dt className="mt-3 text-xs font-medium text-muted">{label}</dt>
          <dd className="mt-0.5 font-semibold text-ink text-[15px] ltr-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Long descriptions are cut after a few lines with a "Read more" button. */
function Description({ text }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const long = text.length > 420;
  return (
    <div>
      <p className={`text-ink-2 text-[16px] leading-[1.85] whitespace-pre-line ${long && !open ? 'line-clamp-5' : ''}`}>{text}</p>
      {long && (
        <button onClick={() => setOpen((o) => !o)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink">
          {open ? t('detail.readLess') : t('detail.readMore')} <ChevronRight className={`w-4 h-4 transition-transform ${open ? '-rotate-90' : 'rotate-90'}`} />
        </button>
      )}
    </div>
  );
}

/** Amenities as soft cards with an icon tile; long lists show 9 first. */
function Amenities({ items }) {
  const { t } = useLanguage();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 9);
  return (
    <>
      <ul className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 gap-3">
        {shown.map((a) => {
          const Icon = AMENITY_ICON[a] || CircleCheck;
          return (
            <li key={a} className="flex items-center gap-3 rounded-2xl bg-surface border border-line px-3.5 py-3 text-[15px] font-medium text-ink">
              <IconTile icon={Icon} size="sm" /> <span className="min-w-0">{t(`amenity.${a}`)}</span>
            </li>
          );
        })}
      </ul>
      {items.length > 9 && (
        <button onClick={() => setAll((v) => !v)} className="btn btn-secondary btn-sm mt-6">
          {all ? t('detail.readLess') : t('detail.showAllAmenities', { n: items.length })}
        </button>
      )}
    </>
  );
}

/** Highlights the tab of the section currently on screen. */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(',');
  useEffect(() => {
    const els = key.split(',').map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-140px 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);
  return active;
}

/* ------------------------------------------------------------------ admin + booking */

function AdminPanel({ listing, onChange }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(null);
  async function confirm(reason) {
    try {
      await api.patch(`/admin/listings/${listing.id}`, { action: mode, reason: reason || undefined });
      toast.success(t(`admin.done.${mode}Listing`));
      setMode(null);
      onChange();
    } catch (err) {
      toast.error(apiError(err));
    }
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> {t('admin.title')}</p>
      {listing.status === 'removed' ? (
        <button className="btn btn-secondary w-full" onClick={() => setMode('restore')}><RotateCcw className="w-4 h-4" /> {t('admin.restore')}</button>
      ) : (
        <button className="btn btn-danger w-full" onClick={() => setMode('remove')}><ShieldOff className="w-4 h-4" /> {t('admin.remove')}</button>
      )}
      {listing.owner && <Link to={`/admin/users?open=${listing.owner.id}`} className="btn btn-ghost w-full">{t('admin.viewOwner')}</Link>}
      <ReasonModal
        open={!!mode}
        onClose={() => setMode(null)}
        title={mode === 'remove' ? t('admin.removeTitle') : t('admin.restoreTitle')}
        text={mode === 'remove' ? t('admin.removeText') : t('admin.restoreText')}
        label={mode === 'remove' ? t('admin.reason') : undefined}
        placeholder={t('admin.removePlaceholder')}
        confirmLabel={mode === 'remove' ? t('admin.remove') : t('admin.restore')}
        danger={mode === 'remove'}
        requireReason={mode === 'remove'}
        onConfirm={confirm}
      />
    </div>
  );
}

/** A quiet notice with a coloured icon (accepted / pending / info). */
function Notice({ icon: Icon, tone = 'text-ink-2', title, children }) {
  return (
    <div className="rounded-xl border border-line p-4 flex gap-3">
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${tone}`} />
      <div className="text-sm">
        {title && <p className="font-semibold text-ink">{title}</p>}
        <div className={`text-ink-2 ${title ? 'mt-0.5' : ''}`}>{children}</div>
      </div>
    </div>
  );
}

function BookingPanel({ listing, onChange }) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [occupants, setOccupants] = useState(1);
  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const loginUrl = `/login?next=${encodeURIComponent(location.pathname)}`;
  const today = new Date().toISOString().slice(0, 10);

  async function request(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/bookings', { listingId: listing.id, message, moveInDate: moveInDate || undefined, occupants });
      toast.success(t('detail.requestSent'));
      onChange();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    try {
      await api.patch(`/bookings/${listing.myBooking.id}/cancel`);
      toast.success(t('detail.requestCancelled'));
      onChange();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function openChat() {
    if (!user) return navigate(loginUrl);
    if (listing.conversationId) return navigate(`/messages/${listing.conversationId}`);
    setChatBusy(true);
    try {
      const { data } = await api.post('/conversations', { listingId: listing.id });
      navigate(`/messages/${data.id}`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setChatBusy(false);
    }
  }

  const b = listing.myBooking;
  const rented = listing.status !== 'available';
  const canRequest = !rented && (!b || ['rejected', 'cancelled'].includes(b.status));
  const terms = [
    [t('detail.deposit'), listing.deposit ? formatRent(listing.deposit) : t('detail.noDeposit'), true],
    [t('detail.utilities'), listing.utilitiesIncluded ? t('detail.included') : t('detail.notIncluded')],
    [t('detail.minStay'), t('detail.months', { n: listing.minStayMonths })],
  ];

  return (
    <div id="book" className="relative rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_60px_-32px_rgba(10,15,44,0.5)] scroll-mt-28 overflow-hidden">
      {/* thin brand line along the top edge */}
      <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-brand via-rose to-violet" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t('detail.perMonth')}</p>
          <p className="mt-1.5 font-display text-[2.15rem] leading-none font-semibold tracking-tight ltr-nums">{formatRent(listing.rent)}</p>
        </div>
        {listing.status !== 'available' && <StatusBadge status={listing.status} />}
      </div>

      <dl className="mt-5 rounded-2xl bg-sunken/70 border border-line px-4 text-sm">
        {terms.map(([label, value, nums], i) => (
          <div key={label} className={`flex justify-between gap-4 py-3 ${i ? 'border-t border-line' : ''}`}>
            <dt className="text-ink-2">{label}</dt>
            <dd className={`font-semibold text-ink ${nums ? 'ltr-nums' : ''}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        {listing.isOwner ? (
          <div className="space-y-2">
            <p className="text-sm text-ink-2 flex items-center gap-2 mb-3"><Eye className="w-4 h-4" /> {t('detail.views', { n: listing.views })}</p>
            <Link to={`/dashboard/listings/${listing.id}/edit`} className="btn btn-ink w-full"><Pencil className="w-4 h-4" /> {t('detail.edit')}</Link>
            <Link to="/dashboard/requests" className="btn btn-secondary w-full">{t('detail.viewRequests')}</Link>
          </div>
        ) : user?.role === 'admin' ? (
          <AdminPanel listing={listing} onChange={onChange} />
        ) : user?.role === 'owner' ? (
          <Notice icon={Lock}>{t('detail.ownersCantBook')}</Notice>
        ) : b?.status === 'accepted' ? (
          <Notice icon={CircleCheck} tone="text-success" title={t('detail.acceptedTitle')}>{t('detail.acceptedText')}</Notice>
        ) : b?.status === 'pending' ? (
          <div className="space-y-2">
            <Notice icon={Hourglass} tone="text-warning" title={t('detail.pendingTitle')}>{t('detail.pendingText', { when: timeAgo(b.createdAt, lang) })}</Notice>
            <button onClick={cancel} className="btn btn-ghost w-full text-danger">{t('detail.cancelRequest')}</button>
          </div>
        ) : canRequest ? (
          user ? (
            <form onSubmit={request} className="space-y-4">
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                <Field label={t('detail.moveIn')}>
                  <input type="date" min={today} className="input" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} />
                </Field>
                <div>
                  <p className="label">{t('detail.occupants')}</p>
                  <div className="h-[2.9rem] flex items-center"><Counter value={occupants} onChange={setOccupants} min={1} max={20} /></div>
                </div>
              </div>
              <Field label={t('detail.messageToOwner')}>
                <textarea rows={3} maxLength={1000} className="input" placeholder={t('detail.messagePlaceholder')} value={message} onChange={(e) => setMessage(e.target.value)} />
              </Field>
              <button className="btn btn-ink btn-lg w-full" disabled={busy}>{busy ? <Spinner /> : t('detail.requestToRent')}</button>
              <p className="text-xs text-muted text-center">{t('detail.noCharge')}</p>
            </form>
          ) : (
            <Link to={loginUrl} className="btn btn-ink btn-lg w-full">{t('detail.loginToRequest')}</Link>
          )
        ) : (
          <Notice icon={Lock}>{t('detail.notAvailable')}</Notice>
        )}

        {!listing.isOwner && user?.role !== 'owner' && user?.role !== 'admin' && (
          <button onClick={openChat} className="btn btn-secondary w-full mt-2.5" disabled={chatBusy}>
            {chatBusy ? <Spinner /> : <><MessageCircle className="w-4 h-4" /> {t('detail.messageOwner')}</>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ owner + reviews */

function OwnerCard({ listing }) {
  const { t, lang } = useLanguage();
  const o = listing.owner;
  if (!o) return null;
  return (
    <div className="rounded-3xl bg-surface border border-line shadow-card overflow-hidden">
      <div className="p-6 sm:p-7">
        <div className="flex items-center gap-4">
          <Link to={`/users/${o.id}`} className="relative shrink-0">
            <Avatar name={o.name} src={o.avatar} size="lg" online={o.online} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={`/users/${o.id}`} className="text-xl font-semibold tracking-tight hover:underline underline-offset-4 flex items-center gap-1.5">
              <span className="truncate">{o.name}</span> {o.isVerified && <BadgeCheck className="w-5 h-5 text-pine shrink-0" weight="fill" />}
            </Link>
            <p className="text-sm text-muted mt-0.5">{t('detail.memberSince', { date: formatDate(o.memberSince, lang, { month: 'long', year: 'numeric' }) })}</p>
          </div>
        </div>

        {/* quick facts about the owner */}
        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-sunken/70 border border-line divide-x divide-line rtl:divide-x-reverse">
          <div className="px-4 py-3.5">
            {o.ratingCount > 0 ? (
              <>
                <p className="flex items-center gap-1.5 font-display text-xl font-semibold ltr-nums">
                  {o.ratingAvg.toFixed(1)} <Star className="w-4 h-4 fill-gold text-gold" />
                </p>
                <p className="text-xs text-muted mt-0.5">{t('detail.reviewsCount', { n: o.ratingCount })}</p>
              </>
            ) : (
              <>
                <p className="flex items-center gap-1.5 font-semibold text-[15px] text-ink"><Star className="w-[18px] h-[18px] text-gold" /> {t('detail.noReviewsYet')}</p>
                <p className="text-xs text-muted mt-1">{t('detail.reviewsTitle')}</p>
              </>
            )}
          </div>
          <div className="px-4 py-3.5">
            <p className="flex items-center gap-1.5 font-semibold text-[15px] text-ink"><ShieldCheck className="w-[18px] h-[18px] text-success" /> CNIC</p>
            <p className="text-xs text-muted mt-1">{t('detail.cnicOnFile')}</p>
          </div>
        </div>

        {o.bio && <p className="mt-5 text-ink-2 text-[15px] leading-relaxed">{o.bio}</p>}
      </div>

      {listing.canSeeContact && !listing.isOwner ? (
        <div className="border-t border-line bg-linear-to-b from-[#FBF6EC] to-surface p-6 sm:p-7">
          <p className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] ${GOLD}`}>
            <span className={`h-px w-6 ${GOLD_LINE}`} aria-hidden="true" /> {t('detail.contact')}
          </p>
          <div className="mt-3 space-y-1.5 text-sm">
            {o.fatherName && <p><span className="text-muted">{t('detail.fatherName')}:</span> {o.fatherName}</p>}
            {listing.address && <p><span className="text-muted">{t('detail.address')}:</span> {listing.address}</p>}
          </div>
          {o.phone && (
            <div className="flex flex-wrap gap-2 mt-4">
              <a href={`tel:+${o.phone}`} className="btn btn-ink btn-sm"><Phone className="w-4 h-4" /> <span className="ltr-nums">{localPhone(o.phone)}</span></a>
              <a href={whatsappLink(o.phone, `Assalam o Alaikum, I'm contacting you about "${listing.title}" on DwellGB.`)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">WhatsApp</a>
            </div>
          )}
        </div>
      ) : !listing.isOwner ? (
        <p className="border-t border-line px-6 sm:px-7 py-4 flex items-start gap-3 text-sm text-ink-2 bg-sunken/40">
          <Lock className="w-[18px] h-[18px] shrink-0 mt-px text-muted" /> {t('detail.contactLocked')}
        </p>
      ) : null}
    </div>
  );
}

function Reviews({ ownerId }) {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/reviews/owner/${ownerId}`).then((r) => setData(r.data)).catch(() => setData({ reviews: [], count: 0 }));
  }, [ownerId]);
  if (!data || !data.count) return null;
  return (
    <Section
      id="reviews"
      title={t('detail.reviewsTitle')}
      aside={(
        <span className="flex items-center gap-2 text-sm">
          <Star className="w-4 h-4 fill-gold text-gold" />
          <span className="font-semibold ltr-nums">{data.average.toFixed(1)}</span>
          <span className="text-muted">· {t('detail.reviewsCount', { n: data.count })}</span>
        </span>
      )}
    >
      <div className="grid md:grid-cols-2 gap-x-10">
        {data.reviews.slice(0, 6).map((r) => (
          <article key={r.id} className="py-5 border-b border-line">
            <div className="flex items-center gap-3">
              <Avatar name={r.tenant?.name || '?'} src={r.tenant?.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{r.tenant?.name || t('detail.formerTenant')}</p>
                <p className="text-xs text-muted">{formatDate(r.createdAt, lang, { month: 'long', year: 'numeric' })}</p>
              </div>
              <Stars value={r.rating} size="w-3.5 h-3.5" />
            </div>
            {r.comment && <p className="mt-3 text-[15px] text-ink-2 leading-relaxed">{r.comment}</p>}
            {r.ownerReply && (
              <p className="mt-3 text-sm text-ink-2 border-s-2 border-line-strong ps-3">
                <span className="font-semibold text-ink">{t('detail.ownerReply')}:</span> {r.ownerReply}
              </p>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ page */

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState('');
  const [similar, setSimilar] = useState([]);
  const [reload, setReload] = useState(0);
  const [chatBusy, setChatBusy] = useState(false);
  useDocumentTitle(listing?.title);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/listings/${id}`)
      .then((r) => !cancelled && setListing(r.data))
      .catch((err) => !cancelled && setError(err.response?.status === 404 || err.response?.status === 400 ? 'notfound' : apiError(err)));
    return () => { cancelled = true; };
  }, [id, reload]);

  useEffect(() => {
    api.get(`/listings/${id}/similar`).then((r) => setSimilar(r.data)).catch(() => {});
  }, [id]);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: listing.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t('detail.linkCopied'));
      }
    } catch { /* cancelled */ }
  }

  // Same chat flow as the booking card, used by the mobile bottom bar.
  async function openChat() {
    if (!user) return navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
    if (listing.conversationId) return navigate(`/messages/${listing.conversationId}`);
    setChatBusy(true);
    try {
      const { data } = await api.post('/conversations', { listingId: listing.id });
      navigate(`/messages/${data.id}`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setChatBusy(false);
    }
  }

  // Phones show a fixed price bar at the bottom; it would cover the end of the footer,
  // so the body gets extra bottom padding while it is visible (see index.css).
  const hasBottomBar = !!listing && !listing.isOwner && !listing.isAdmin && user?.role !== 'owner';
  useEffect(() => {
    document.body.classList.toggle('has-bottom-bar', hasBottomBar);
    return () => document.body.classList.remove('has-bottom-bar');
  }, [hasBottomBar]);

  const tabs = listing
    ? [
        { id: 'overview', label: t('detail.overview') },
        ...(listing.amenities?.length ? [{ id: 'amenities', label: t('detail.amenities') }] : []),
        { id: 'location', label: t('detail.location') },
        { id: 'owner', label: t('detail.meetOwner') },
      ]
    : [];
  const activeTab = useActiveSection(tabs.map((tab) => tab.id));

  if (error === 'notfound') {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-3xl font-bold">{t('detail.notFound')}</h1>
        <p className="text-ink-2 mt-2">{t('detail.notFoundText')}</p>
        <Link to="/listings" className="btn btn-ink mt-6">{t('nav.browse')}</Link>
      </div>
    );
  }
  if (error) return <div className="container-page py-24 text-center text-danger">{error}</div>;
  if (!listing) return <PageLoader />;

  const availableNow = !listing.availableFrom || new Date(listing.availableFrom) <= new Date();
  const facts = [
    { icon: BedDouble, value: listing.bedrooms, label: t('listing.bedrooms') },
    { icon: Bath, value: listing.bathrooms, label: t('listing.bathrooms') },
    { icon: ChefHat, value: listing.kitchens, label: t('listing.kitchens') },
    ...(listing.floorAreaSqft ? [{ icon: FrameCorners, value: listing.floorAreaSqft, label: 'sq ft' }] : []),
  ];
  const highlights = [
    { icon: Armchair, label: t('filters.furnishing'), value: t(`furnishing.${listing.furnishing}`) },
    { icon: Thermometer, label: t('filters.heating'), value: t(`heating.${listing.heating}`) },
    { icon: UsersThree, label: t('filters.suitableFor'), value: t(`tenant.${listing.tenantPreference}`) },
  ];
  const details = [
    { icon: Droplets, label: t('listing.water'), value: t(`water.${listing.waterSupply}`) },
    { icon: CalendarDots, label: t('detail.availableFrom'), value: availableNow ? t('detail.now') : formatDate(listing.availableFrom, lang) },
    { icon: HourglassMedium, label: t('detail.minStay'), value: t('detail.months', { n: listing.minStayMonths }) },
    { icon: Coins, label: t('detail.deposit'), value: listing.deposit ? formatRent(listing.deposit) : t('detail.noDeposit') },
  ];
  const canBook = !listing.isOwner && !listing.isAdmin;
  const showMobileBar = canBook && user?.role !== 'owner';

  return (
    <div>
      <div className="container-page pt-5 md:pt-8">
        {/* ---------- breadcrumb ---------- */}
        <nav className="flex items-center gap-1.5 text-sm text-muted mb-6 overflow-x-auto no-scrollbar whitespace-nowrap" aria-label="Breadcrumb">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink me-2">
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" /> {t('common.back')}
          </button>
          <Link to="/listings" className="hover:text-ink">{t('nav.browse')}</Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 shrink-0" />
          <Link to={`/listings?district=${listing.district}`} className="hover:text-ink">{t(`district.${listing.district}`)}</Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 shrink-0" />
          <span className="text-ink-2 truncate">{listing.area}</span>
        </nav>

        {/* ---------- title ---------- */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-7">
          <div className="min-w-0">
            <p className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] ${GOLD}`}>
              <span className={`h-px w-7 ${GOLD_LINE}`} aria-hidden="true" /> {t(`type.${listing.propertyType}`)}
            </p>
            <h1 className="mt-3 text-[1.9rem] md:text-[2.75rem] leading-[1.1] font-bold tracking-tight max-w-3xl">{listing.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-line px-3 py-1.5 font-medium text-ink"><MapPin className="w-4 h-4 text-brand" /> {listing.area}, {t(`district.${listing.district}`)}</span>
              {listing.owner?.isVerified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-50 border border-pine-100 px-3 py-1.5 font-medium text-pine"><BadgeCheck className="w-4 h-4" weight="fill" /> {t('detail.verifiedOwner')}</span>
              )}
              {availableNow && listing.status === 'available' && (
                <span className="inline-flex items-center gap-2 rounded-full bg-success-50 border border-success/15 px-3 py-1.5 font-medium text-success"><span className="w-2 h-2 rounded-full bg-success animate-pulse" /> {t('detail.availableNow')}</span>
              )}
              {listing.owner?.ratingCount > 0 && (
                <a href="#reviews" className="inline-flex items-center gap-1 rounded-full bg-surface border border-line px-3 py-1.5 hover:border-line-strong">
                  <Star className="w-4 h-4 fill-gold text-gold" /> <span className="font-semibold text-ink ltr-nums">{listing.owner.ratingAvg.toFixed(1)}</span>
                  <span className="text-muted ltr-nums">({listing.owner.ratingCount})</span>
                </a>
              )}
              <span className="text-muted ms-1">{t('detail.listed', { when: timeAgo(listing.createdAt, lang) })}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={share} className="btn btn-secondary btn-sm"><Share2 className="w-4 h-4" /> {t('detail.share')}</button>
            {canBook && <SaveButton listingId={listing.id} initial={listing.isSaved} variant="button" />}
          </div>
        </header>

        {listing.status === 'removed' && (
          <div className="mb-6 rounded-2xl border border-danger/25 bg-danger-50 text-danger p-4 flex gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('detail.removedTitle')}</p>
              <p className="text-sm mt-0.5">{t('detail.removedText', { reason: listing.moderationReason || '—' })}</p>
            </div>
          </div>
        )}

        <Gallery images={listing.images} title={listing.title} />
      </div>

      {/* ---------- section tabs (stick under the navbar; the current one is underlined) ---------- */}
      <div className="sticky top-16 md:top-[72px] z-20 mt-8 bg-canvas/90 backdrop-blur border-b border-line">
        <nav className="container-page flex gap-7 overflow-x-auto no-scrollbar" aria-label={t('detail.overview')}>
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              aria-current={activeTab === tab.id ? 'true' : undefined}
              className={`py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === tab.id ? 'text-ink border-ink' : 'text-muted border-transparent hover:text-ink'
              }`}
            >
              {tab.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="container-page grid lg:grid-cols-[minmax(0,1fr)_380px] gap-x-16">
        <div className="min-w-0">
          <Section id="overview" title={t('detail.overview')}>
            <Facts items={facts} />
            <div className="mt-10"><Highlights rows={highlights} /></div>
            {listing.description && (
              <div className="mt-10 pt-10 border-t border-line">
                <h3 className="text-lg font-semibold tracking-tight mb-3">{t('detail.about')}</h3>
                <Description text={listing.description} />
              </div>
            )}
            <div className="mt-10 pt-10 border-t border-line">
              <h3 className="text-lg font-semibold tracking-tight mb-4">{t('detail.goodToKnow')}</h3>
              <DetailList rows={details} />
            </div>
          </Section>

          {listing.amenities?.length > 0 && (
            <Section id="amenities" title={t('detail.amenities')}>
              <Amenities items={listing.amenities} />
            </Section>
          )}

          <Section id="location" title={t('detail.location')}>
            <div className="relative rounded-3xl overflow-hidden border border-line shadow-card">
              <Suspense fallback={<div className="h-80 skeleton" />}>
                <ListingMap location={listing.location} className="h-72 md:h-[420px]" />
              </Suspense>
              <div className="pointer-events-none absolute top-3 start-3 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 backdrop-blur px-3.5 py-2 text-sm font-semibold text-ink shadow-card">
                <MapPin className="w-4 h-4 text-brand" /> {listing.area}, {t(`district.${listing.district}`)}
              </div>
            </div>
            <p className="mt-4 flex items-start gap-3 rounded-2xl bg-pine-50/70 border border-pine-100 px-4 py-3.5 text-sm text-ink-2">
              {listing.location?.exact ? <MapPin className="w-[18px] h-[18px] mt-px shrink-0 text-pine" /> : <Lock className="w-[18px] h-[18px] mt-px shrink-0 text-pine" />}
              {listing.location?.exact ? t('detail.exactLocation') : t('detail.approxLocation')}
            </p>
          </Section>

          <Section id="owner" title={t('detail.meetOwner')}>
            <OwnerCard listing={listing} />
          </Section>

          {listing.owner && <Reviews ownerId={listing.owner.id} />}

          {canBook && (
            <div className="py-8 border-t border-line"><ReportButton targetType="listing" targetId={listing.id} /></div>
          )}
        </div>

        <aside className="pt-8 lg:pt-10 lg:sticky lg:top-[136px] self-start">
          <BookingPanel listing={listing} onChange={() => setReload((n) => n + 1)} />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="container-page mt-16 pt-10 border-t border-line">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-6">{t('detail.similar')}</h2>
          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-9">
            {similar.map((l) => <StaggerItem key={l.id}><ListingCard listing={l} /></StaggerItem>)}
          </StaggerGrid>
        </section>
      )}

      {/* ---------- phones: price, message and request always visible at the bottom ---------- */}
      {showMobileBar && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="leading-tight mb-2.5">
            <span className="font-display text-xl font-semibold ltr-nums">{formatRent(listing.rent)}</span>
            <span className="text-sm text-muted"> / {t('listing.month')}</span>
            <span className="text-xs text-muted ms-2">{t('detail.minStay')}: {t('detail.months', { n: listing.minStayMonths })}</span>
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={openChat} disabled={chatBusy} className="btn btn-secondary">
              {chatBusy ? <Spinner /> : <><MessageCircle className="w-4 h-4" /> {t('detail.messageOwner')}</>}
            </button>
            <a href="#book" className="btn btn-ink">{t('detail.requestToRent')}</a>
          </div>
        </div>
      )}
    </div>
  );
}