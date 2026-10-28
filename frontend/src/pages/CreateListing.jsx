// pages/CreateListing.jsx — create or edit a listing in 4 guided steps.
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Info } from '@/components/icons';
import api, { apiError, fieldErrors } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import {
  DISTRICTS, DISTRICT_CENTERS, PROPERTY_TYPES, FURNISHING, TENANT_PREFERENCES, WATER_SUPPLY, HEATING, AMENITIES, LEASE_OPTIONS,
} from '../lib/constants';
import { formatRent } from '../lib/format';
import { Field, Counter, Segmented } from '../components/ui/Field';
import { PageLoader, Spinner } from '../components/ui/Spinner';
import ImageUploader from '../components/ImageUploader';
import useDocumentTitle from '../hooks/useDocumentTitle';

const LocationPicker = lazy(() => import('../components/map/LocationPicker'));

const EMPTY = {
  title: '', description: '', district: 'Gilgit', area: '', address: '', location: null,
  propertyType: 'full_house', rent: '', deposit: '', utilitiesIncluded: false,
  bedrooms: 2, bathrooms: 1, kitchens: 1, floorAreaSqft: '',
  furnishing: 'unfurnished', tenantPreference: 'any', waterSupply: '24_7', heating: 'gas_heater', amenities: [],
  availableFrom: '', minStayMonths: 6,
};

const STEP_FIELDS = [
  ['title', 'propertyType', 'description'],
  ['district', 'area', 'lat', 'lng', 'address'],
  ['bedrooms', 'bathrooms', 'kitchens', 'furnishing', 'heating', 'waterSupply', 'tenantPreference', 'amenities', 'floorAreaSqft'],
  ['rent', 'deposit', 'availableFrom', 'minStayMonths', 'images'],
];

export default function CreateListing() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState([]); // [{ key, url, file?, id? }]
  const [originalImageIds, setOriginalImageIds] = useState([]);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  useDocumentTitle(isEdit ? t('form.editTitle') : t('form.newTitle'));

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/listings/${id}`)
      .then(({ data }) => {
        if (!data.isOwner) {
          toast.error(t('form.notYours'));
          return navigate('/dashboard/listings');
        }
        setForm({
          ...EMPTY,
          ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, data[k] ?? EMPTY[k]])),
          location: data.location ? { lat: data.location.lat, lng: data.location.lng } : null,
          availableFrom: data.availableFrom ? data.availableFrom.slice(0, 10) : '',
          floorAreaSqft: data.floorAreaSqft || '',
          deposit: data.deposit || '',
          // The shortest minimum stay is 1 month (monthly rentals only).
          minStayMonths: Math.max(LEASE_OPTIONS[0], data.minStayMonths || 6),
        });
        const imgs = data.images.map((i) => ({ key: i.id, id: i.id, url: i.url }));
        setImages(imgs);
        setOriginalImageIds(imgs.map((i) => i.id));
      })
      .catch((err) => toast.error(apiError(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate, t]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const steps = [t('form.step1'), t('form.step2'), t('form.step3'), t('form.step4')];

  function validateStep(s) {
    const e = {};
    if (s === 0) {
      if (form.title.trim().length < 5) e.title = t('form.errTitle');
    }
    if (s === 1) {
      if (form.area.trim().length < 2) e.area = t('form.errArea');
      if (!form.location) e.lat = t('form.errLocation');
    }
    if (s === 3) {
      if (!form.rent || Number(form.rent) < 500) e.rent = t('form.errRent');
      if (!images.length) e.images = t('form.errImages');
    }
    setErrors(e);
    return !Object.keys(e).length;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(e) {
    e.preventDefault();
    // Pressing Enter in a field on steps 1–3 means "Continue", not "Publish".
    if (step < 3) return next();
    if (saving) return;
    for (let s = 0; s < 4; s++) {
      if (!validateStep(s)) return setStep(s);
    }
    setSaving(true);
    const fd = new FormData();
    const skip = new Set(['location', 'amenities']);
    for (const [k, v] of Object.entries(form)) {
      if (skip.has(k) || v === '' || v === null || v === undefined) continue;
      fd.append(k, String(v));
    }
    fd.append('amenities', JSON.stringify(form.amenities));
    if (form.location) {
      fd.append('lat', String(form.location.lat));
      fd.append('lng', String(form.location.lng));
    }
    for (const img of images) if (img.file) fd.append('images', img.file);
    if (isEdit) {
      const kept = new Set(images.filter((i) => i.id).map((i) => i.id));
      fd.append('removeImages', JSON.stringify(originalImageIds.filter((x) => !kept.has(x))));
      // Order: existing images keep their position; new ones are appended server-side.
      fd.append('imageOrder', JSON.stringify(images.filter((i) => i.id).map((i) => i.id)));
    }
    try {
      const { data } = isEdit ? await api.put(`/listings/${id}`, fd) : await api.post('/listings', fd);
      toast.success(isEdit ? t('form.updated') : t('form.published'));
      navigate(`/listings/${data.id}`);
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      const firstStep = STEP_FIELDS.findIndex((fields) => fields.some((f) => fe[f]));
      if (firstStep >= 0) setStep(firstStep);
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  const focus = useMemo(() => DISTRICT_CENTERS[form.district], [form.district]);
  if (loading) return <PageLoader />;

  const opts = (list, prefix) => list.map((v) => ({ value: v, label: t(`${prefix}.${v}`) }));

  return (
    <div className="container-page max-w-3xl py-8 md:py-12">
      <Link to="/dashboard/listings" className="btn btn-ghost btn-sm -ms-3"><ChevronLeft className="w-4 h-4 rtl:rotate-180" /> {t('nav.myListings')}</Link>
      <h1 className="text-3xl md:text-4xl font-extrabold mt-3">{isEdit ? t('form.editTitle') : t('form.newTitle')}</h1>
      <p className="text-ink-2 mt-2">{t('form.subtitle')}</p>

      {/* stepper */}
      <ol className="mt-8 grid grid-cols-4 gap-2">
        {steps.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => (i < step || isEdit ? setStep(i) : null)} className="w-full text-start group">
              <span className={`block h-1.5 rounded-full transition-colors ${i <= step ? 'bg-linear-to-r from-brand to-rose' : 'bg-line'}`} />
              <span className={`mt-2 flex items-center gap-1.5 text-xs sm:text-sm font-semibold ${i === step ? 'text-ink' : 'text-muted'}`}>
                {i < step ? <Check className="w-4 h-4 text-pine" /> : <span className="ltr-nums">{i + 1}.</span>}
                {/* Phones: only the current step shows its name, so it fits without being cut off. */}
                <span className={`truncate ${i === step ? '' : 'hidden sm:inline'}`}>{s}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="mt-8 card p-6 md:p-8 space-y-6" noValidate>
        {step === 0 && (
          <>
            <Field label={t('form.title')} required error={errors.title} hint={t('form.titleHint')}>
              <input className="input" maxLength={100} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={t('form.titlePlaceholder')} />
            </Field>
            <div>
              <p className="label">{t('filters.type')} <span className="text-brand">*</span></p>
              <Segmented options={opts(PROPERTY_TYPES, 'type')} value={form.propertyType} onChange={(v) => set('propertyType', v)} />
            </div>
            <Field label={t('form.description')} error={errors.description} hint={`${form.description.length}/3000 · ${t('form.descHint')}`}>
              <textarea className="input" rows={7} maxLength={3000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={t('form.descPlaceholder')} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('filters.district')} required error={errors.district}>
                <select className="input" value={form.district} onChange={(e) => set('district', e.target.value)}>
                  {DISTRICTS.map((d) => <option key={d} value={d}>{t(`district.${d}`)}</option>)}
                </select>
              </Field>
              <Field label={t('form.area')} required error={errors.area} hint={t('form.areaHint')}>
                <input className="input" maxLength={80} value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="Jutial" />
              </Field>
            </div>
            <div>
              <p className="label">{t('form.pin')} <span className="text-brand">*</span></p>
              <Suspense fallback={<div className="h-96 skeleton rounded-2xl" />}>
                <LocationPicker
                  value={form.location}
                  onChange={(loc) => { set('location', loc); setErrors((e) => ({ ...e, lat: undefined })); }}
                  onPlace={(p) => { if (!form.area && p.locality) set('area', p.locality); }}
                  focus={focus}
                  t={t}
                />
              </Suspense>
              {errors.lat && <p className="mt-2 text-sm text-danger font-medium">{errors.lat}</p>}
              <p className="mt-3 text-xs text-ink-2 flex gap-2 bg-pine-50 rounded-xl p-3"><Info className="w-4 h-4 shrink-0 text-pine" /> {t('form.privacyNote')}</p>
            </div>
            <Field label={t('form.address')} hint={t('form.addressHint')} error={errors.address}>
              <input className="input" maxLength={200} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder={t('form.addressPlaceholder')} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              {['bedrooms', 'bathrooms', 'kitchens'].map((k) => (
                <div key={k} className="p-4 rounded-2xl border border-line flex sm:flex-col items-center sm:items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-ink-2">{t(`listing.${k}`)}</span>
                  <Counter value={form[k]} onChange={(v) => set(k, v)} min={0} max={k === 'kitchens' ? 10 : 30} />
                </div>
              ))}
            </div>
            <div><p className="label">{t('filters.furnishing')}</p><Segmented options={opts(FURNISHING, 'furnishing')} value={form.furnishing} onChange={(v) => set('furnishing', v)} /></div>
            <div><p className="label">{t('filters.heating')}</p><Segmented options={opts(HEATING, 'heating')} value={form.heating} onChange={(v) => set('heating', v)} /></div>
            <div><p className="label">{t('listing.water')}</p><Segmented options={opts(WATER_SUPPLY, 'water')} value={form.waterSupply} onChange={(v) => set('waterSupply', v)} /></div>
            <div><p className="label">{t('form.rentTo')}</p><Segmented options={opts(TENANT_PREFERENCES, 'tenant')} value={form.tenantPreference} onChange={(v) => set('tenantPreference', v)} /></div>
            <div>
              <p className="label">{t('filters.amenities')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITIES.map(({ key, icon: Icon }) => {
                  const on = form.amenities.includes(key);
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => set('amenities', on ? form.amenities.filter((a) => a !== key) : [...form.amenities, key])}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm text-start transition-colors ${on ? 'border-pine bg-pine-50 text-ink' : 'border-line text-ink-2 hover:border-line-strong'}`}
                      aria-pressed={on}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-pine' : ''}`} /> {t(`amenity.${key}`)}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label={t('form.floorArea')} error={errors.floorAreaSqft}>
              <input className="input ltr-nums" type="number" min="0" inputMode="numeric" value={form.floorAreaSqft} onChange={(e) => set('floorAreaSqft', e.target.value)} placeholder="1200" />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('form.rent')} required error={errors.rent} hint={form.rent ? formatRent(form.rent) + ' / ' + t('listing.month') : ''}>
                <input className="input ltr-nums" type="number" min="500" inputMode="numeric" value={form.rent} onChange={(e) => set('rent', e.target.value)} placeholder="25000" />
              </Field>
              <Field label={t('form.deposit')} error={errors.deposit} hint={t('form.depositHint')}>
                <input className="input ltr-nums" type="number" min="0" inputMode="numeric" value={form.deposit} onChange={(e) => set('deposit', e.target.value)} placeholder="50000" />
              </Field>
              <Field label={t('detail.availableFrom')} error={errors.availableFrom}>
                <input className="input" type="date" value={form.availableFrom} onChange={(e) => set('availableFrom', e.target.value)} />
              </Field>
              <Field label={t('form.minStay')} error={errors.minStayMonths}>
                <select className="input" value={form.minStayMonths} onChange={(e) => set('minStayMonths', Number(e.target.value))}>
                  {LEASE_OPTIONS.map((m) => <option key={m} value={m}>{t('detail.months', { n: m })}</option>)}
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-[var(--color-pine)]" checked={form.utilitiesIncluded} onChange={(e) => set('utilitiesIncluded', e.target.checked)} />
              <span className="text-ink-2">{t('form.utilitiesIncluded')}</span>
            </label>
            <div>
              <p className="label">{t('form.photos')} <span className="text-brand">*</span></p>
              <ImageUploader items={images} onChange={(v) => { setImages(v); setErrors((e) => ({ ...e, images: undefined })); }} error={errors.images} />
            </div>
          </>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-line">
          <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" /> {t('common.back')}
          </button>
          {step < 3 ? (
            // `key`s keep Continue and Publish as two separate buttons. With one shared
            // button, React turned it into "submit" during the click on step 3, so the
            // form was submitted the moment the last step opened (and showed errors).
            <button key="continue" type="button" className="btn btn-dark" onClick={next}>
              {t('common.continue')} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          ) : (
            <button key="publish" type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Spinner /> : isEdit ? t('form.saveChanges') : t('form.publish')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
