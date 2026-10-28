import { LoaderCircle } from '@/components/icons';

export function Spinner({ className = 'w-5 h-5' }) {
  return <LoaderCircle className={`animate-spin ${className}`} aria-label="Loading" />;
}

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-pine">
      <Spinner className="w-8 h-8" />
    </div>
  );
}
