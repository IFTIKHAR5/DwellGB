// components/ListingCard.jsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, BedDouble, Bath, Flame, BadgeCheck, Images } from '@/components/icons';
import { useLanguage } from '../context/LanguageContext';
import { mediaUrl } from '../api/client';
import { formatRent } from '../lib/format';
import SaveButton from './SaveButton';
import { RatingPill } from './ui/StarRating';

export function ListingCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/3] rounded-3xl" />
      <div className="skeleton h-4 w-3/4 mt-3" />
      <div className="skeleton h-3.5 w-1/2 mt-2" />
      <div className="skeleton h-4 w-1/3 mt-3" />
    </div>
  );
}

export default function ListingCard({ listing, onHover, active = false, showSave = true }) {
  const { t } = useLanguage();
  const cover = mediaUrl(listing.cover);
  const rented = listing.status === 'rented';

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
    <Link
      to={`/listings/${listing.id}`}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group block rounded-3xl transition-all ${active ? 'ring-2 ring-pine ring-offset-4 ring-offset-canvas' : ''}`}
    >
      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-sunken shadow-card group-hover:shadow-lift transition-shadow">
        {cover ? (
          <img src={cover} alt={listing.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-sm">{t('listing.noPhoto')}</div>
        )}
        <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between">
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2.5 py-1 rounded-full bg-white/95 text-[11px] font-bold text-ink shadow-card">{t(`type.${listing.propertyType}`)}</span>
            {rented && <span className="px-2.5 py-1 rounded-full bg-ink/80 text-[11px] font-bold text-white">{t('status.rented')}</span>}
          </div>
          {showSave && <SaveButton listingId={listing.id} initial={listing.isSaved} />}
        </div>
        {/* soft shade at the bottom so the photo-count badge stays readable */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        {listing.imageCount > 1 && (
          <span className="absolute bottom-3 end-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/55 text-white text-[11px] font-medium ltr-nums">
            <Images className="w-3 h-3" /> {listing.imageCount}
          </span>
        )}
      </div>

      <div className="pt-3 px-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-[15px] leading-snug text-ink line-clamp-1 group-hover:text-pine transition-colors">{listing.title}</h3>
          {listing.owner && <RatingPill avg={listing.owner.ratingAvg} count={listing.owner.ratingCount} className="shrink-0 text-xs" />}
        </div>
        <p className="flex items-center gap-1 text-sm text-muted mt-0.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="line-clamp-1">{listing.area}, {t(`district.${listing.district}`)}</span>
          {listing.owner?.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-pine shrink-0" />}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-2">
          <span className="inline-flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> <span className="ltr-nums">{listing.bedrooms}</span> {t('listing.beds')}</span>
          <span className="inline-flex items-center gap-1"><Bath className="w-3.5 h-3.5" /> <span className="ltr-nums">{listing.bathrooms}</span> {t('listing.baths')}</span>
          {listing.heating && listing.heating !== 'none' && (
            <span className="inline-flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> {t(`heating.${listing.heating}`)}</span>
          )}
        </div>
        <p className="mt-2">
          <span className="font-display font-bold text-[17px] text-ink ltr-nums">{formatRent(listing.rent)}</span>
          <span className="text-sm text-muted"> / {t('listing.month')}</span>
        </p>
      </div>
    </Link>
    </motion.div>
  );
}
