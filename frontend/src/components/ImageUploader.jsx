// components/ImageUploader.jsx — drag & drop, previews, reorder, remove, cover badge.
// items: [{ key, url, file?, id? }]  (id = existing image on the server)
import { useRef, useState } from 'react';
import { ImagePlus, X, ChevronLeft, ChevronRight, Star } from '@/components/icons';
import { mediaUrl } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

const MAX = 10;
const MAX_MB = 8;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export default function ImageUploader({ items, onChange, error }) {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [warn, setWarn] = useState('');

  function addFiles(fileList) {
    const files = [...fileList];
    const room = MAX - items.length;
    const ok = [];
    let rejected = 0;
    for (const f of files) {
      if (!TYPES.includes(f.type) || f.size > MAX_MB * 1024 * 1024) { rejected++; continue; }
      if (ok.length >= room) { rejected++; continue; }
      ok.push({ key: `${f.name}-${f.size}-${Math.random()}`, file: f, url: URL.createObjectURL(f) });
    }
    setWarn(rejected ? t('upload.rejected', { n: rejected, max: MAX, mb: MAX_MB }) : '');
    if (ok.length) onChange([...items, ...ok]);
  }

  function remove(key) {
    const it = items.find((i) => i.key === key);
    if (it?.file) URL.revokeObjectURL(it.url);
    onChange(items.filter((i) => i.key !== key));
  }

  function move(idx, dir) {
    const next = [...items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          drag ? 'border-pine bg-pine-50' : error ? 'border-danger bg-danger-50/40' : 'border-line-strong hover:border-pine hover:bg-pine-50/40'
        }`}
      >
        <ImagePlus className="w-9 h-9 mx-auto text-pine" />
        <p className="mt-3 font-semibold">{t('upload.drop')}</p>
        <p className="text-sm text-muted mt-1">{t('upload.hint', { max: MAX, mb: MAX_MB })}</p>
        <input ref={inputRef} type="file" accept={TYPES.join(',')} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>
      {(warn || error) && <p className="mt-2 text-sm text-danger font-medium">{error || warn}</p>}

      {items.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((it, i) => (
            <li key={it.key} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-sunken border border-line">
              <img src={it.file ? it.url : mediaUrl(it.url)} alt="" className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-2 start-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pine text-white text-[11px] font-bold">
                  <Star className="w-3 h-3 fill-current" /> {t('upload.cover')}
                </span>
              )}
              <button type="button" onClick={() => remove(it.key)} className="absolute top-2 end-2 w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-danger" aria-label={t('upload.remove')}>
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 inset-x-2 flex justify-between opacity-100 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-white/90 flex items-center justify-center disabled:opacity-30" aria-label="Move earlier">
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-white/90 flex items-center justify-center disabled:opacity-30" aria-label="Move later">
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
