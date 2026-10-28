// pages/Home.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, ArrowRight, Home as HomeIcon } from '@/components/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DISTRICTS, POPULAR_AREAS, PROPERTY_TYPES } from '../lib/constants';
import { formatRent } from '../lib/format';
import ListingCard, { ListingCardSkeleton } from '../components/ListingCard';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { Reveal, StaggerGrid, StaggerItem } from '../components/motion';
import { SITE_IMAGES, DISTRICT_IMAGES } from '../lib/images';
import { NumberTicker, ShineBadge, Marquee } from '../components/ui/magic';
import HowItWorks from '../components/home/HowItWorks';
import TrustSection from '../components/home/TrustSection';
import Select from '../components/ui/Select';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] } }) };

/** One district card: photo (or colour), name and how many homes are listed there. */
function DistrictTile({ district, info, big = false }) {
  const { t } = useLanguage();
  const image = DISTRICT_IMAGES[district];
  return (
    <Link
      to={`/listings?district=${district}`}
      className={`group relative overflow-hidden rounded-3xl bg-pine text-white flex flex-col justify-end p-5 md:p-6 shadow-card hover:shadow-lift transition-shadow ${
        big ? 'col-span-2 md:row-span-2 h-64 md:h-auto' : 'h-44 md:h-auto'
      }`}
    >
      {image && (
        <img src={image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent" aria-hidden="true" />
      <div className="relative flex items-end justify-between gap-3">
        <div>
          <p className={`font-extrabold ${big ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'}`}>{t(`district.${district}`)}</p>
          <p className="text-sm text-white/85 mt-1">
            {info ? t('home.districtCount', { n: info.count, rent: formatRent(info.avgRent, { compact: true }) }) : t('home.districtSoon')}
          </p>
        </div>
        <span className="w-10 h-10 shrink-0 rounded-full bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center transition-all group-hover:bg-white group-hover:text-pine">
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </span>
      </div>
    </Link>
  );
}

function HeroSearch() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [district, setDistrict] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');

  function submit(e) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (district) p.set('district', district);
    if (q.trim()) p.set('q', q.trim());
    if (type) p.set('propertyType', type);
    navigate(`/listings?${p}`);
  }

  return (
    <form onSubmit={submit} className="bg-surface rounded-3xl md:rounded-full shadow-pop p-2 md:p-2 grid md:grid-cols-[1.1fr_1.3fr_1fr_auto] gap-1 text-ink">
      <div className="px-5 py-2.5 md:py-2 rounded-2xl md:rounded-full hover:bg-sunken transition-colors">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-2">{t('home.where')}</span>
        <Select
          label={t('home.where')}
          value={district}
          onChange={setDistrict}
          options={[{ value: '', label: t('home.allDistricts') }, ...DISTRICTS.map((d) => ({ value: d, label: t(`district.${d}`) }))]}
          buttonClassName="text-sm font-medium cursor-pointer py-0.5"
        />
      </div>
      <label className="px-5 py-2.5 md:py-2 rounded-2xl md:rounded-full hover:bg-sunken transition-colors md:border-s border-line cursor-text">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-2">{t('home.area')}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.areaPlaceholder')} className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted" />
      </label>
      <div className="px-5 py-2.5 md:py-2 rounded-2xl md:rounded-full hover:bg-sunken transition-colors md:border-s border-line">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-2">{t('home.type')}</span>
        <Select
          label={t('home.type')}
          value={type}
          onChange={setType}
          options={[{ value: '', label: t('home.anyType') }, ...PROPERTY_TYPES.map((p) => ({ value: p, label: t(`type.${p}`) }))]}
          buttonClassName="text-sm font-medium cursor-pointer py-0.5"
        />
      </div>
      <button className="btn btn-primary h-14 md:h-auto md:w-14 md:min-h-14 rounded-2xl md:rounded-full m-1 md:m-0" aria-label={t('home.search')}>
        <Search className="w-5 h-5" />
        <span className="md:hidden">{t('home.search')}</span>
      </button>
    </form>
  );
}

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  useDocumentTitle(null);
  const [latest, setLatest] = useState(null);
  const [stats, setStats] = useState(null);
  const reduceMotion = useReducedMotion();
  const isTenant = user?.role === 'tenant';

  useEffect(() => {
    api.get('/listings', { params: { limit: 8, sort: 'newest' } }).then((r) => setLatest(r.data.items)).catch(() => setLatest([]));
    api.get('/listings/stats').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const byDistrict = Object.fromEntries((stats?.districts || []).map((d) => [d.district, d]));
  const featuredDistricts = ['Gilgit', 'Hunza', 'Skardu', 'Nagar', 'Ghanche'];


  return (
    <div>
      {/* ---------------- Hero: full-width mountain photo ---------------- */}
      <section className="relative -mt-16 md:-mt-[72px] pt-16 md:pt-[72px] overflow-hidden bg-pine-900 text-white min-h-[640px] md:min-h-[86vh] flex items-center">
        {/* Slow zoom-out on the photo ("Ken Burns" effect) */}
        <motion.img
          src={SITE_IMAGES.hero}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
          initial={reduceMotion ? false : { scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 9, ease: 'easeOut' }}
        />
        {/* Dark overlays so white text is always readable */}
        <div className="absolute inset-0 bg-linear-to-r from-pine-900/90 via-pine-900/50 to-transparent rtl:bg-linear-to-l" aria-hidden="true" />
        <div className="aurora -start-24 top-1/4 w-[28rem] h-[28rem] bg-violet/40" aria-hidden="true" />
        <div className="aurora start-1/3 -bottom-24 w-[24rem] h-[24rem] bg-rose/30 [animation-delay:-6s]" aria-hidden="true" />
        <div className="absolute inset-0 bg-linear-to-t from-pine-900/85 via-transparent to-pine-900/40" aria-hidden="true" />

        <div className="relative container-page w-full pt-16 pb-36 md:pt-20 md:pb-44">
          <motion.div initial="hidden" animate="show" variants={fadeUp} custom={0}>
            <ShineBadge className="bg-white/10 backdrop-blur-md text-white">{t('home.badge')}</ShineBadge>
          </motion.div>
          <motion.h1 initial="hidden" animate="show" variants={fadeUp} custom={1} className="mt-6 text-[2.6rem] leading-[1.05] sm:text-6xl md:text-7xl font-extrabold max-w-3xl drop-shadow-sm">
            {t('home.title1')} <span className="font-serif italic font-normal text-gradient-light pe-1">{t('home.title2')}</span> {t('home.title3')}
          </motion.h1>
          <motion.p initial="hidden" animate="show" variants={fadeUp} custom={2} className="mt-5 text-lg md:text-xl text-white/85 max-w-xl leading-relaxed">
            {t('home.subtitle')}
          </motion.p>
          <motion.div initial="hidden" animate="show" variants={fadeUp} custom={3} className="mt-9 max-w-4xl">
            <HeroSearch />
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-white/75 me-1">{t('home.popular')}</span>
              {POPULAR_AREAS.slice(0, 5).map((p) => (
                <Link key={p.area} to={`/listings?district=${p.district}&area=${encodeURIComponent(p.area)}`} className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 backdrop-blur-md transition-colors">
                  {p.area}
                </Link>
              ))}
            </div>
          </motion.div>

        </div>
      </section>

      {/* ---------------- Stats strip ---------------- */}
      <section className="container-page -mt-14 relative z-10">
        <div className="beam card rounded-3xl grid grid-cols-2 md:grid-cols-4 md:divide-x md:rtl:divide-x-reverse divide-line">
          {[
            { v: stats?.total ?? 0, l: t('home.statListings') },
            { v: 14, l: t('home.statDistricts') },
            { v: stats?.owners ?? 0, l: t('home.statOwners') },
            { v: 0, l: t('home.statFees'), prefix: 'Rs ' },
          ].map((s, i) => (
            <div key={i} className={`p-5 md:p-7 text-center ${i > 1 ? 'border-t md:border-t-0 border-line' : ''} ${i % 2 === 0 ? 'border-e md:border-e-0 border-line' : ''}`}>
              <p className="font-display text-3xl md:text-[2.6rem] font-extrabold text-gradient leading-none py-1">
                <NumberTicker value={s.v} prefix={s.prefix} />
              </p>
              <p className="text-sm text-ink-2 mt-2">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Districts: photo mosaic ---------------- */}
      <Reveal as="section" className="container-page mt-24">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-gradient font-semibold text-sm uppercase tracking-wider w-fit">{t('home.exploreKicker')}</p>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-2">{t('home.exploreTitle')}</h2>
          </div>
          <Link to="/listings" className="hidden sm:inline-flex btn btn-ghost">{t('home.seeAll')} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-4 md:h-[520px]">
          {featuredDistricts.map((d, i) => (
            <DistrictTile key={d} district={d} info={byDistrict[d]} big={i === 0} />
          ))}
        </div>

        {/* Every other district, scrolling slowly */}
        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm text-ink-2 shrink-0">{t('home.moreDistricts')}</span>
          <Marquee className="flex-1">
            {DISTRICTS.filter((d) => !featuredDistricts.includes(d)).map((d) => (
              <Link key={d} to={`/listings?district=${d}`} className="shrink-0 px-3.5 py-1.5 rounded-full border border-line bg-surface text-sm font-medium hover:border-violet hover:text-violet transition-colors">
                {t(`district.${d}`)}
                {byDistrict[d] && <span className="ms-1.5 text-muted ltr-nums">{byDistrict[d].count}</span>}
              </Link>
            ))}
          </Marquee>
        </div>
      </Reveal>

      {/* ---------------- Latest listings ---------------- */}
      <Reveal as="section" className="container-page mt-24">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-gradient font-semibold text-sm uppercase tracking-wider w-fit">{t('home.latestKicker')}</p>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-2">{t('home.latestTitle')}</h2>
          </div>
          <Link to="/listings" className="btn btn-secondary">{t('home.seeAll')} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></Link>
        </div>
        {latest === null ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-9">
            {Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)}
          </div>
        ) : (
          <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-9">
            {latest.map((l) => <StaggerItem key={l.id}><ListingCard listing={l} /></StaggerItem>)}
          </StaggerGrid>
        )}
        {latest && latest.length === 0 && (
          <div className="card p-10 text-center">
            <p className="font-semibold">{t('home.noListingsYet')}</p>
            <Link to="/register?role=owner" className="btn btn-primary mt-4">{t('nav.listProperty')}</Link>
          </div>
        )}
      </Reveal>

      <HowItWorks />

      <TrustSection />

      {/* ---------------- Closing call-to-action on a photo ---------------- */}
      <Reveal as="section" className="container-page mt-28">
        <div className="relative overflow-hidden rounded-[2rem] min-h-[340px] md:min-h-[400px] flex items-end text-white shadow-lift">
          <img
            src={SITE_IMAGES.owner}
            alt=""
            aria-hidden="true"
            loading="lazy"
            // until owner.webp is added, fall back to the night photo
            onError={(e) => { if (!e.currentTarget.src.endsWith(SITE_IMAGES.cta)) e.currentTarget.src = SITE_IMAGES.cta; }}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-pine-900/95 via-pine-900/60 to-pine-900/10" aria-hidden="true" />
          <div className="relative w-full p-8 md:p-14 flex flex-col md:flex-row md:items-end gap-6 justify-between">
            <div className="max-w-xl">
              <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center mb-5"><HomeIcon className="w-6 h-6" /></div>
              <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">{isTenant ? t('home.tenantCtaTitle') : t('home.ctaTitle')}</h2>
              <p className="text-white/85 mt-3 text-lg">{isTenant ? t('home.tenantCtaText') : t('home.ctaText')}</p>
            </div>
            <Link
              to={isTenant ? '/listings' : user?.role === 'owner' ? '/dashboard/listings/new' : '/register?role=owner'}
              className="btn btn-primary btn-lg shrink-0"
            >
              {isTenant ? t('home.tenantCtaButton') : t('home.ctaButton')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
