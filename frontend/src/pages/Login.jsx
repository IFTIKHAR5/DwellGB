// pages/Login.jsx
import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { User, Lock, Info, ArrowRight } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiError } from '@/api/client';
import { Field, IconInput, PasswordInput } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import GoogleAuthButton, { GOOGLE_ENABLED } from '@/components/GoogleAuthButton';
import AuthLayout from '@/components/layout/AuthLayout';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { safeNext } from '@/lib/format';

export function OrDivider() {
  const { t } = useLanguage();
  return (
    <div className="my-6 flex items-center gap-4 text-xs font-medium text-muted">
      <span className="h-px flex-1 bg-line" /> {t('auth.orWithEmail')} <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export default function Login() {
  const { user, login, ready } = useAuth();
  const { t } = useLanguage();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useDocumentTitle(t('auth.loginTitle'));

  // Already logged in (form, Google or an existing session) → go where the user was headed.
  if (ready && user) {
    const home = user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/dashboard' : '/listings';
    return <Navigate to={next || home} replace />;
  }

  const done = (u) => toast.success(t('auth.welcomeBack', { name: u.name.split(' ')[0] }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      done(await login(identifier.trim(), password));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow={t('auth.loginTitle')}
      title={t('auth.loginHeading')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-ink hover:underline">
            {t('auth.signupLink')}
          </Link>
        </>
      }
    >
      {GOOGLE_ENABLED && (
        <>
          <GoogleAuthButton onDone={done} />
          <OrDivider />
        </>
      )}

      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label={t('auth.emailOrPhone')}>
          <IconInput icon={User} autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="0355 1234567 or you@email.com" />
        </Field>
        <Field label={t('auth.password')}>
          <PasswordInput icon={Lock} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>

        {error && (
          <p className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-50 px-4 py-3 text-sm font-medium text-danger" role="alert">
            <Info className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </p>
        )}

        <button className="btn btn-ink btn-lg w-full" disabled={busy || !identifier || !password}>
          {busy ? <Spinner /> : <>{t('auth.login')} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></>}
        </button>
      </form>
    </AuthLayout>
  );
}
