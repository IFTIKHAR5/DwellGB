// components/ReportModal.jsx — "Report this listing / user" dialog.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Flag } from '@/components/icons';
import api, { apiError, fieldErrors } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Modal from './ui/Modal';
import { Field } from './ui/Field';
import { Spinner } from './ui/Spinner';

const REASONS = {
  listing: ['scam', 'fake_listing', 'wrong_info', 'already_rented', 'inappropriate', 'spam', 'other'],
  user: ['scam', 'harassment', 'inappropriate', 'spam', 'other'],
};

export default function ReportButton({ targetType, targetId, className = 'btn btn-ghost btn-sm text-muted' }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function start() {
    if (!user) return navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (!reason) return setErrors({ reason: t('report.pickReason') });
    setBusy(true);
    setErrors({});
    try {
      await api.post('/reports', { targetType, targetId, reason, details: details || undefined });
      toast.success(t('report.thanks'));
      setOpen(false);
      setReason('');
      setDetails('');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={start} className={className}>
        <Flag className="w-4 h-4" /> {targetType === 'listing' ? t('report.listing') : t('report.user')}
      </button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title={targetType === 'listing' ? t('report.listingTitle') : t('report.userTitle')}>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-ink-2">{t('report.subtitle')}</p>
          <fieldset className="space-y-2" aria-label={t('report.reason')}>
            {REASONS[targetType].map((r) => (
              <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm ${reason === r ? 'border-pine bg-pine-50' : 'border-line hover:border-line-strong'}`}>
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => { setReason(r); setErrors({}); }} className="accent-[var(--color-pine)]" />
                {t(`reason.${r}`)}
              </label>
            ))}
          </fieldset>
          {errors.reason && <p className="text-sm text-danger font-medium">{errors.reason}</p>}
          <Field label={t('report.details')} error={errors.details} hint={reason === 'other' ? t('report.detailsRequired') : t('report.detailsHint')}>
            <textarea className="input" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
          </Field>
          <button className="btn btn-danger w-full" disabled={busy}>{busy ? <Spinner /> : t('report.submit')}</button>
        </form>
      </Modal>
    </>
  );
}
