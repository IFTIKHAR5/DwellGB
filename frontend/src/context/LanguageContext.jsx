// context/LanguageContext.jsx — English / Urdu (RTL) across the whole app.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

function readLang() {
  try {
    const saved = localStorage.getItem('dg_lang');
    if (saved === 'en' || saved === 'ur') return saved;
  } catch { /* storage unavailable */ }
  return 'en';
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readLang);

  useEffect(() => {
    try { localStorage.setItem('dg_lang', lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      // Singular: t('detail.months', { n: 1 }) uses 'detail.months_one' when that key exists.
      const one = Number(vars?.n) === 1 ? `${key}_one` : null;
      let s = (one && (translations[lang]?.[one] ?? translations.en[one])) ?? translations[lang]?.[key] ?? translations.en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v ?? '');
      return s;
    },
    [lang],
  );

  const toggleLang = useCallback(() => setLang((l) => (l === 'en' ? 'ur' : 'en')), []);

  const value = useMemo(() => ({ lang, setLang, toggleLang, t, isRtl: lang === 'ur' }), [lang, toggleLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
