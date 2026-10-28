import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Logo } from './PeakMark';
import { DISTRICTS } from '../lib/constants';
import { SITE_IMAGES } from '../lib/images';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="relative overflow-hidden bg-pine-900 text-white/75 mt-24">
      {/* faint mountain photo behind the footer */}
      <img src={SITE_IMAGES.hero} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-[0.12]" />
      <div className="relative container-page py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 text-sm leading-relaxed max-w-xs">{t('footer.tagline')}</p>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">{t('footer.explore')}</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/listings">{t('nav.browse')}</Link></li>
            <li><Link className="hover:text-white" to="/listings?propertyType=single_room">{t('footer.rooms')}</Link></li>
            <li><Link className="hover:text-white" to="/listings?furnishing=furnished">{t('footer.furnished')}</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">{t('footer.districts')}</p>
          <ul className="space-y-2 text-sm">
            {DISTRICTS.slice(0, 5).map((d) => (
              <li key={d}><Link className="hover:text-white" to={`/listings?district=${d}`}>{t(`district.${d}`)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">{t('footer.owners')}</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/register?role=owner">{t('nav.listProperty')}</Link></li>
            <li><Link className="hover:text-white" to="/dashboard">{t('nav.dashboard')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="container-page py-5 text-xs flex flex-col sm:flex-row gap-2 justify-between">
          <p>© {new Date().getFullYear()} DwellGB · {t('footer.made')}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>{t('footer.fyp')}</span>
            <span aria-hidden="true">·</span>
            <Link to="/contact" className="hover:text-white transition-colors font-medium">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}