// components/home/HowItWorks.jsx — "How DwellGB works" for tenants or owners.
// Each step shows a small picture of that part of the app instead of a plain icon.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CircleCheck, Home, IdCard, BadgeCheck, User } from '@/components/icons';
import { useLanguage } from '@/context/LanguageContext';
import { DISTRICT_IMAGES } from '@/lib/images';
import { cn } from '@/lib/utils';

/* ---------- small pictures of the app ---------- */

function SearchPreview() {
  const { t } = useLanguage();
  return (
    <div className="w-full max-w-[270px] space-y-3">
      <div className="flex items-center gap-2.5 rounded-full bg-surface shadow-card px-4 py-2.5 text-sm">
        <Search size={16} className="text-muted" />
        <span className="text-ink font-medium">Jutial, Gilgit</span>
        <span className="ms-auto w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center"><Search size={12} weight="bold" /></span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[t('how.chipFurnished'), t('how.chipGas'), t('how.chipBeds')].map((c, i) => (
          <span key={c} className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', i === 1 ? 'bg-pine text-white' : 'bg-surface text-ink-2 border border-line')}>{c}</span>
        ))}
      </div>
    </div>
  );
}

function ChatPreview() {
  const { t } = useLanguage();
  return (
    <div className="w-full max-w-[270px] space-y-2 text-[12.5px]">
      <p className="w-fit max-w-[85%] rounded-2xl rounded-es-md bg-surface shadow-card px-3.5 py-2 text-ink">{t('how.chatQ')}</p>
      <p className="w-fit max-w-[85%] ms-auto rounded-2xl rounded-ee-md bg-pine text-white px-3.5 py-2">{t('how.chatA')}</p>
      <span className="inline-flex gap-1 rounded-full bg-surface shadow-card px-3 py-2">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-muted" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </span>
    </div>
  );
}

function AcceptedPreview() {
  const { t } = useLanguage();
  return (
    <div className="w-full max-w-[270px] rounded-2xl bg-surface shadow-card p-4">
      <div className="flex items-center gap-2.5">
        <CircleCheck size={26} weight="fill" className="text-success" />
        <div>
          <p className="text-sm font-bold text-ink">{t('how.accepted')}</p>
          <p className="text-[11px] text-muted">{t('how.acceptedSub')}</p>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-success-50 px-3 py-2 text-xs font-semibold text-success ltr-nums">0355 123 4567</p>
    </div>
  );
}

function ListingPreview() {
  return (
    <div className="w-full max-w-[230px] rounded-2xl bg-surface shadow-card p-2">
      <div className="h-24 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${DISTRICT_IMAGES.Hunza})` }} />
      <div className="px-1.5 pt-2.5 pb-1">
        <p className="text-[13px] font-bold text-ink truncate">Upper portion · Aliabad</p>
        <p className="text-xs text-muted mt-0.5"><span className="font-bold text-ink ltr-nums">Rs 28,000</span> / month</p>
      </div>
    </div>
  );
}

function VerifyPreview() {
  const { t } = useLanguage();
  return (
    <div className="relative w-full max-w-[240px] rounded-2xl bg-linear-to-br from-[#EAF6EE] to-[#DDEFE4] border border-success/20 p-4 shadow-card">
      <div className="flex gap-3">
        <span className="w-12 h-14 rounded-lg bg-white/80 flex items-center justify-center text-success/70"><IdCard size={26} /></span>
        <div className="flex-1 space-y-1.5 pt-1">
          <span className="block h-2 w-3/4 rounded-full bg-success/25" />
          <span className="block h-2 w-1/2 rounded-full bg-success/20" />
          <span className="block h-2 w-2/3 rounded-full bg-success/15" />
        </div>
      </div>
      <span className="absolute -top-3 -end-3 inline-flex items-center gap-1 rounded-full bg-success text-white px-2.5 py-1 text-[11px] font-bold shadow-card">
        <BadgeCheck size={14} strokeWidth={1.9} /> {t('how.verified')}
      </span>
    </div>
  );
}

function RequestPreview() {
  const { t } = useLanguage();
  return (
    <div className="w-full max-w-[270px] rounded-2xl bg-surface shadow-card p-3.5">
      <div className="flex items-center gap-2.5">
        <User size={34} weight="duotone" className="text-violet/80" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">Ayesha B.</p>
          <p className="text-[11px] text-muted truncate">{t('how.requestSub')}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
        <span className="rounded-lg border border-line py-1.5 text-center text-ink-2">{t('how.decline')}</span>
        <span className="rounded-lg py-1.5 text-center text-white" style={{ background: 'var(--gradient-action)' }}>{t('how.accept')}</span>
      </div>
    </div>
  );
}

const STEPS = {
  tenant: [
    { title: 'home.t1', text: 'home.t1s', Preview: SearchPreview, tint: 'from-[#FFF1E8] to-[#FFE3EC]' },
    { title: 'home.t2', text: 'home.t2s', Preview: ChatPreview, tint: 'from-[#EEF0FF] to-[#E6F7FA]' },
    { title: 'home.t3', text: 'home.t3s', Preview: AcceptedPreview, tint: 'from-[#E8F6EE] to-[#EEF0FF]' },
  ],
  owner: [
    { title: 'home.o1', text: 'home.o1s', Preview: ListingPreview, tint: 'from-[#FFF1E8] to-[#FFE3EC]' },
    { title: 'home.o2', text: 'home.o2s', Preview: VerifyPreview, tint: 'from-[#E8F6EE] to-[#E6F7FA]' },
    { title: 'home.o3', text: 'home.o3s', Preview: RequestPreview, tint: 'from-[#EEF0FF] to-[#F5EEFF]' },
  ],
};

export default function HowItWorks() {
  const { t } = useLanguage();
  const [audience, setAudience] = useState('tenant');

  return (
    <section className="container-page mt-28">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl">
          <p className="text-gradient font-semibold text-sm uppercase tracking-wider w-fit">{t('how.kicker')}</p>
          <h2 className="mt-2 text-3xl md:text-[2.9rem] leading-[1.05] font-extrabold">
            {t('how.title1')} <span className="font-serif italic font-normal text-gradient">{t('how.title2')}</span>
          </h2>
        </div>

        {/* tenant / owner switch with a sliding background */}
        <div className="relative inline-flex self-start md:self-auto rounded-full bg-surface border border-line p-1 shadow-card">
          {['tenant', 'owner'].map((a) => (
            <button key={a} onClick={() => setAudience(a)} className={cn('relative z-10 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors', audience === a ? 'text-white' : 'text-ink-2 hover:text-ink')}>
              {audience === a && <motion.span layoutId="how-pill" className="absolute inset-0 -z-10 rounded-full bg-pine" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className="inline-flex items-center gap-2">{a === 'tenant' ? <Search size={16} /> : <Home size={16} />} {a === 'tenant' ? t('home.forTenants') : t('home.forOwners')}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-10">
        {/* gradient line joining the three steps (desktop) */}
        <div className="hidden md:block absolute top-[208px] inset-x-[16%] h-px bg-linear-to-r from-brand/0 via-violet/40 to-glacier/0" aria-hidden="true" />

        <AnimatePresence mode="wait">
          <motion.ol
            key={audience}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-3 gap-5"
          >
            {STEPS[audience].map(({ title, text, Preview, tint }, i) => (
              <li key={title} className="group card card-glow rounded-[1.75rem] p-2.5 flex flex-col">
                <div className={cn('relative h-48 rounded-[1.4rem] bg-linear-to-br bg-dots flex items-center justify-center px-6 overflow-hidden', tint)}>
                  <div className="transition-transform duration-500 group-hover:scale-[1.04] w-full flex justify-center">
                    <Preview />
                  </div>
                </div>
                <div className="px-4 pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-bold text-white w-8 h-8 rounded-full flex items-center justify-center ltr-nums" style={{ background: 'var(--gradient-action)' }}>
                      {i + 1}
                    </span>
                    <h3 className="text-lg font-bold">{t(title)}</h3>
                  </div>
                  <p className="mt-3 text-ink-2 leading-relaxed text-[15px]">{t(text)}</p>
                </div>
              </li>
            ))}
          </motion.ol>
        </AnimatePresence>
      </div>
    </section>
  );
}
