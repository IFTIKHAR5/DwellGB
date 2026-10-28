// components/SaveButton.jsx — heart toggle for saving a listing.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from '@/components/icons';
import { toast } from 'sonner';
import api, { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function SaveButton({ listingId, initial = false, variant = 'overlay', onChange }) {
  const { user, toggleSaved } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initial || !!user?.savedListings?.includes(listingId));
  const [busy, setBusy] = useState(false);

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate('/login?next=' + encodeURIComponent(window.location.pathname));
    if (user.role !== 'tenant') return toast(t('save.tenantsOnly'));
    if (busy) return;
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      if (next) await api.post(`/users/me/saved/${listingId}`);
      else await api.delete(`/users/me/saved/${listingId}`);
      toggleSaved(listingId, next);
      onChange?.(next);
      if (next) toast.success(t('save.saved'));
    } catch (err) {
      setSaved(!next);
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (variant === 'button') {
    return (
      <button onClick={toggle} className="btn btn-secondary btn-sm" aria-pressed={saved}>
        <Heart className={`w-4 h-4 ${saved ? 'fill-brand text-brand' : ''}`} /> {saved ? t('save.savedShort') : t('save.save')}
      </button>
    );
  }
  return (
    <button
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? t('save.unsave') : t('save.save')}
      className="w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-card hover:scale-110 transition-transform"
    >
      <Heart className={`w-[18px] h-[18px] ${saved ? 'fill-brand text-brand' : 'text-ink'}`} />
    </button>
  );
}
