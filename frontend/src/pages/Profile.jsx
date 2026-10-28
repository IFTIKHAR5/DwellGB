// pages/Profile.jsx — account settings: profile, security, preferences.
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, ShieldCheck, User, Lock, Globe, BadgeCheck } from '@/components/icons';
import api, { apiError, fieldErrors } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate, localPhone } from '../lib/format';
import Avatar from '../components/ui/Avatar';
import { Field, PasswordInput } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';
import useDocumentTitle from '../hooks/useDocumentTitle';

function ProfileTab() {
  const { user, updateUser } = useAuth();
  const { t, lang } = useLanguage();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    name: user.name || '', fatherName: user.fatherName || '', place: user.place || '', bio: user.bio || '',
    phone: user.phone ? localPhone(user.phone) : '', email: user.email || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', {
        name: form.name, fatherName: form.fatherName, place: form.place, bio: form.bio,
        phone: form.phone || undefined, email: form.email || undefined,
      });
      updateUser(data);
      toast.success(t('settings.saved'));
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast.error(t('settings.avatarTooBig'));
    const fd = new FormData();
    fd.append('avatar', file);
    setUploading(true);
    try {
      const { data } = await api.post('/auth/me/avatar', fd);
      updateUser(data);
      toast.success(t('settings.avatarUpdated'));
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar name={user.name} src={user.avatar} size="xl" />
          <button type="button" onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -end-1 w-9 h-9 rounded-full bg-pine text-white flex items-center justify-center shadow-card hover:bg-pine-600" aria-label={t('settings.changePhoto')}>
            {uploading ? <Spinner className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { uploadAvatar(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <div>
          <p className="text-xl font-bold flex items-center gap-1.5">{user.name} {user.isVerified && <BadgeCheck className="w-5 h-5 text-pine" />}</p>
          <p className="text-sm text-muted">{t(`role.${user.role}`)} · {t('detail.memberSince', { date: formatDate(user.createdAt, lang, { month: 'long', year: 'numeric' }) })}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('auth.fullName')} error={errors.name}><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label={t('auth.fatherName')} error={errors.fatherName}><input className="input" value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} /></Field>
        <Field label={t('auth.phone')} error={errors.phone} hint={t('settings.phoneHint')}><input className="input ltr-nums" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0355 1234567" /></Field>
        <Field label={t('auth.email')} error={errors.email}><input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label={t('auth.place')} error={errors.place} className="sm:col-span-2"><input className="input" value={form.place} onChange={(e) => set('place', e.target.value)} placeholder="Jutial, Gilgit" /></Field>
        <Field label={t('settings.bio')} error={errors.bio} hint={`${form.bio.length}/500`} className="sm:col-span-2">
          <textarea className="input" rows={3} maxLength={500} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder={t('settings.bioPlaceholder')} />
        </Field>
      </div>

      {user.role === 'owner' && (
        <div className="rounded-2xl bg-sunken p-4 flex gap-3 text-sm">
          <ShieldCheck className="w-5 h-5 text-pine shrink-0" />
          <div>
            <p className="font-semibold">{t('auth.cnic')}: <span className="ltr-nums">{user.cnicMasked || '—'}</span></p>
            <p className="text-ink-2 mt-0.5">{t('settings.cnicNote')}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : t('settings.save')}</button>
      </div>
    </form>
  );
}

function SecurityTab() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const hasPassword = user.authProviders?.includes('password');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function change(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api.put('/auth/me/password', { currentPassword: current || undefined, newPassword: next });
      const me = await api.get('/auth/me'); // refresh "sign-in methods"
      updateUser(me.data);
      setCurrent('');
      setNext('');
      toast.success(t('settings.passwordChanged'));
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <form onSubmit={change} className="space-y-4 max-w-md">
        <h3 className="text-lg font-bold">{hasPassword ? t('settings.changePassword') : t('settings.setPassword')}</h3>
        {!hasPassword && <p className="text-sm text-ink-2">{t('settings.setPasswordHint')}</p>}
        {hasPassword && (
          <Field label={t('settings.currentPassword')} error={errors.currentPassword}>
            <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
        )}
        <Field label={t('settings.newPassword')} error={errors.newPassword} hint={t('auth.passwordHint')}>
          <PasswordInput autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <button className="btn btn-dark" disabled={busy || !next}>{busy ? <Spinner /> : t('settings.updatePassword')}</button>
      </form>

      <div className="pt-8 border-t border-line text-sm text-ink-2">
        <p><span className="font-semibold text-ink">{t('settings.signInMethods')}:</span> {(user.authProviders || []).map((p) => (p === 'google' ? 'Google' : t('auth.password'))).join(', ')}</p>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const { t, lang, setLang } = useLanguage();
  return (
    <div className="space-y-4 max-w-md">
      <h3 className="text-lg font-bold">{t('settings.language')}</h3>
      <div className="grid grid-cols-2 gap-3">
        {[{ v: 'en', l: 'English' }, { v: 'ur', l: 'اردو' }].map((o) => (
          <button key={o.v} onClick={() => setLang(o.v)} className={`p-4 rounded-2xl border-2 font-semibold ${lang === o.v ? 'border-pine bg-pine-50' : 'border-line'}`}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

export default function Profile() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('profile');
  useDocumentTitle(t('nav.settings'));
  const tabs = [
    { k: 'profile', icon: User, l: t('settings.profile') },
    { k: 'security', icon: Lock, l: t('settings.security') },
    { k: 'prefs', icon: Globe, l: t('settings.preferences') },
  ];
  return (
    <div>
      <h1 className="text-3xl font-extrabold">{t('nav.settings')}</h1>
      <div className="mt-6 flex gap-1 border-b border-line overflow-x-auto no-scrollbar">
        {tabs.map((x) => (
          <button key={x.k} onClick={() => setTab(x.k)} className={`shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === x.k ? 'border-pine text-pine' : 'border-transparent text-ink-2 hover:text-ink'}`}>
            <x.icon className="w-4 h-4" /> {x.l}
          </button>
        ))}
      </div>
      <div className="mt-8 card p-6 md:p-8">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'prefs' && <PreferencesTab />}
      </div>
    </div>
  );
}
