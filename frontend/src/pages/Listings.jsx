// pages/Listings.jsx — search with filters in the URL, results grid + live Mapbox map.
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Map as MapIcon, List, X, ChevronLeft, ChevronRight, SearchX } from '@/components/icons';
import api, { apiError } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import {
  DISTRICTS, DISTRICT_CENTERS, PROPERTY_TYPES, FURNISHING, TENANT_PREFERENCES, HEATING, AMENITIES, SORTS, PRICE_PRESETS,
} from '../lib/constants';
import { formatRent } from '../lib/format';
import ListingCard, { ListingCardSkeleton } from '../components/ListingCard';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import useDebounce from '../hooks/useDebounce';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { StaggerGrid, StaggerItem } from '../components/motion';
import { DISTRICT_IMAGES } from '../lib/images';

const SearchMap = lazy(() => import('../components/map/SearchMap'));

const ARRAY_KEYS = ['propertyType', 'amenities'];
const FILTER_KEYS = ['q', 'district', 'area', 'propertyType', 'minRent', 'maxRent', 'bedrooms', 'bathrooms', 'furnishing', 'tenantPreference', 'heating', 'amenities', 'includeRented', 'bbox'];

function paramsToFilters(sp) {
  const f = {};
  for (const k of FILTER_KEYS) {
    const v = sp.get(k);
    if (v === null || v === '') continue;
    f[k] = ARRAY_KEYS.includes(k) ? v.split(',').filter(Boolean) : v;
  }
  f.sort = sp.get('sort') || 'newest';
  f.page = Number(sp.get('page')) || 1;
  return f;
}

// Text for a price preset, e.g. "Under Rs 15k", "Rs 15k – 30k".
function priceLabel(p, t) {
  if (p.min === '') return t('filters.under', { v: formatRent(p.max, { compact: true }) });
  if (p.max === '') return t('filters.over', { v: formatRent(p.min, { compact: true }) });
  return `${formatRent(p.min, { compact: true })} – ${formatRent(p.max, { compact: true })}`;
}

/**
 * Which filter options have homes for this place + budget (GET /listings/facets).
 * Used to hide options that would give 0 results.
 */
function useFacets({ district, area, bbox, q, minRent, maxRent }) {
  const [facets, setFacets] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api
      .get('/listings/facets', { params: { district, area, bbox, q, minRent, maxRent } })
      .then((r) => !cancelled && setFacets(r.data))
      .catch(() => !cancelled && setFacets(null));
    return () => { cancelled = true; };
  }, [district, area, bbox, q, minRent, maxRent]);
  return facets;
}

export default function Listings() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const filters = useMemo(() => paramsToFilters(sp), [sp]);
  useDocumentTitle(filters.district ? t('listings.titleIn', { place: t(`district.${filters.district}`) }) : t('listings.title'));

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState(filters.q || '');
  const debouncedQ = useDebounce(q, 400);
  const [showMap, setShowMap] = useState(() => window.matchMedia?.('(min-width: 1024px)').matches ?? true);
  const [mobileMap, setMobileMap] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hoverId, setHoverId] = useState(null);
  const [searchOnMove, setSearchOnMove] = useState(true);

  const update = useCallback(
    (patch, { keepPage = false } = {}) => {
      const next = new URLSearchParams(sp);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || v === false) next.delete(k);
        else next.set(k, Array.isArray(v) ? v.join(',') : String(v));
      }
      if (!keepPage) next.delete('page');
      setSp(next, { replace: false });
    },
    [sp, setSp],
  );

  // keyword box → URL (debounced)
  useEffect(() => {
    if ((filters.q || '') !== debouncedQ.trim()) update({ q: debouncedQ.trim() });
    // eslint-disable-next-line
  }, [debouncedQ]);

  useEffect(() => {
    let cancelled = false;
    setError('');
    const params = { ...filters, limit: 18 };
    for (const k of ARRAY_KEYS) if (params[k]) params[k] = params[k].join(',');
    api
      .get('/listings', { params })
      .then((r) => !cancelled && setData(r.data))
      .catch((err) => !cancelled && (setError(apiError(err)), setData({ items: [], total: 0, pages: 1, page: 1 })));
    return () => { cancelled = true; };
  }, [filters]);

  const facets = useFacets(filters);
  // Everything set inside the "Filters" panel (it also holds district/type/price on phones).
  const activeCount =
    ['district', 'bedrooms', 'furnishing', 'tenantPreference', 'heating'].filter((k) => filters[k]).length +
    (filters.minRent || filters.maxRent ? 1 : 0) +
    (filters.propertyType?.length || 0) +
    (filters.amenities?.length || 0);
  // Property types that have homes here (all types while facets are loading).
  const typesHere = facets ? PROPERTY_TYPES.filter((p) => facets.propertyType[p]) : PROPERTY_TYPES;
  const hasAnyFilter = FILTER_KEYS.some((k) => filters[k]);
  const priceKey = `${filters.minRent || ''}-${filters.maxRent || ''}`;

  const onBoundsChange = useCallback((bbox) => { if (searchOnMove) update({ bbox: bbox.join(',') }); }, [searchOnMove, update]);

  const items = data?.items || [];
  const gridCols = showMap ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  const flyTo = filters.district && !filters.bbox ? DISTRICT_CENTERS[filters.district] : null;

  return (
    <div className="flex flex-col">
      {/* ---------- filter bar ---------- */}
      <div className="sticky top-16 md:top-[72px] z-30 bg-surface/95 backdrop-blur border-b border-line">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="relative min-w-[150px] sm:min-w-[200px] flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('listings.searchPlaceholder')} className="input h-10 ps-10 rounded-full" aria-label={t('listings.searchPlaceholder')} />
          </div>
          {/* The three filters most people use. On phones they live inside the "Filters" panel. */}
          <select className="hidden md:block input h-10 w-auto rounded-full text-sm font-medium" value={filters.district || ''} onChange={(e) => update({ district: e.target.value, bbox: '' })} aria-label={t('filters.district')}>
            <option value="">{t('home.allDistricts')}</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{t(`district.${d}`)}</option>)}
          </select>
          <select className="hidden md:block input h-10 w-auto rounded-full text-sm font-medium" value={filters.propertyType?.[0] || ''} onChange={(e) => update({ propertyType: e.target.value ? [e.target.value] : [] })} aria-label={t('filters.type')}>
            <option value="">{t('home.anyType')}</option>
            {typesHere.map((p) => (
              <option key={p} value={p}>{t(`type.${p}`)}{facets ? ` (${facets.propertyType[p]})` : ''}</option>
            ))}
          </select>
          <select
            className="hidden md:block input h-10 w-auto rounded-full text-sm font-medium"
            value={PRICE_PRESETS.some((p) => `${p.min}-${p.max}` === priceKey) ? priceKey : priceKey === '-' ? '' : 'custom'}
            onChange={(e) => {
              if (e.target.value === 'custom') return setMoreOpen(true);
              const [min, max] = e.target.value.split('-');
              update({ minRent: min, maxRent: max });
            }}
            aria-label={t('filters.price')}
          >
            <option value="">{t('filters.anyPrice')}</option>
            {PRICE_PRESETS.map((p) => <option key={`${p.min}-${p.max}`} value={`${p.min}-${p.max}`}>{priceLabel(p, t)}</option>)}
            <option value="custom">{t('filters.custom')}</option>
          </select>
          <button onClick={() => setMoreOpen(true)} className="chip h-10 shrink-0" data-active={activeCount > 0}>
            <SlidersHorizontal className="w-4 h-4" /> {t('filters.title')}
            {activeCount > 0 && <span className="ltr-nums min-w-5 h-5 px-1 rounded-full bg-white/20 text-xs flex items-center justify-center">{activeCount}</span>}
          </button>
          {hasAnyFilter && (
            <button onClick={() => { setQ(''); setSp(new URLSearchParams()); }} className="btn btn-ghost btn-sm shrink-0 text-brand" aria-label={t('filters.clear')}>
              <X className="w-4 h-4" /> <span className="hidden sm:inline">{t('filters.clear')}</span>
            </button>
          )}
          <div className="ms-auto hidden lg:flex items-center gap-2 shrink-0">
            <select className="input h-10 w-auto rounded-full text-sm" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} aria-label={t('filters.sort')}>
              {SORTS.map((s) => <option key={s} value={s}>{t(`sort.${s}`)}</option>)}
            </select>
            <button onClick={() => setShowMap((s) => !s)} className="btn btn-secondary btn-sm h-10 rounded-full">
              {showMap ? <List className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />} {showMap ? t('listings.hideMap') : t('listings.showMap')}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- results + map ---------- */}
      <div className={`max-w-[1600px] w-full mx-auto px-4 sm:px-6 grid ${showMap ? 'lg:grid-cols-[minmax(0,1fr)_minmax(420px,44%)]' : ''} gap-6`}>
        {/* pb-28 on phones: room so the floating "Show map" button never covers the pagination */}
        <div className="pt-6 pb-28 lg:pb-6 min-w-0">
          {/* Photo banner when a district with a photo is selected */}
          {filters.district && DISTRICT_IMAGES[filters.district] && (
            <div key={filters.district} className="relative mb-6 h-36 md:h-44 rounded-3xl overflow-hidden text-white animate-fade-in">
              <img src={DISTRICT_IMAGES[filters.district]} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-linear-to-r from-pine-900/85 via-pine-900/40 to-transparent rtl:bg-linear-to-l" aria-hidden="true" />
              <div className="relative h-full flex flex-col justify-end p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-highlight">{t('home.exploreKicker')}</p>
                <h1 className="text-3xl md:text-4xl font-extrabold mt-1">{t(`district.${filters.district}`)}</h1>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 mb-5">
            <p className="text-sm text-ink-2">
              {data ? (
                <>
                  <span className="font-bold text-ink ltr-nums">{data.total}</span> {t('listings.homes')}
                  {filters.district && <> · {t(`district.${filters.district}`)}</>}
                  {filters.bbox && (
                    <button onClick={() => update({ bbox: '' })} className="ms-2 text-pine font-semibold hover:underline">{t('listings.clearArea')}</button>
                  )}
                </>
              ) : ' '}
            </p>
            <select className="lg:hidden input h-9 w-auto rounded-full text-sm" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
              {SORTS.map((s) => <option key={s} value={s}>{t(`sort.${s}`)}</option>)}
            </select>
          </div>

          {error && <div className="card p-4 mb-5 text-danger text-sm">{error}</div>}

          {data === null ? (
            <div className={`grid gap-x-5 gap-y-9 ${gridCols}`}>
              {Array.from({ length: 9 }).map((_, i) => <ListingCardSkeleton key={i} />)}
            </div>
          ) : (
            // key → the stagger animation replays for every new set of results
            <StaggerGrid key={items.map((l) => l.id).join()} className={`grid gap-x-5 gap-y-9 ${gridCols}`}>
              {items.map((l) => (
                <StaggerItem key={l.id}>
                  <ListingCard listing={l} onHover={setHoverId} active={hoverId === l.id} />
                </StaggerItem>
              ))}
            </StaggerGrid>
          )}

          {data && !items.length && !error && (
            <EmptyState
              icon={SearchX}
              title={t('listings.emptyTitle')}
              text={t('listings.emptyText')}
              action={<button className="btn btn-secondary" onClick={() => { setQ(''); setSp(new URLSearchParams()); }}>{t('filters.clear')}</button>}
            />
          )}

          {data && data.pages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-12" aria-label="Pagination">
              <button className="btn btn-secondary btn-icon" disabled={filters.page <= 1} onClick={() => { update({ page: filters.page - 1 }, { keepPage: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Previous page">
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <span className="text-sm font-semibold px-3 ltr-nums">{filters.page} / {data.pages}</span>
              <button className="btn btn-secondary btn-icon" disabled={filters.page >= data.pages} onClick={() => { update({ page: filters.page + 1 }, { keepPage: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Next page">
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </nav>
          )}
        </div>

        {(showMap || mobileMap) && (
          <div className={mobileMap ? 'fixed inset-x-0 bottom-0 top-16 z-40 bg-surface p-2 pb-20 lg:static lg:p-0 lg:z-auto' : 'hidden lg:block'}>
            <div className="lg:sticky lg:top-[140px] h-full lg:h-[calc(100vh-160px)] lg:my-6 relative">
              <Suspense fallback={<div className="w-full h-full skeleton rounded-2xl" />}>
                <SearchMap listings={items} activeId={hoverId} onBoundsChange={onBoundsChange} onOpen={(id) => navigate(`/listings/${id}`)} flyTo={flyTo} t={t} className="h-full" />
              </Suspense>
              <label className="absolute top-3 left-3 z-10 inline-flex items-center gap-2 bg-surface rounded-full shadow-card px-3.5 py-2 text-xs font-semibold cursor-pointer">
                <input type="checkbox" checked={searchOnMove} onChange={(e) => setSearchOnMove(e.target.checked)} className="accent-[var(--color-pine)]" />
                {t('listings.searchOnMove')}
              </label>
            </div>
          </div>
        )}
      </div>

      {/* mobile map toggle */}
      <button onClick={() => setMobileMap((m) => !m)} className="lg:hidden fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 btn btn-dark rounded-full shadow-pop px-5">
        {mobileMap ? <List className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />} {mobileMap ? t('listings.showList') : t('listings.showMap')}
      </button>

      <FiltersPanel open={moreOpen} onClose={() => setMoreOpen(false)} filters={filters} onApply={(patch) => { update(patch); setMoreOpen(false); }} />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="py-5 border-b border-line last:border-0">
      <p className="font-bold mb-3">{title}</p>
      {children}
    </div>
  );
}

/** A chip with the number of homes that have this option, e.g. "Furnished 4". */
function CountChip({ active, onClick, label, count }) {
  return (
    <button type="button" className="chip" data-active={active} onClick={onClick}>
      {label}
      {count !== undefined && <span className={`ltr-nums text-xs ${active ? 'text-white/75' : 'text-muted'}`}>{count}</span>}
    </button>
  );
}

/**
 * The "Filters" panel. It only shows options that have homes for the chosen place
 * and budget (from /listings/facets), and the apply button shows the live result count.
 */
function FiltersPanel({ open, onClose, filters, onApply }) {
  const { t } = useLanguage();
  const [f, setF] = useState(filters);
  const [resultCount, setResultCount] = useState(null);
  useEffect(() => { if (open) setF(filters); }, [open, filters]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (k, v) => set(k, f[k] === v ? '' : v);
  const toggleIn = (k, v) => setF((p) => ({ ...p, [k]: (p[k] || []).includes(v) ? p[k].filter((x) => x !== v) : [...(p[k] || []), v] }));

  // Options available for the district + budget chosen in this panel.
  // A map area only makes sense for the district it was drawn in.
  const districtChanged = (f.district || '') !== (filters.district || '');
  const bbox = districtChanged ? undefined : f.bbox;
  const facets = useFacets({ district: f.district, area: f.area, bbox, q: f.q, minRent: f.minRent, maxRent: f.maxRent });
  const has = (group, key) => !facets || facets[group][key] > 0;
  const count = (group, key) => facets?.[group][key];

  const patch = {
    district: f.district || '',
    bbox: bbox || '',
    minRent: f.minRent, maxRent: f.maxRent,
    propertyType: f.propertyType || [],
    bedrooms: f.bedrooms, furnishing: f.furnishing, tenantPreference: f.tenantPreference, heating: f.heating,
    amenities: f.amenities || [],
    bathrooms: '', includeRented: '', // no longer offered in the panel
  };

  // Live "Show 12 homes" count while the user changes options.
  const debouncedPatch = useDebounce(JSON.stringify(patch), 300);
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const params = { ...JSON.parse(debouncedPatch), q: f.q, area: f.area, limit: 1 };
    for (const k of Object.keys(params)) if (params[k] === '') delete params[k];
    for (const k of ARRAY_KEYS) params[k] = params[k]?.join(',') || undefined;
    api.get('/listings', { params }).then((r) => !cancelled && setResultCount(r.data.total)).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [debouncedPatch, open]);

  const bedroomOptions = [1, 2, 3, 4].filter((n) => !facets || Object.entries(facets.bedrooms).some(([beds, c]) => Number(beds) >= n && c > 0));
  const furnishingHere = FURNISHING.filter((x) => has('furnishing', x));
  const preferencesHere = TENANT_PREFERENCES.filter((x) => x !== 'any' && has('tenantPreference', x));
  const heatingHere = HEATING.filter((x) => x !== 'none' && has('heating', x));
  const amenitiesHere = AMENITIES.filter(({ key }) => has('amenities', key));
  const typesHere = PROPERTY_TYPES.filter((p) => has('propertyType', p));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('filters.title')}
      size="lg"
      footer={
        <>
          <button className="btn btn-ghost me-auto" onClick={() => setF({ sort: filters.sort, page: 1, q: filters.q, area: filters.area, bbox: filters.bbox })}>{t('filters.reset')}</button>
          <button className="btn btn-primary" disabled={resultCount === 0} onClick={() => onApply(patch)}>
            {resultCount === null ? t('filters.apply') : resultCount === 0 ? t('filters.noHomes') : t('filters.showHomes', { n: resultCount })}
          </button>
        </>
      }
    >
      <Section title={t('filters.district')}>
        <select className="input" value={f.district || ''} onChange={(e) => set('district', e.target.value)}>
          <option value="">{t('home.allDistricts')}</option>
          {DISTRICTS.map((d) => <option key={d} value={d}>{t(`district.${d}`)}</option>)}
        </select>
      </Section>

      <Section title={t('filters.priceRange')}>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRICE_PRESETS.map((p) => {
            const active = String(f.minRent || '') === String(p.min) && String(f.maxRent || '') === String(p.max);
            return (
              <CountChip key={`${p.min}-${p.max}`} active={active} label={priceLabel(p, t)}
                onClick={() => setF((x) => ({ ...x, minRent: active ? '' : p.min, maxRent: active ? '' : p.max }))} />
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input className="input ltr-nums" type="number" min="0" inputMode="numeric" placeholder={t('filters.min')} value={f.minRent || ''} onChange={(e) => set('minRent', e.target.value)} />
          <input className="input ltr-nums" type="number" min="0" inputMode="numeric" placeholder={t('filters.max')} value={f.maxRent || ''} onChange={(e) => set('maxRent', e.target.value)} />
        </div>
      </Section>

      {facets && facets.total === 0 ? (
        <p className="py-8 text-center text-sm text-ink-2">{t('filters.nothingHere')}</p>
      ) : (
        <>
          {typesHere.length > 0 && (
            <Section title={t('filters.type')}>
              <div className="flex flex-wrap gap-2">
                {typesHere.map((p) => (
                  <CountChip key={p} active={(f.propertyType || []).includes(p)} onClick={() => toggleIn('propertyType', p)} label={t(`type.${p}`)} count={count('propertyType', p)} />
                ))}
              </div>
            </Section>
          )}

          {bedroomOptions.length > 0 && (
            <Section title={t('filters.bedrooms')}>
              <div className="flex flex-wrap gap-2">
                <CountChip active={!f.bedrooms} onClick={() => set('bedrooms', '')} label={t('filters.any')} />
                {bedroomOptions.map((n) => (
                  <CountChip key={n} active={String(f.bedrooms) === String(n)} onClick={() => toggle('bedrooms', String(n))} label={`${n}+`} />
                ))}
              </div>
            </Section>
          )}

          {furnishingHere.length > 1 && (
            <Section title={t('filters.furnishing')}>
              <div className="flex flex-wrap gap-2">
                {furnishingHere.map((x) => (
                  <CountChip key={x} active={f.furnishing === x} onClick={() => toggle('furnishing', x)} label={t(`furnishing.${x}`)} count={count('furnishing', x)} />
                ))}
              </div>
            </Section>
          )}

          {preferencesHere.length > 0 && (
            <Section title={t('filters.suitableFor')}>
              <div className="flex flex-wrap gap-2">
                {preferencesHere.map((x) => (
                  <CountChip key={x} active={f.tenantPreference === x} onClick={() => toggle('tenantPreference', x)} label={t(`tenant.${x}`)} count={count('tenantPreference', x)} />
                ))}
              </div>
            </Section>
          )}

          {heatingHere.length > 0 && (
            <Section title={t('filters.heating')}>
              <div className="flex flex-wrap gap-2">
                {heatingHere.map((x) => (
                  <CountChip key={x} active={f.heating === x} onClick={() => toggle('heating', x)} label={t(`heating.${x}`)} count={count('heating', x)} />
                ))}
              </div>
            </Section>
          )}

          {amenitiesHere.length > 0 && (
            <Section title={t('filters.amenities')}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {amenitiesHere.map(({ key, icon: Icon }) => {
                  const on = (f.amenities || []).includes(key);
                  return (
                    <label key={key} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-sm transition-colors ${on ? 'border-pine bg-pine-50' : 'border-line hover:border-line-strong'}`}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleIn('amenities', key)} />
                      <Icon className="w-4 h-4 text-pine shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{t(`amenity.${key}`)}</span>
                      {facets && <span className="text-xs text-muted ltr-nums">{count('amenities', key)}</span>}
                    </label>
                  );
                })}
              </div>
            </Section>
          )}
        </>
      )}
    </Modal>
  );
}
