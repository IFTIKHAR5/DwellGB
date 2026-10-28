// pages/SavedListings.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Search } from '@/components/icons';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import ListingCard, { ListingCardSkeleton } from '../components/ListingCard';
import EmptyState from '../components/ui/EmptyState';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { StaggerGrid, StaggerItem } from '../components/motion';

export default function SavedListings() {
  const { t } = useLanguage();
  const [items, setItems] = useState(null);
  useDocumentTitle(t('nav.saved'));

  useEffect(() => {
    api.get('/users/me/saved').then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">{t('nav.saved')}</h1>
      <p className="text-ink-2 mt-1">{t('saved.sub')}</p>
      {items === null ? (
        <div className="mt-8 grid sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-9">
          {Array.from({ length: 3 }).map((_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      ) : (
        <StaggerGrid className="mt-8 grid sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-9">
          {items.map((l) => <StaggerItem key={l.id}><ListingCard listing={l} /></StaggerItem>)}
        </StaggerGrid>
      )}
      {items?.length === 0 && (
        <EmptyState icon={Heart} title={t('saved.empty')} text={t('saved.emptyText')} action={<Link to="/listings" className="btn btn-primary"><Search className="w-4 h-4" /> {t('nav.browse')}</Link>} />
      )}
    </div>
  );
}
