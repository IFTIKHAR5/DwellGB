// components/PeakMark.jsx — the DwellGB logo, redrawn as SVG from the brand artwork:
// nested golden rooflines (the mountains) around a small house with an arched door.
import { useId } from 'react';

export default function PeakMark({ className = 'w-9 h-9' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`gold-${id}`} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F7DB97" />
          <stop offset="0.45" stopColor="#D6A54A" />
          <stop offset="0.75" stopColor="#B07F2E" />
          <stop offset="1" stopColor="#E9C578" />
        </linearGradient>
      </defs>
      <g stroke={`url(#gold-${id})`} strokeWidth="3.2" strokeLinejoin="miter" strokeLinecap="square">
        {/* chimney + outer roof */}
        <path d="M11 7V17" />
        <path d="M17 12.5L25.5 5L42 19.5" />
        {/* outer walls */}
        <path d="M9 23V43H19" />
        <path d="M40 23V43H30" />
        {/* middle roofline */}
        <path d="M18 21L25.5 14.5L33 21" />
        {/* inner house */}
        <path d="M14 33L25.5 23.5L37 33" />
        <path d="M19 30V43" />
        <path d="M32 30V43" />
      </g>
      {/* arched door */}
      <path d="M22.5 43V38a3 3 0 0 1 6 0v5z" fill={`url(#gold-${id})`} />
    </svg>
  );
}

/** Logo = mark + "dwellgb" wordmark. `light` for dark backgrounds. */
export function Logo({ light = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 sm:gap-2.5 ${className}`}>
      <PeakMark className="w-8 h-8 sm:w-9 sm:h-9" />
      <span className={`font-serif text-[1.6rem] sm:text-[1.85rem] leading-none tracking-tight ${light ? 'text-white' : 'text-ink'}`} style={{ fontFamily: 'var(--font-serif)' }}>
        dwell<span className="text-gold-gradient">gb</span>
      </span>
    </span>
  );
}
