// components/verification/VerificationStatus.jsx — tells an owner where their identity check stands.
import { Link } from 'react-router-dom';
import { Clock, ShieldCheck, ShieldAlert, ShieldQuestion } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';

export default function VerificationStatus({ verification, showAction = true, className }) {
  const { t } = useLanguage();
  if (!verification) return null;
  const { status, rejectionReason } = verification;

  if (status === 'approved') {
    return (
      <Alert variant="success" className={className}>
        <ShieldCheck />
        <AlertTitle>{t('verify.approvedTitle')}</AlertTitle>
        <AlertDescription>{t('verify.approvedText')}</AlertDescription>
      </Alert>
    );
  }
  if (status === 'pending') {
    return (
      <Alert variant="warning" className={className}>
        <Clock />
        <AlertTitle>{t('verify.pendingTitle')}</AlertTitle>
        <AlertDescription>{t('verify.pendingText')}</AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="destructive" className={className}>
      {status === 'rejected' ? <ShieldAlert /> : <ShieldQuestion />}
      <AlertTitle>{status === 'rejected' ? t('verify.rejectedTitle') : t('verify.missingTitle')}</AlertTitle>
      <AlertDescription>
        <p>{status === 'rejected' ? t('verify.rejectedText', { reason: rejectionReason || '—' }) : t('verify.missingText')}</p>
        {showAction && (
          <Button asChild size="sm" variant="destructive" className="mt-2">
            <Link to="/verify-identity">{t('verify.uploadNow')}</Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
