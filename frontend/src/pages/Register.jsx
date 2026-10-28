// pages/Register.jsx
// Tenants: one short form.
// Owners:  step 1 "Your details"  →  step 2 "Verify identity" (CNIC number, CNIC front,
//          CNIC back and a selfie — taken with the camera or uploaded).
import { useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Home, KeyRound, Phone, Mail, Check, ArrowLeft, ArrowRight, User, MapPin, Lock, IdCard, Info, ShieldCheck } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiError, fieldErrors } from '@/api/client';
import { Field, IconInput, PasswordInput } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import GoogleAuthButton, { GOOGLE_ENABLED } from '@/components/GoogleAuthButton';
import AuthLayout from '@/components/layout/AuthLayout';
import IdentityDocuments from '@/components/verification/IdentityDocuments';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { maskCnicInput, safeNext } from '@/lib/format';
import { appendDocuments, EMPTY_DOCUMENTS, missingDocuments } from '@/lib/verification';
import { cn } from '@/lib/utils';
import { OrDivider } from './Login';
import { SITE_IMAGES } from '@/lib/images';

const STEP_ONE_FIELDS = ['name', 'phone', 'email', 'place', 'password'];

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  return score;
}

/** First screen of sign-up: "How will you use DwellGB?" with two big choices. */
function RoleChooser({ onChoose }) {
  const { t } = useLanguage();
  const options = [
    { value: 'tenant', image: SITE_IMAGES.hero, title: t('auth.tenantCardTitle'), text: t('auth.tenantCardText') },
    { value: 'owner', image: SITE_IMAGES.cta, title: t('auth.ownerCardTitle'), text: t('auth.ownerCardText') },
  ];
  return (
    <div className="grid gap-3.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChoose(o.value)}
          className="group grid grid-cols-[88px_1fr_auto] sm:grid-cols-[112px_1fr_auto] items-center gap-4 sm:gap-5 rounded-[20px] border border-line bg-surface p-2.5 pe-4 sm:pe-5 text-start transition-all hover:border-[#C8923B] hover:shadow-lift focus-visible:border-[#C8923B]"
        >
          <span className="h-20 sm:h-24 rounded-[14px] bg-sunken bg-cover bg-center" style={{ backgroundImage: `url(${o.image})` }} aria-hidden="true" />
          <span>
            <span className="block text-base sm:text-[17px] font-bold text-ink">{o.title}</span>
            <span className="block mt-1 text-sm leading-snug text-muted">{o.text}</span>
          </span>
          <span className="flex w-8 h-8 items-center justify-center rounded-full border border-line text-ink-2 transition-colors group-hover:bg-[#111318] group-hover:border-[#111318] group-hover:text-white">
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </span>
        </button>
      ))}
    </div>
  );
}

/** Shows the chosen role above the form, with a "Change" link. */
function ChosenRole({ role, onChange }) {
  const { t } = useLanguage();
  const Icon = role === 'owner' ? Home : KeyRound;
  return (
    <div className="mb-7 flex items-center justify-between gap-3 rounded-2xl border border-line bg-sunken/60 px-4 py-3">
      <span className="flex items-center gap-2.5 text-sm font-semibold text-ink">
        <Icon className="w-[18px] h-[18px] text-[#B07F2E]" /> {role === 'owner' ? t('auth.ownerCardTitle') : t('auth.tenantCardTitle')}
      </span>
      <button type="button" onClick={onChange} className="text-sm font-semibold text-ink-2 underline underline-offset-4 hover:text-ink">{t('auth.change')}</button>
    </div>
  );
}

/** "1 Your details — 2 Verify identity" progress for owners. */
function Steps({ step, labels }) {
  return (
    <ol className="mb-8 flex items-center gap-3">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className={cn('flex items-center gap-3', i < labels.length - 1 && 'flex-1')}>
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                done && 'bg-[#111318] text-white',
                current && 'bg-[#111318] text-white ring-4 ring-[#C8923B]/25',
                !done && !current && 'bg-sunken text-muted',
              )}
            >
              {done ? <Check className="size-4" /> : n}
            </span>
            <span className={cn('text-sm font-semibold whitespace-nowrap', current ? 'text-ink' : 'text-muted')}>{label}</span>
            {i < labels.length - 1 && <span className={cn('h-px flex-1', done ? 'bg-[#C8923B]' : 'bg-line')} />}
          </li>
        );
      })}
    </ol>
  );
}

function PasswordMeter({ score }) {
  const { t } = useLanguage();
  const colors = ['bg-line', 'bg-danger', 'bg-warning', 'bg-gold', 'bg-success'];
  return (
    <div className="mt-2 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1.5">
        {[1, 2, 3, 4].map((i) => <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= score ? colors[score] : 'bg-line')} />)}
      </div>
      <span className="w-14 text-end text-xs font-medium text-muted">{t(`auth.strength${score || 1}`)}</span>
    </div>
  );
}

export default function Register() {
  const { user, ready, register } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));

  // null until the user picks on the first screen (or ?role=owner / ?role=tenant in the link)
  const [role, setRole] = useState(['owner', 'tenant'].includes(searchParams.get('role')) ? searchParams.get('role') : null);
  const [step, setStep] = useState(1);
  const [contactBy, setContactBy] = useState('phone');
  const [form, setForm] = useState({ name: '', phone: '', email: '', cnic: '', place: '', password: '' });
  const [docs, setDocs] = useState(EMPTY_DOCUMENTS);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useDocumentTitle(t('auth.signupTitle'));
  const pwScore = useMemo(() => passwordStrength(form.password), [form.password]);

  if (ready && user) {
    const home = user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/dashboard' : '/listings';
    return <Navigate to={next || home} replace />;
  }

  const isOwner = role === 'owner';
  const onIdentityStep = isOwner && step === 2;

  // ---------- first screen: choose tenant or owner ----------
  if (!role) {
    return (
      <AuthLayout
        eyebrow={t('auth.eyebrowSignup')}
        title={t('auth.chooseTitle')}
        subtitle={t('auth.chooseSub')}
        footer={
          <>
            {t('auth.haveAccount')}{' '}
            <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-ink hover:underline">{t('auth.loginLink')}</Link>
          </>
        }
      >
        <RoleChooser onChoose={(r) => { setRole(r); setStep(1); setErrors({}); }} />
      </AuthLayout>
    );
  }

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validateDetails() {
    const e = {};
    if (form.name.trim().length < 2) e.name = t('auth.errName');
    if (contactBy === 'phone' && !form.phone.trim()) e.phone = t('auth.errPhone');
    if (contactBy === 'email' && !/\S+@\S+\.\S+/.test(form.email)) e.email = t('auth.errEmail');
    if (isOwner && form.place.trim().length < 2) e.place = t('auth.errPlace');
    if (form.password.length < 8 || !/\d/.test(form.password) || !/[A-Za-z]/.test(form.password)) e.password = t('auth.errPassword');
    return e;
  }

  function validateIdentity() {
    const e = {};
    if (form.cnic.replace(/\D/g, '').length !== 13) e.cnic = t('auth.errCnic');
    for (const kind of missingDocuments(docs)) e[kind] = t('verify.required');
    return e;
  }

  function goToIdentity() {
    const e = validateDetails();
    setErrors(e);
    if (!Object.keys(e).length) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const e = { ...validateDetails(), ...(isOwner ? validateIdentity() : {}) };
    if (!agree) e.agree = t('auth.errAgree');
    setErrors(e);
    if (Object.keys(e).length) {
      if (STEP_ONE_FIELDS.some((f) => e[f])) setStep(1);
      return;
    }

    const fields = {
      role,
      name: form.name.trim(),
      place: form.place.trim(),
      password: form.password,
      ...(contactBy === 'phone' ? { phone: form.phone } : { email: form.email }),
      ...(isOwner ? { cnic: form.cnic } : {}),
    };

    // Owners send a multipart form with their 3 photos; tenants send plain JSON.
    let payload = fields;
    if (isOwner) {
      payload = new FormData();
      for (const [key, value] of Object.entries(fields)) if (value) payload.append(key, value);
      appendDocuments(payload, docs);
    }

    setBusy(true);
    try {
      const u = await register(payload);
      toast.success(t('auth.welcome', { name: u.name.split(' ')[0] }));
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      if (STEP_ONE_FIELDS.some((f) => fe[f])) setStep(1);
      if (!Object.keys(fe).length) setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const agreeBox = (
    <div>
      <label className="flex items-start gap-3 text-sm text-ink-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => { setAgree(e.target.checked); setErrors((x) => ({ ...x, agree: undefined })); }}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-pine)]"
        />
        <span className="leading-relaxed">{t('auth.agree')}</span>
      </label>
      {errors.agree && <p className="mt-1.5 ms-7 text-xs font-medium text-danger">{errors.agree}</p>}
    </div>
  );

  const errorBox = error && (
    <p className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-50 px-4 py-3 text-sm font-medium text-danger" role="alert">
      <Info className="w-4 h-4 mt-0.5 shrink-0" /> {error}
    </p>
  );

  return (
    <AuthLayout
      wide={onIdentityStep}
      eyebrow={t('auth.eyebrowSignup')}
      title={onIdentityStep ? t('auth.identityTitle') : isOwner ? t('auth.ownerFormTitle') : t('auth.tenantFormTitle')}
      subtitle={onIdentityStep ? null : t('auth.signupSubtitle')}
      top={isOwner && <Steps step={step} labels={[t('auth.stepDetails'), t('auth.stepIdentity')]} />}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-ink hover:underline">{t('auth.loginLink')}</Link>
        </>
      }
    >
      {step === 1 && <ChosenRole role={role} onChange={() => { setRole(null); setStep(1); }} />}

      {step === 1 && GOOGLE_ENABLED && (
        <>
          <GoogleAuthButton defaultRole={role} onDone={(u) => toast.success(t('auth.welcome', { name: u.name.split(' ')[0] }))} />
          <OrDivider />
        </>
      )}

      <form onSubmit={submit} className="space-y-5" noValidate>
        {step === 1 && (
          <>
            <Field label={t('auth.fullName')} error={errors.name}>
              <IconInput icon={User} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ali Khan" />
            </Field>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label mb-0">{contactBy === 'phone' ? t('auth.phone') : t('auth.email')}</span>
                <button
                  type="button"
                  onClick={() => { setContactBy(contactBy === 'phone' ? 'email' : 'phone'); setErrors((x) => ({ ...x, phone: undefined, email: undefined })); }}
                  className="text-xs font-semibold text-pine hover:underline"
                >
                  {contactBy === 'phone' ? t('auth.useEmail') : t('auth.usePhone')}
                </button>
              </div>
              {contactBy === 'phone' ? (
                <Field error={errors.phone}>
                  <IconInput icon={Phone} className="ltr-nums" type="tel" inputMode="tel" autoComplete="tel" placeholder="0355 1234567" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </Field>
              ) : (
                <Field error={errors.email}>
                  <IconInput icon={Mail} type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                </Field>
              )}
            </div>

            <Field label={isOwner ? t('auth.place') : t('auth.placeOptional')} error={errors.place}>
              <IconInput icon={MapPin} value={form.place} onChange={(e) => set('place', e.target.value)} placeholder="Jutial, Gilgit" />
            </Field>

            <div>
              <Field label={t('auth.password')} error={errors.password}>
                <PasswordInput icon={Lock} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={t('auth.passwordPlaceholder')} />
              </Field>
              {form.password && <PasswordMeter score={pwScore} />}
            </div>

            {isOwner ? (
              <button type="button" className="btn btn-ink btn-lg w-full" onClick={goToIdentity}>
                {t('auth.continueToIdentity')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            ) : (
              <>
                {agreeBox}
                {errorBox}
                <button type="submit" className="btn btn-ink btn-lg w-full" disabled={busy}>
                  {busy ? <Spinner /> : t('auth.createAccount')}
                </button>
              </>
            )}
          </>
        )}

        {onIdentityStep && (
          <>
            <div className="flex items-start gap-3 rounded-2xl border border-pine/15 bg-pine-50 p-4 text-sm text-ink-2">
              <ShieldCheck className="w-5 h-5 shrink-0 text-pine" />
              <p className="leading-relaxed">{t('auth.identityIntro')}</p>
            </div>

            <div className="max-w-sm">
              <Field label={t('auth.cnic')} error={errors.cnic} hint={t('auth.cnicHint')}>
                <IconInput icon={IdCard} className="ltr-nums" inputMode="numeric" placeholder="71501-1234567-1" value={form.cnic} onChange={(e) => set('cnic', maskCnicInput(e.target.value))} />
              </Field>
            </div>

            <IdentityDocuments
              docs={docs}
              onChange={(d) => { setDocs(d); setErrors((x) => ({ ...x, cnicFront: undefined, cnicBack: undefined, selfie: undefined })); }}
              errors={errors}
            />

            {agreeBox}
            {errorBox}

            <div className="flex flex-col-reverse gap-3 sm:flex-row pt-2">
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('common.back')}
              </button>
              <button type="submit" className="btn btn-ink btn-lg flex-1" disabled={busy}>
                {busy ? <Spinner /> : t('auth.createAccount')}
              </button>
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
