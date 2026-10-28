// components/verification/IdentityDocuments.jsx — the three photos an owner provides.
import { ShieldCheck, Lock, Sun, ScanFace } from '@/components/icons';
import { useLanguage } from '@/context/LanguageContext';
import PhotoCapture from './PhotoCapture';

export default function IdentityDocuments({ docs, onChange, errors = {} }) {
  const { t } = useLanguage();
  const set = (kind) => (file) => onChange({ ...docs, [kind]: file });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <PhotoCapture title={t('verify.cnicFront')} hint={t('verify.cnicFrontHint')} value={docs.cnicFront} onChange={set('cnicFront')} error={errors.cnicFront} />
        <PhotoCapture title={t('verify.cnicBack')} hint={t('verify.cnicBackHint')} value={docs.cnicBack} onChange={set('cnicBack')} error={errors.cnicBack} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 items-start">
        <PhotoCapture title={t('verify.selfie')} hint={t('verify.selfieHint')} facing="user" shape="face" value={docs.selfie} onChange={set('selfie')} error={errors.selfie} />
        <ul className="space-y-3 rounded-2xl bg-sunken p-4 text-sm text-ink-2">
          <li className="flex gap-2.5"><Sun className="size-4 shrink-0 text-pine mt-0.5" /> {t('verify.tipLight')}</li>
          <li className="flex gap-2.5"><ScanFace className="size-4 shrink-0 text-pine mt-0.5" /> {t('verify.tipSelfie')}</li>
          <li className="flex gap-2.5"><ShieldCheck className="size-4 shrink-0 text-pine mt-0.5" /> {t('verify.tipWhy')}</li>
          <li className="flex gap-2.5"><Lock className="size-4 shrink-0 text-pine mt-0.5" /> {t('verify.tipPrivate')}</li>
        </ul>
      </div>
    </div>
  );
}
