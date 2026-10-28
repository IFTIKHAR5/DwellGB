// components/admin/ReasonModal.jsx — confirm a moderation action with an optional/required reason.
import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Modal from '../ui/Modal';
import { Field } from '../ui/Field';
import { Spinner } from '../ui/Spinner';

export default function ReasonModal({ open, onClose, onConfirm, title, text, label, placeholder, confirmLabel, danger = false, requireReason = false, children }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setReason(''); }, [open]);

  async function go() {
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-dark'}`} onClick={go} disabled={busy || (requireReason && reason.trim().length < 3)}>
            {busy ? <Spinner /> : confirmLabel}
          </button>
        </>
      }
    >
      {text && <p className="text-sm text-ink-2">{text}</p>}
      {children}
      {label && (
        <Field label={label} className="mt-4" hint={requireReason ? t('admin.reasonRequired') : undefined}>
          <textarea className="input" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} />
        </Field>
      )}
    </Modal>
  );
}
