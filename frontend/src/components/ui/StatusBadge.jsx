import { useLanguage } from '../../context/LanguageContext';

const STYLES = {
  pending: 'bg-warning-50 text-warning',
  accepted: 'bg-success-50 text-success',
  rejected: 'bg-danger-50 text-danger',
  cancelled: 'bg-sunken text-muted',
  available: 'bg-success-50 text-success',
  rented: 'bg-sunken text-ink-2',
  hidden: 'bg-sunken text-muted',
  removed: 'bg-danger-50 text-danger',
  open: 'bg-warning-50 text-warning',
  resolved: 'bg-success-50 text-success',
  dismissed: 'bg-sunken text-muted',
  active: 'bg-success-50 text-success',
  banned: 'bg-danger-50 text-danger',
};

export default function StatusBadge({ status, className = '' }) {
  const { t } = useLanguage();
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STYLES[status] || 'bg-sunken'} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {t(`status.${status}`)}
    </span>
  );
}
