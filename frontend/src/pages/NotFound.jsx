import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFound() {
  const { t } = useLanguage();
  useDocumentTitle('404');
  return (
    <div className="container-page py-28 text-center">
      <p className="font-serif italic text-8xl text-pine">404</p>
      <h1 className="text-2xl font-bold mt-4">{t('notFound.title')}</h1>
      <p className="text-ink-2 mt-2">{t('notFound.text')}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="btn btn-secondary">{t('common.home')}</Link>
        <Link to="/listings" className="btn btn-primary">{t('nav.browse')}</Link>
      </div>
    </div>
  );
}
