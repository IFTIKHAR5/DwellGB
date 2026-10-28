// components/GoogleAuthButton.jsx — "Continue with Google" + first-time onboarding
// New Google users choose owner/tenant and fill in their details. Owners then
// upload their CNIC photos + selfie on /verify-identity (the app sends them there).
import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { Home, KeyRound } from '@/components/icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiError, fieldErrors } from '../api/client';
import { maskCnicInput } from '../lib/format';
import Modal from './ui/Modal';
import Avatar from './ui/Avatar';
import { Field } from './ui/Field';
import { Spinner } from './ui/Spinner';

const HAS_CLIENT_ID = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
// In development we always show the Google area, so a setup problem is visible instead of silently hidden.
export const GOOGLE_ENABLED = HAS_CLIENT_ID || import.meta.env.DEV;

/** Shown (in development only) when the Google button can't appear, with the fix. */
function GoogleSetupHint({ reason }) {
  return (
    <div className="rounded-2xl border border-dashed border-warning/50 bg-warning-50 p-4 text-sm text-ink-2">
      <p className="font-semibold text-ink">"Continue with Google" is not showing</p>
      {reason === 'no-client-id' ? (
        <p className="mt-1">Add <code>VITE_GOOGLE_CLIENT_ID=…apps.googleusercontent.com</code> to <code>frontend/.env</code> (and the same value as <code>GOOGLE_CLIENT_ID</code> in <code>backend/.env</code>), then stop and restart <code>npm run dev</code>.</p>
      ) : (
        <p className="mt-1">Google refused to load the button. In Google Cloud → Credentials → your OAuth client, add <code>{window.location.origin}</code> to <b>Authorized JavaScript origins</b>, wait a few minutes, then reload. Also check that you are online.</p>
      )}
      <p className="mt-1 text-xs text-muted">This hint only appears while developing.</p>
    </div>
  );
}

export default function GoogleAuthButton({ defaultRole, onDone }) {
  const { googleLogin } = useAuth();
  const { t, lang } = useLanguage();
  const boxRef = useRef(null);
  const [width, setWidth] = useState(320);
  const [pending, setPending] = useState(null); // { credential, profile }
  const [role, setRole] = useState(defaultRole || 'tenant');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [place, setPlace] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!boxRef.current) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, Math.min(400, Math.floor(e.contentRect.width)))));
    ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { if (defaultRole) setRole(defaultRole); }, [defaultRole]);

  // Google draws its button in an iframe. If none appeared after a few seconds,
  // the client ID / allowed origin is wrong or Google couldn't be reached.
  useEffect(() => {
    if (!HAS_CLIENT_ID) return undefined;
    const timer = setTimeout(() => {
      if (!boxRef.current?.querySelector('iframe')) setLoadFailed(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!GOOGLE_ENABLED) return null;
  if (!HAS_CLIENT_ID) return <GoogleSetupHint reason="no-client-id" />;

  async function handleCredential(credential) {
    try {
      const res = await googleLogin({ credential });
      if (res.needsProfile) setPending({ credential, profile: res.profile });
      else onDone?.(res.user);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function finish(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await googleLogin({
        credential: pending.credential,
        role,
        cnic: role === 'owner' ? cnic : undefined,
        phone: phone || undefined,
        place: place.trim() || undefined,
      });
      setPending(null);
      toast.success(t('auth.welcome', { name: res.user.name.split(' ')[0] }));
      onDone?.(res.user);
    } catch (err) {
      setErrors(fieldErrors(err));
      if (!Object.keys(fieldErrors(err)).length) toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {loadFailed && import.meta.env.DEV && <GoogleSetupHint reason="blocked" />}
      <div ref={boxRef} className="w-full flex justify-center min-h-[44px]">
        <GoogleLogin
          onSuccess={(r) => r.credential && handleCredential(r.credential)}
          onError={() => toast.error(t('auth.googleFailed'))}
          text="continue_with"
          shape="pill"
          size="large"
          theme="outline"
          width={String(width)}
          locale={lang === 'ur' ? 'ur' : 'en'}
        />
      </div>

      <Modal open={!!pending} onClose={() => !busy && setPending(null)} title={t('auth.finishTitle')}>
        {pending && (
          <form onSubmit={finish} className="space-y-5">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-sunken">
              <Avatar name={pending.profile.name} src={pending.profile.avatar} />
              <div className="min-w-0">
                <p className="font-semibold truncate">{pending.profile.name}</p>
                <p className="text-sm text-muted truncate">{pending.profile.email}</p>
              </div>
            </div>
            <div>
              <p className="label">{t('auth.iAm')}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: 'tenant', icon: KeyRound, title: t('role.tenant'), sub: t('auth.tenantSub') },
                  { v: 'owner', icon: Home, title: t('role.owner'), sub: t('auth.ownerSub') },
                ].map((o) => (
                  <button
                    type="button"
                    key={o.v}
                    onClick={() => setRole(o.v)}
                    className={`text-start p-4 rounded-2xl border-2 transition-all ${role === o.v ? 'border-pine bg-pine-50' : 'border-line hover:border-line-strong'}`}
                  >
                    <o.icon className={`w-5 h-5 mb-2 ${role === o.v ? 'text-pine' : 'text-muted'}`} />
                    <p className="font-semibold text-sm">{o.title}</p>
                    <p className="text-xs text-muted mt-0.5">{o.sub}</p>
                  </button>
                ))}
              </div>
            </div>
            {role === 'owner' && (
              <Field label={t('auth.cnic')} required error={errors.cnic} hint={t('auth.cnicHint')}>
                <input className="input ltr-nums" inputMode="numeric" placeholder="71501-1234567-1" value={cnic} onChange={(e) => setCnic(maskCnicInput(e.target.value))} />
              </Field>
            )}
            <Field label={t('auth.place')} required={role === 'owner'} error={errors.place}>
              <input className="input" placeholder="Jutial, Gilgit" value={place} onChange={(e) => setPlace(e.target.value)} />
            </Field>
            <Field label={t('auth.phoneOptional')} error={errors.phone}>
              <input className="input ltr-nums" inputMode="tel" placeholder="0355 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <button className="btn btn-primary w-full btn-lg" disabled={busy}>
              {busy ? <Spinner /> : t('auth.createAccount')}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
