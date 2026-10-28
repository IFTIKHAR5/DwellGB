// components/verification/VerificationReview.jsx — admin view of one owner's CNIC + selfie,
// with Approve / Reject. Used on the Verifications page and in the user details window.
import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X } from '@/components/icons';
import api, { apiError } from '@/api/client';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import ReasonModal from '@/components/admin/ReasonModal';
import DocumentImage from './DocumentImage';
import { DOCUMENT_KINDS } from '@/lib/verification';

export default function VerificationReview({ user, onReviewed }) {
  const { t } = useLanguage();
  const [zoom, setZoom] = useState(null); // { url, title }
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = user.verification?.status;
  const hasDocuments = ['pending', 'approved', 'rejected'].includes(status);

  async function review(action, reason) {
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/users/${user.id}/verification`, { action, reason });
      toast.success(action === 'approve' ? t('admin.done.verifyApproved') : t('admin.done.verifyRejected'));
      setRejecting(false);
      onReviewed?.(data);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!hasDocuments) return <p className="text-sm text-muted-foreground">{t('admin.noDocuments')}</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {DOCUMENT_KINDS.map((kind) => (
          <figure key={kind}>
            <DocumentImage
              userId={user.id}
              kind={kind}
              alt={t(`verify.${kind}`)}
              className="aspect-[4/3] w-full"
              onOpen={(url) => setZoom({ url, title: t(`verify.${kind}`) })}
            />
            <figcaption className="mt-1.5 text-xs font-medium text-muted-foreground">{t(`verify.${kind}`)}</figcaption>
          </figure>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {status !== 'approved' && (
          <Button onClick={() => review('approve')} disabled={busy}><Check /> {t('admin.approveIdentity')}</Button>
        )}
        <Button variant="outline" className="text-destructive" onClick={() => setRejecting(true)} disabled={busy}>
          <X /> {status === 'approved' ? t('admin.revokeIdentity') : t('admin.rejectIdentity')}
        </Button>
      </div>

      <Dialog open={!!zoom} onOpenChange={(open) => !open && setZoom(null)}>
        <DialogContent className="sm:max-w-4xl p-3">
          <DialogTitle className="px-2 pt-1">{zoom?.title}</DialogTitle>
          {zoom && <img src={zoom.url} alt={zoom.title} className="max-h-[78dvh] w-full rounded-xl object-contain bg-black" />}
        </DialogContent>
      </Dialog>

      <ReasonModal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title={t('admin.rejectTitle', { name: user.name })}
        text={t('admin.rejectText')}
        label={t('admin.reason')}
        placeholder={t('admin.rejectPlaceholder')}
        confirmLabel={t('admin.rejectIdentity')}
        danger
        requireReason
        onConfirm={(reason) => review('reject', reason)}
      />
    </div>
  );
}
