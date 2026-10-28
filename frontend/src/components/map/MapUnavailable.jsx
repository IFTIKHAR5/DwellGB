import { MapPinOff } from '@/components/icons';
import { useLanguage } from '../../context/LanguageContext';

export default function MapUnavailable({ className = '' }) {
  const { t } = useLanguage();
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-2 bg-sunken rounded-2xl p-6 text-muted ${className}`}>
      <MapPinOff className="w-8 h-8" />
      <p className="font-semibold text-ink-2">{t('map.unavailable')}</p>
      <p className="text-xs max-w-xs">{t('map.unavailableHint')}</p>
    </div>
  );
}
