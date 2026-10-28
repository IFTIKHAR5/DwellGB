// components/layout/AuthLayout.jsx — login / sign-up screen.
// Left: the form in a calm white column. Right: a large mountain photo.
// `wide` hides the photo so the owner's document step has room.
import { MapPin } from '@/components/icons';
import { useLanguage } from '@/context/LanguageContext';
import { SITE_IMAGES } from '@/lib/images';
import { cn } from '@/lib/utils';

export default function AuthLayout({ eyebrow, title, subtitle, top, footer, children, wide = false }) {
  const { t } = useLanguage();

  return (
    <div className={cn('min-h-[calc(100dvh-4rem)] md:min-h-[calc(100dvh-72px)] bg-surface grid', !wide && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]')}>
      {/* ---------- form column ---------- */}
      <div className="flex flex-col px-5 sm:px-10 py-10 lg:py-14">
        <div className={cn('w-full mx-auto my-auto animate-slide-up', wide ? 'max-w-3xl' : 'max-w-[440px]')}>
          {top}
          {eyebrow && (
            <p className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#B07F2E]">
              <span className="h-px w-7 bg-[#C8923B]" aria-hidden="true" /> {eyebrow}
            </p>
          )}
          <h1 className="font-serif font-normal text-[2.4rem] sm:text-[2.9rem] leading-[1.05] tracking-tight">{title}</h1>
          {subtitle && <p className="text-ink-2 mt-2 leading-relaxed">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 pt-6 border-t border-line text-center text-sm text-ink-2">{footer}</div>}
        </div>
      </div>

      {/* ---------- photo column ---------- */}
      {!wide && (
        <div className="hidden lg:block p-3 ps-0">
          <div className="sticky top-[84px] h-[calc(100vh-96px)] min-h-[560px] rounded-[28px] overflow-hidden relative bg-pine-900 text-white">
            <img src={SITE_IMAGES.auth} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-[#111318]/90 via-[#111318]/20 to-transparent" aria-hidden="true" />

            <div className="absolute inset-x-0 bottom-0 p-10 xl:p-12">
              <p className="font-serif text-[2rem] xl:text-[2.4rem] leading-[1.15] max-w-lg">“{t('auth.panelQuote')}”</p>
              <div className="mt-8 pt-6 border-t border-white/20 flex flex-wrap items-center justify-between gap-4 text-sm text-white/80">
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {t('auth.panelPlace')}</span>
                <span>{t('auth.panelFacts')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
