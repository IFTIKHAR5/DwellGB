// components/Chatbot.jsx — DwellGB assistant (website). Draggable round launcher, white panel
// with a solid pine header. Sends the language so replies match the site.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from '@/components/icons';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  en: {
    title: 'DwellGB Assistant',
    status: 'Usually replies in a few seconds',
    greeting: 'Assalam o Alaikum! How can I help you?',
    quick: 'Quick questions',
    placeholder: 'Ask about homes, rent or listing…',
    error: 'Sorry, I could not reach the server. Please try again.',
    suggestions: ['2 bedroom house in Gilgit', 'Portions in Hunza', 'Rent under Rs 30,000', 'How do I list my property?'],
    open: 'Open chat',
    close: 'Close chat',
    send: 'Send',
  },
  ur: {
    title: 'DwellGB اسسٹنٹ',
    status: 'عام طور پر چند سیکنڈ میں جواب',
    greeting: 'السلام علیکم! میں آپ کی کیسے مدد کر سکتا ہوں؟',
    quick: 'فوری سوالات',
    placeholder: 'گھر، کرایہ یا لسٹنگ کے بارے میں پوچھیں…',
    error: 'معذرت، سرور تک رسائی نہیں ہو سکی۔ دوبارہ کوشش کریں۔',
    suggestions: ['Gilgit mein 2 bedroom ghar', 'Hunza mein portion', 'Rent 30000 tak', 'Apni property list kaise karun?'],
    open: 'چیٹ کھولیں',
    close: 'چیٹ بند کریں',
    send: 'بھیجیں',
  },
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-pine"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export default function Chatbot() {
  const { lang } = useLanguage();
  const C = COPY[lang] ?? COPY.en;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ id: 0, greeting: true, isBot: true }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const boundsRef = useRef(null); // invisible box that keeps the launcher on screen

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function send(text) {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput('');
    setMessages((m) => [...m, { id: Date.now(), text: msg, isBot: false }]);
    setBusy(true);
    let reply;
    try {
      const { data } = await api.post('/chat', { message: msg, lang });
      reply = data.reply || C.error;
    } catch (err) {
      reply = err.response?.data?.error || C.error;
    } finally {
      setBusy(false);
    }
    setMessages((m) => [...m, { id: Date.now() + 1, text: reply, isBot: true }]);
  }

  const showSuggestions = messages.length === 1 && !busy;

  return (
    <>
      <div ref={boundsRef} className="pointer-events-none fixed inset-4 z-[9998]" />

      <AnimatePresence>
        {!open && (
          <motion.div
            key="launcher"
            drag
            dragConstraints={boundsRef}
            dragElastic={0.05}
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[10000] cursor-grab active:cursor-grabbing"
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={C.open}
              className="grid h-14 w-14 place-items-center rounded-full bg-pine text-white shadow-[0_18px_40px_-12px_rgba(31,42,110,0.55)] transition hover:bg-pine-600"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            key="panel"
            role="dialog"
            aria-label={C.title}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed inset-0 z-[10000] flex flex-col bg-white sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-[390px] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-line sm:shadow-lift"
          >
            <header className="flex items-center justify-between gap-3 bg-pine-900 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand font-display text-[15px] font-bold text-white">
                  DG
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold tracking-tight">{C.title}</p>
                  <p className="truncate text-[12px] text-white/70">{C.status}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={C.close}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-5">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${m.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[82%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed ${
                      m.isBot ? 'border border-line bg-white text-ink shadow-card' : 'bg-pine text-white'
                    }`}
                  >
                    {m.greeting ? C.greeting : m.text}
                  </div>
                </motion.div>
              ))}

              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
                    <TypingDots />
                  </div>
                </div>
              )}

              {showSuggestions && (
                <div className="space-y-2 pt-1">
                  <p className="text-[12px] font-medium text-muted">{C.quick}</p>
                  <div className="flex flex-wrap gap-2">
                    {C.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition hover:border-pine-100 hover:bg-pine-50 hover:text-pine"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="border-t border-line bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-sunken py-1.5 pl-4 pr-1.5 transition focus-within:border-pine focus-within:bg-white">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={C.placeholder}
                  className="min-w-0 flex-1 bg-transparent py-2 text-[14.5px] text-ink outline-none placeholder:text-muted"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label={C.send}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pine text-white transition hover:bg-pine-600 disabled:opacity-35"
                >
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}