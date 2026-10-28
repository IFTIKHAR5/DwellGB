// components/home/TrustSection.jsx — "Privacy & trust".
// A calm dark band in the logo's charcoal + gold, with the Hunza night photo
// fading in from the right. No gimmicks: a headline and four plain points.
import { BadgeCheck, Lock, MapPin, MessageCircle } from '@/components/icons';
import { useLanguage } from '@/context/LanguageContext';
import { SITE_IMAGES } from '@/lib/images';
import { Reveal } from '@/components/motion';

export default function TrustSection() {
  const { t } = useLanguage();
  const points = [
    { icon: BadgeCheck, title: t('trust.p1'), text: t('trust.p1s') },
    { icon: Lock, title: t('trust.p2'), text: t('trust.p2s') },
    { icon: MapPin, title: t('trust.p3'), text: t('trust.p3s') },
    { icon: MessageCircle, title: t('trust.p4'), text: t('trust.p4s') },
  ];

  return (
    <Reveal as="section" className="container-page mt-28">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-[#111318] text-white">
        {/* photo: top on phones, right side on large screens */}
        <img
          src={SITE_IMAGES.cta}
          alt=""
          loading="lazy"
          className="h-56 sm:h-72 w-full object-cover lg:absolute lg:inset-y-0 lg:end-0 lg:h-full lg:w-[62%]"
        />
        <div className="absolute inset-x-0 top-0 h-56 sm:h-72 bg-linear-to-b from-transparent to-[#111318] lg:hidden" aria-hidden="true" />
        <div
          className="hidden lg:block absolute inset-0 bg-linear-to-r from-[#111318] from-38% via-[#111318]/85 via-52% to-[#111318]/10 rtl:bg-linear-to-l"
          aria-hidden="true"
        />

        <div className="relative px-6 pb-10 -mt-10 sm:px-10 lg:mt-0 lg:px-16 lg:py-20 lg:max-w-[660px]">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#D6A54A]">
            <span className="h-px w-7 bg-[#D6A54A]" aria-hidden="true" /> {t('home.trustKicker')}
          </p>
          <h2 className="mt-5 font-serif font-normal text-[2.4rem] sm:text-5xl lg:text-[3.4rem] leading-[1.05] tracking-tight">
            {t('trust.title1')} <em className="text-[#E3BC6C]">{t('trust.title2')}</em>
          </h2>
          <p className="mt-5 max-w-md text-white/65 text-[17px] leading-relaxed">{t('home.trustText')}</p>

          <ul className="mt-10 grid sm:grid-cols-2 border-t border-white/12">
            {points.map(({ icon: Icon, title, text }, i) => (
              <li
                key={title}
                className={`py-6 border-b border-white/12 ${i % 2 === 0 ? 'sm:pe-6 sm:border-e' : 'sm:ps-6'}`}
              >
                <Icon className="w-[22px] h-[22px] text-[#D6A54A]" weight="light" />
                <h3 className="mt-3 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}
