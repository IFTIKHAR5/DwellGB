// pages/PublicProfile.jsx — an owner's (or tenant's) public page.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, MapPin, CalendarDays, Star } from '@/components/icons';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../lib/format';
import Avatar from '../components/ui/Avatar';
import { Stars } from '../components/ui/StarRating';
import { PageLoader } from '../components/ui/Spinner';
import ListingCard from '../components/ListingCard';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { StaggerGrid, StaggerItem } from '../components/motion';
import ReportButton from '../components/ReportModal';
import { useAuth } from '../context/AuthContext';

export default function PublicProfile() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const { user: me } = useAuth();
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState(false);
  useDocumentTitle(user?.name);

  useEffect(() => {
    setUser(null);
    setError(false);
    api.get(`/users/${id}`).then((r) => setUser(r.data)).catch(() => setError(true));
    api.get(`/reviews/owner/${id}`).then((r) => setReviews(r.data)).catch(() => setReviews({ reviews: [], count: 0, breakdown: [] }));
  }, [id]);

  if (error) return <div className="container-page py-24 text-center"><h1 className="text-2xl font-bold">{t('profile.notFound')}</h1><Link to="/" className="btn btn-primary mt-6">{t('common.home')}</Link></div>;
  if (!user) return <PageLoader />;

  return (
    <div className="container-page py-10 grid lg:grid-cols-[320px_1fr] gap-10">
      <aside className="lg:sticky lg:top-24 self-start card p-7 text-center">
        <Avatar name={user.name} src={user.avatar} size="xl" online={user.online} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-extrabold flex items-center justify-center gap-1.5">{user.name} {user.isVerified && <BadgeCheck className="w-6 h-6 text-pine" />}</h1>
        <p className="text-sm text-muted">{t(`role.${user.role}`)}</p>
        {user.ratingCount > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Stars value={user.ratingAvg} /> <span className="font-bold ltr-nums">{user.ratingAvg.toFixed(1)}</span> <span className="text-sm text-muted ltr-nums">({user.ratingCount})</span>
          </div>
        )}
        <div className="mt-5 space-y-2 text-sm text-ink-2 text-start">
          {user.place && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {user.place}</p>}
          <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> {t('detail.memberSince', { date: formatDate(user.memberSince, lang, { month: 'long', year: 'numeric' }) })}</p>
        </div>
        {user.bio && <p className="mt-5 text-sm text-ink-2 leading-relaxed text-start border-t border-line pt-5">{user.bio}</p>}
        {me?.id !== user.id && user.role !== 'admin' && me?.role !== 'admin' && (
          <div className="mt-5 pt-4 border-t border-line"><ReportButton targetType="user" targetId={user.id} /></div>
        )}
      </aside>

      <div className="min-w-0">
        {user.role === 'owner' && (
          <section>
            <h2 className="text-2xl font-bold">{t('profile.listings', { name: user.name.split(' ')[0] })}</h2>
            {user.listings.length ? (
              <StaggerGrid className="mt-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-9">
                {user.listings.map((l) => <StaggerItem key={l.id}><ListingCard listing={l} /></StaggerItem>)}
              </StaggerGrid>
            ) : <p className="mt-4 text-muted">{t('profile.noListings')}</p>}
          </section>
        )}

        {reviews && reviews.count > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-bold flex items-center gap-2"><Star className="w-6 h-6 fill-gold text-gold" /> {t('detail.reviewsCount', { n: reviews.count })}</h2>
            <div className="mt-5 card p-5 max-w-md space-y-1.5">
              {reviews.breakdown.map((b) => (
                <div key={b.star} className="flex items-center gap-3 text-sm">
                  <span className="w-3 ltr-nums">{b.star}</span>
                  <span className="flex-1 h-2 rounded-full bg-sunken overflow-hidden"><span className="block h-full bg-gold rounded-full" style={{ width: `${(b.count / reviews.count) * 100}%` }} /></span>
                  <span className="w-6 text-end text-muted ltr-nums">{b.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 grid md:grid-cols-2 gap-5">
              {reviews.reviews.map((r) => (
                <div key={r.id} className="card p-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.tenant?.name || '?'} src={r.tenant?.avatar} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{r.tenant?.name || t('detail.formerTenant')}</p>
                      <p className="text-xs text-muted">{formatDate(r.createdAt, lang, { month: 'long', year: 'numeric' })}{r.listing ? ` · ${r.listing.title}` : ''}</p>
                    </div>
                    <Stars value={r.rating} size="w-3.5 h-3.5" />
                  </div>
                  {r.comment && <p className="mt-3 text-sm text-ink-2 leading-relaxed">{r.comment}</p>}
                  {r.ownerReply && <p className="mt-3 text-sm bg-sunken rounded-xl p-3"><span className="font-semibold">{t('detail.ownerReply')}:</span> {r.ownerReply}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
