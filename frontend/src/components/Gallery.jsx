// components/Gallery.jsx — listing photos.
//   One big photo with ← → arrows, a "2 / 7" counter and thumbnails to pick any photo.
//   Swipe on phones. Tap the photo → full-screen viewer (swipe, arrows or keyboard).
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Grid3x3 } from '@/components/icons';
import { mediaUrl } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '@/lib/utils';

/* ---------- one photo that fades in when it has loaded ---------- */
function Photo({ img, alt, eager, fit = 'cover', className }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={mediaUrl(img.url)}
      alt={alt}
      width={img.width || undefined}
      height={img.height || undefined}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => setLoaded(true)}
      className={cn(
        'transition-opacity duration-300 select-none',
        fit === 'cover' ? 'absolute inset-0 w-full h-full object-cover' : 'max-w-full max-h-full w-auto h-auto object-contain',
        loaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  );
}

/* ---------- the gallery on the page: big photo + arrows + thumbnails ---------- */
function Stage({ images, title, onOpen }) {
  const { t } = useLanguage();
  const track = useRef(null);
  const thumbs = useRef(null);
  const [index, setIndex] = useState(0);
  const count = images.length;

  // Slide the big photo to number i (wraps around at the ends).
  const goTo = useCallback((i, smooth = true) => {
    const el = track.current;
    if (!el) return;
    const next = (i + count) % count;
    const wrapped = Math.abs(next - i) > 0;
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth && !wrapped ? 'smooth' : 'auto' });
    setIndex(next);
  }, [count]);

  // Swiping on phones also updates the counter and thumbnails.
  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  // Keep the active thumbnail visible (without scrolling the page up or down).
  useEffect(() => {
    const strip = thumbs.current;
    const thumb = strip?.children[index];
    if (strip && thumb) strip.scrollTo({ left: thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2, behavior: 'smooth' });
  }, [index]);

  // Stay on the same photo when the window is resized or the phone is rotated.
  useEffect(() => {
    const onResize = () => goTo(index, false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [index, goTo]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
  };

  const arrow = 'absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 text-ink shadow-card flex items-center justify-center hover:bg-white hover:scale-105 transition';

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden bg-sunken" onKeyDown={onKeyDown}>
        <div
          ref={track}
          onScroll={onScroll}
          dir="ltr"
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:h-[min(560px,64vh)]"
        >
          {images.map((img, i) => (
            <button
              key={img.id || i}
              type="button"
              onClick={() => onOpen(i)}
              className="relative shrink-0 w-full h-full snap-center snap-always cursor-zoom-in focus-visible:outline-none"
              aria-label={`${title} — ${i + 1} / ${count}`}
            >
              <Photo img={img} alt={`${title} — ${i + 1}`} eager={i === 0} className="lg:object-contain" />
            </button>
          ))}
        </div>

        {count > 1 && (
          <>
            <button type="button" onClick={() => goTo(index - 1)} className={cn(arrow, 'left-3 md:left-4')} aria-label="Previous photo">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => goTo(index + 1)} className={cn(arrow, 'right-3 md:right-4')} aria-label="Next photo">
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="pointer-events-none absolute bottom-3 left-3 md:bottom-4 md:left-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white tabular-nums" dir="ltr">
              {index + 1} / {count}
            </span>
          </>
        )}
        <button type="button" onClick={() => onOpen(index)} className="absolute bottom-3 right-3 md:bottom-4 md:right-4 btn btn-sm bg-white/95 text-ink shadow-card hover:bg-white">
          <Grid3x3 className="w-4 h-4" /> <span className="hidden sm:inline">{t('listing.showPhotos', { n: count })}</span>
        </button>
      </div>

      {/* Thumbnails: tap one to show it above */}
      {count > 1 && (
        <div ref={thumbs} className="mt-3 flex gap-2 overflow-x-auto no-scrollbar py-1 px-0.5" dir="ltr">
          {images.map((img, i) => (
            <button
              key={img.id || i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${i + 1} / ${count}`}
              aria-current={i === index ? 'true' : undefined}
              className={cn(
                'relative shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden bg-sunken transition',
                i === index ? 'ring-2 ring-ink ring-offset-2 ring-offset-canvas' : 'opacity-60 hover:opacity-100',
              )}
            >
              <img src={mediaUrl(img.url)} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- full-screen viewer ---------- */
function Lightbox({ images, start, onClose }) {
  const track = useRef(null);
  const thumbs = useRef(null);
  const [index, setIndex] = useState(start);
  const count = images.length;

  const scrollTo = useCallback((i, smooth = true) => {
    const el = track.current;
    if (!el) return;
    const next = (i + count) % count;
    // Jump (not glide) when wrapping from last to first, it looks less odd.
    const wrap = Math.abs(next - i) > 0;
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth && !wrap ? 'smooth' : 'auto' });
  }, [count]);

  // Open at the photo that was tapped.
  useEffect(() => {
    scrollTo(start, false);
  }, [start, scrollTo]);

  // Keyboard + stop the page behind from scrolling.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') scrollTo(index + 1);
      if (e.key === 'ArrowLeft') scrollTo(index - 1);
    };
    document.addEventListener('keydown', onKey);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = old;
    };
  }, [index, onClose, scrollTo]);

  // Keep the current thumbnail in view.
  useEffect(() => {
    thumbs.current?.children[index]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [index]);

  // Stay on the same photo when the phone is rotated.
  useEffect(() => {
    const onResize = () => scrollTo(index, false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [index, scrollTo]);

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const arrow = 'hidden md:flex absolute top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors';

  return createPortal(
    <div className="fixed inset-0 z-[120] flex h-[100dvh] flex-col bg-black/95 animate-fade-in" role="dialog" aria-modal="true" dir="ltr">
      <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium tabular-nums">{index + 1} / {count}</span>
        <button type="button" onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10" aria-label="Close">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={track} onScroll={onScroll} className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar overscroll-contain">
          {images.map((img, i) => (
            <div
              key={img.id || i}
              className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center px-2 md:px-20"
              onClick={(e) => e.target === e.currentTarget && onClose()}
            >
              <Photo img={img} alt="" fit="contain" eager={Math.abs(i - start) <= 1} className="rounded-lg" />
            </div>
          ))}
        </div>
        {count > 1 && (
          <>
            <button type="button" onClick={() => scrollTo(index - 1)} className={cn(arrow, 'left-4')} aria-label="Previous"><ChevronLeft className="w-6 h-6" /></button>
            <button type="button" onClick={() => scrollTo(index + 1)} className={cn(arrow, 'right-4')} aria-label="Next"><ChevronRight className="w-6 h-6" /></button>
          </>
        )}
      </div>

      {count > 1 && (
        <div ref={thumbs} className="flex shrink-0 gap-2 overflow-x-auto no-scrollbar px-4 py-4 md:justify-center">
          {images.map((img, i) => (
            <button
              key={img.id || i}
              type="button"
              onClick={() => scrollTo(i)}
              className={cn('relative shrink-0 w-16 h-12 rounded-md overflow-hidden ring-2 transition', i === index ? 'ring-white' : 'ring-transparent opacity-50 hover:opacity-80')}
              aria-label={`${i + 1}`}
            >
              <img src={mediaUrl(img.url)} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

export default function Gallery({ images = [], title }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(null);
  const close = useCallback(() => setOpen(null), []);
  const count = images.length;

  if (!count) {
    return <div className="aspect-[16/9] lg:aspect-auto lg:h-[min(560px,64vh)] rounded-2xl bg-sunken flex items-center justify-center text-muted">{t('listing.noPhoto')}</div>;
  }

  return (
    <>
      <Stage images={images} title={title} onOpen={setOpen} />
      {open !== null && <Lightbox images={images} start={open} onClose={close} />}
    </>
  );
}
