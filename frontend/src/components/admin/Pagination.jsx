import { ChevronLeft, ChevronRight } from '@/components/icons';

export default function Pagination({ page, pages, total, onPage }) {
  if (!pages || pages <= 1) return total !== undefined ? <p className="text-xs text-muted mt-4 ltr-nums">{total} total</p> : null;
  return (
    <div className="flex items-center justify-between mt-5">
      <p className="text-xs text-muted ltr-nums">{total} total</p>
      <div className="flex items-center gap-2">
        <button className="btn btn-secondary btn-icon w-9 h-9" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="w-4 h-4 rtl:rotate-180" /></button>
        <span className="text-sm font-semibold ltr-nums">{page} / {pages}</span>
        <button className="btn btn-secondary btn-icon w-9 h-9" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="w-4 h-4 rtl:rotate-180" /></button>
      </div>
    </div>
  );
}
