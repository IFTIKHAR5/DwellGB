import { useState } from 'react';
import { mediaUrl } from '../../api/client';
import { initials } from '../../lib/format';

const SIZES = { xs: 'w-7 h-7 text-[10px]', sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-16 h-16 text-lg', xl: 'w-24 h-24 text-2xl' };
const TONES = ['bg-pine-100 text-pine', 'bg-brand-100 text-brand-700', 'bg-[#E9E2F5] text-[#5B3E96]', 'bg-[#FCEFC7] text-[#8A5A00]', 'bg-[#DDEBFA] text-[#1D4E89]'];

export default function Avatar({ name = '', src, size = 'md', online, className = '' }) {
  const [broken, setBroken] = useState(false);
  const tone = TONES[(name.charCodeAt(0) || 0) % TONES.length];
  const url = mediaUrl(src);
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span className={`${SIZES[size]} rounded-full overflow-hidden flex items-center justify-center font-semibold ${tone}`}>
        {url && !broken ? (
          <img src={url} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        ) : (
          initials(name)
        )}
      </span>
      {online !== undefined && (
        <span className={`absolute bottom-0 end-0 w-3 h-3 rounded-full ring-2 ring-white ${online ? 'bg-success' : 'bg-line-strong'}`} />
      )}
    </span>
  );
}
