// components/ui/magic.jsx — small animated pieces in the style of Magic UI / Aceternity UI,
// written by hand so we don't need extra libraries.
//
//   <NumberTicker value={128} />          counts up from 0 when it scrolls into view
//   <SpotlightCard>…</SpotlightCard>      a card with a soft light that follows the mouse
//   <Marquee>…</Marquee>                  an endless horizontal scroll (pauses on hover)
//   <ShineBadge>…</ShineBadge>            a pill with the rotating gradient border
import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function NumberTicker({ value, prefix = '', className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const target = Number(value) || 0;

  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) return setShown(target);
    const controls = animate(0, target, { duration: 1.4, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, target, reduce]);

  return (
    <span ref={ref} className={cn('ltr-nums tabular-nums', className)}>
      {prefix}{shown.toLocaleString()}
    </span>
  );
}

export function SpotlightCard({ children, className = '', color = 'rgb(124 92 255 / 0.14)' }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: -999, y: -999 });

  function onMove(e) {
    const box = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - box.left, y: e.clientY - box.top });
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setPos({ x: -999, y: -999 })}
      className={cn('card card-glow relative overflow-hidden', className)}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{ background: `radial-gradient(320px circle at ${pos.x}px ${pos.y}px, ${color}, transparent 70%)` }}
        aria-hidden="true"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function Marquee({ children, className = '' }) {
  return (
    <div className={cn('group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]', className)}>
      {/* two identical copies side by side, moved left by half → a seamless loop */}
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        <div className="flex gap-3 pe-3">{children}</div>
        <div className="flex gap-3 pe-3" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}

export function ShineBadge({ children, className = '' }) {
  return (
    <span className={cn('beam inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]', className)}>
      {children}
    </span>
  );
}
