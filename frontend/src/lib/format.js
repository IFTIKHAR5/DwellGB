// lib/format.js — number, money and date helpers (locale-aware).

export function formatRent(n, { compact = false } = {}) {
  const v = Number(n) || 0;
  if (compact) {
    if (v >= 100000) return `Rs ${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)}L`;
    if (v >= 1000) return `Rs ${Math.round(v / 1000)}k`;
  }
  return `Rs ${v.toLocaleString('en-PK')}`;
}

export function formatDate(d, lang = 'en', opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat(lang === 'ur' ? 'ur-PK' : 'en-GB', opts).format(new Date(d));
  } catch {
    return new Date(d).toDateString();
  }
}

export function timeAgo(d, lang = 'en') {
  if (!d) return '';
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang === 'ur' ? 'ur' : 'en', { numeric: 'auto' });
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(0, 'second');
}

export function chatTime(d, lang = 'en') {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const fmt = new Intl.DateTimeFormat(lang === 'ur' ? 'ur-PK' : 'en-GB', sameDay ? { hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short' });
  return fmt.format(date);
}

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

/** "0355 1234567" style for display of a 923XXXXXXXXX number. */
export function localPhone(p) {
  if (!p) return '';
  const d = String(p).replace(/\D/g, '');
  if (d.startsWith('92') && d.length === 12) return `0${d.slice(2, 5)} ${d.slice(5)}`;
  return p;
}

export function whatsappLink(p, text = '') {
  const d = String(p || '').replace(/\D/g, '');
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** Formats a CNIC while typing: 12345-1234567-1 */
export function maskCnicInput(v) {
  const d = String(v).replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

/** Only allow redirects to our own pages (prevents open-redirect attacks). */
export function safeNext(next) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;
}
