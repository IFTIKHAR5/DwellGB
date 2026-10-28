// pages/admin/AdminBroadcast.jsx — send an announcement to all users, owners or tenants.
import { useState } from 'react';
import { toast } from 'sonner';
import { Megaphone, Info } from '@/components/icons';
import api, { apiError, fieldErrors } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { Field, Segmented } from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function AdminBroadcast() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ title: '', body: '', link: '', audience: 'all' });
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(t('admin.broadcast'));
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  function review(e) {
    e.preventDefault();
    if (form.title.trim().length < 3) return setErrors({ title: t('admin.errTitle') });
    setConfirming(true);
  }

  async function send() {
    setBusy(true);
    try {
      const { data } = await api.post('/admin/broadcast', { ...form, link: form.link || undefined, body: form.body || undefined });
      toast.success(t('admin.done.broadcast', { n: data.recipients }));
      setForm({ title: '', body: '', link: '', audience: form.audience });
      setConfirming(false);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(apiError(err));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-extrabold">{t('admin.broadcast')}</h1>
      <p className="text-ink-2 mt-1">{t('admin.broadcastSub')}</p>

      <form onSubmit={review} className="mt-8 card p-6 space-y-5">
        <div>
          <p className="label">{t('admin.audience')}</p>
          <Segmented
            options={[{ value: 'all', label: t('admin.aud.all') }, { value: 'owners', label: t('admin.aud.owners') }, { value: 'tenants', label: t('admin.aud.tenants') }]}
            value={form.audience}
            onChange={(v) => set('audience', v)}
          />
        </div>
        <Field label={t('admin.msgTitle')} required error={errors.title}>
          <input className="input" maxLength={140} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={t('admin.msgTitlePlaceholder')} />
        </Field>
        <Field label={t('admin.msgBody')} error={errors.body} hint={`${form.body.length}/400`}>
          <textarea className="input" rows={4} maxLength={400} value={form.body} onChange={(e) => set('body', e.target.value)} />
        </Field>
        <Field label={t('admin.msgLink')} error={errors.link} hint={t('admin.msgLinkHint')}>
          <input className="input" value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="/listings?district=Hunza" />
        </Field>

        <div className="rounded-2xl bg-sunken p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">{t('admin.preview')}</p>
          <div className="flex gap-3 bg-surface rounded-xl p-3 shadow-card">
            <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand flex items-center justify-center shrink-0"><Megaphone className="w-5 h-5" /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{form.title || t('admin.msgTitlePlaceholder')}</p>
              {form.body && <p className="text-sm text-muted mt-0.5 whitespace-pre-line">{form.body}</p>}
            </div>
          </div>
        </div>

        <p className="text-xs text-ink-2 flex gap-2"><Info className="w-4 h-4 shrink-0 text-pine" /> {t('admin.broadcastNote')}</p>
        <button className="btn btn-primary"><Megaphone className="w-4 h-4" /> {t('admin.reviewSend')}</button>
      </form>

      <Modal
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title={t('admin.confirmBroadcast')}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={send} disabled={busy}>{busy ? <Spinner /> : t('admin.send')}</button>
          </>
        }
      >
        <p className="text-ink-2">{t('admin.confirmBroadcastText', { aud: t(`admin.aud.${form.audience}`) })}</p>
      </Modal>
    </div>
  );
}
