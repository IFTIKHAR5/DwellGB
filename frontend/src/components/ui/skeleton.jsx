// shadcn/ui — Skeleton
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn('animate-pulse rounded-xl bg-sunken', className)} {...props} />;
}

export { Skeleton };
