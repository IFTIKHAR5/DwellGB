// components/ui/Select.jsx — a styled dropdown that replaces the browser's plain <select>.
//
//   <Select value={district} onChange={setDistrict} options={[{ value: '', label: 'All districts' }, ...]} />
//
// The list opens in a layer on top of the page (so it is never cut off by a section edge),
// and works with mouse, touch and keyboard (↑ ↓ Enter Esc).
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from '@/components/icons';
import { cn } from '@/lib/utils';

export default function Select({ value, onChange, options, label, className = '', buttonClassName = '' }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) || options[0];

  // Place the list under the button (or above it when there is no room below).
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const height = Math.min(320, options.length * 44 + 12);
    const up = below < height + 16 && r.top > below;
    setPos({ left: r.left, width: Math.max(r.width, 220), top: up ? undefined : r.bottom + 8, bottom: up ? window.innerHeight - r.top + 8 : undefined });
  }, [open, options.length]);

  // Close on outside click, scroll or resize.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!buttonRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function openList() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function choose(o) {
    onChange(o.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(e) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[active]); }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
  }

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        className={cn('w-full flex items-center justify-between gap-2 text-start outline-none', buttonClassName)}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && pos && createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, maxWidth: 'calc(100vw - 16px)' }}
          className="z-[200] max-h-80 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-pop animate-fade-in"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value || '__all'}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(o)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] cursor-pointer',
                  i === active ? 'bg-sunken text-ink' : 'text-ink-2',
                  isSelected && 'font-semibold text-ink',
                )}
              >
                <span className="truncate">{o.label}</span>
                {isSelected && <Check className="w-4 h-4 shrink-0 text-ink" />}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
}
