import { useState } from 'react';
import { Star } from '@/components/icons';

export function Stars({ value = 0, size = 'w-4 h-4' }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-gold text-gold' : 'text-line-strong'}`} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          className="p-1 transition-transform hover:scale-110"
        >
          <Star className={`w-8 h-8 ${i <= (hover || value) ? 'fill-gold text-gold' : 'text-line-strong'}`} />
        </button>
      ))}
    </div>
  );
}

export function RatingPill({ avg, count, className = '' }) {
  if (!count) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${className}`}>
      <Star className="w-4 h-4 fill-gold text-gold" />
      <span className="ltr-nums">{Number(avg).toFixed(1)}</span>
      <span className="text-muted font-normal ltr-nums">({count})</span>
    </span>
  );
}
