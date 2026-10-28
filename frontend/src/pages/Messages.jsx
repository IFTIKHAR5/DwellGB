// pages/Messages.jsx — realtime inbox (conversation list + thread).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Send, Check, CheckCheck, Search, MessageCircle, BadgeCheck, Clock } from '@/components/icons';
import api, { apiError, mediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRealtime } from '../context/RealtimeContext';
import { chatTime, formatDate, formatRent, timeAgo } from '../lib/format';
import Avatar from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import useDocumentTitle from '../hooks/useDocumentTitle';

function sameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function ConversationList({ items, activeId, onPick, filter, setFilter }) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const shown = items.filter((c) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return c.other?.name?.toLowerCase().includes(f) || c.listing?.title?.toLowerCase().includes(f);
  });
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-line">
        <h1 className="text-2xl font-extrabold mb-3">{t('nav.messages')}</h1>
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input h-10 ps-10 rounded-full bg-sunken border-transparent" placeholder={t('chat.search')} value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto scrollbar-thin p-2">
        {shown.map((c) => {
          const mine = c.lastMessage?.senderId === user.id;
          return (
            <li key={c.id}>
              <button
                onClick={() => onPick(c.id)}
                className={`w-full text-start flex gap-3 p-3 rounded-2xl transition-colors ${activeId === c.id ? 'bg-pine-50' : 'hover:bg-sunken'}`}
              >
                <Avatar name={c.other?.name || '?'} src={c.other?.avatar} size="md" online={c.other?.online} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className={`flex-1 truncate ${c.unread ? 'font-bold' : 'font-semibold'}`}>{c.other?.name || t('chat.deletedUser')}</span>
                    <span className="text-[11px] text-muted shrink-0">{c.lastMessage ? chatTime(c.lastMessage.at, lang) : ''}</span>
                  </span>
                  <span className="block text-xs text-pine font-medium truncate">{c.listing?.title || t('common.listingRemoved')}</span>
                  <span className="flex items-center gap-2 mt-0.5">
                    <span className={`flex-1 text-sm truncate ${c.unread ? 'text-ink font-medium' : 'text-muted'}`}>
                      {c.lastMessage ? `${mine ? t('chat.you') + ': ' : ''}${c.lastMessage.text}` : t('chat.startConversation')}
                    </span>
                    {c.unread > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center ltr-nums">{c.unread}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="p-8 text-center text-sm text-muted">{filter ? t('chat.noMatch') : t('chat.none')}</li>}
      </ul>
    </div>
  );
}

function Thread({ convo, onBack, onConversationUpdate }) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { subscribe, sendTyping, setMsgUnread } = useRealtime();
  const [messages, setMessages] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(convo.other?.online);
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);
  const textareaRef = useRef(null);

  const markRead = useCallback(() => {
    api.post(`/conversations/${convo.id}/read`).then(() => {
      onConversationUpdate(convo.id, { unread: 0 });
      api.get('/conversations/unread-count').then((r) => setMsgUnread(r.data.count)).catch(() => {});
    }).catch(() => {});
  }, [convo.id, onConversationUpdate, setMsgUnread]);

  useEffect(() => {
    let cancelled = false;
    setMessages(null);
    setOtherTyping(false);
    setOtherOnline(convo.other?.online);
    stickToBottom.current = true;
    api.get(`/conversations/${convo.id}/messages`, { params: { limit: 40 } }).then((r) => {
      if (cancelled) return;
      setMessages(r.data.items);
      setHasMore(r.data.hasMore);
      markRead();
    }).catch((err) => toast.error(apiError(err)));
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [convo.id]);

  // live events
  useEffect(() => {
    const offMsg = subscribe('message:new', ({ conversationId, message }) => {
      if (conversationId !== convo.id) return;
      setMessages((prev) => {
        if (!prev) return prev;
        if (prev.some((m) => m.id === message.id)) return prev;
        if (message.senderId === user.id) {
          const i = prev.findIndex((m) => m.pending && m.text === message.text);
          if (i >= 0) { const copy = [...prev]; copy[i] = message; return copy; }
        }
        return [...prev, message];
      });
      if (message.senderId !== user.id) {
        setOtherTyping(false);
        markRead();
      }
    });
    const offRead = subscribe('conversation:read', ({ conversationId, readerId, readAt }) => {
      if (conversationId !== convo.id || readerId === user.id) return;
      setMessages((prev) => prev?.map((m) => (m.senderId === user.id && !m.readAt ? { ...m, readAt } : m)));
    });
    const offTyping = subscribe('typing', ({ conversationId, userId, isTyping }) => {
      if (conversationId !== convo.id || userId === user.id) return;
      setOtherTyping(isTyping);
      clearTimeout(typingTimer.current);
      if (isTyping) typingTimer.current = setTimeout(() => setOtherTyping(false), 4000);
    });
    const offPresence = subscribe('presence', ({ userId, online }) => {
      if (userId === convo.other?.id) setOtherOnline(online);
    });
    return () => { offMsg(); offRead(); offTyping(); offPresence(); clearTimeout(typingTimer.current); };
  }, [convo.id, convo.other?.id, subscribe, user.id, markRead]);

  // keep scrolled to bottom when new messages arrive (unless reading history)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, otherTyping]);

  function onScroll() {
    const el = scrollRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function loadOlder() {
    if (!messages?.length) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el.scrollHeight;
    try {
      const { data } = await api.get(`/conversations/${convo.id}/messages`, { params: { before: messages[0].createdAt, limit: 40 } });
      stickToBottom.current = false;
      setMessages((prev) => [...data.items, ...prev]);
      setHasMore(data.hasMore);
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prevHeight; });
    } finally {
      setLoadingOlder(false);
    }
  }

  function onType(v) {
    setText(v);
    const now = Date.now();
    if (v && now - lastTypingSent.current > 2000) {
      sendTyping(convo.id, true);
      lastTypingSent.current = now;
    }
    if (!v) sendTyping(convo.id, false);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`; }
  }

  async function send(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    const temp = { id: `tmp-${Date.now()}`, senderId: user.id, text: body, createdAt: new Date().toISOString(), pending: true };
    stickToBottom.current = true;
    setMessages((prev) => [...(prev || []), temp]);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    sendTyping(convo.id, false);
    lastTypingSent.current = 0;
    try {
      const { data } = await api.post(`/conversations/${convo.id}/messages`, { text: body });
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev.filter((m) => m.id !== temp.id);
        return prev.map((m) => (m.id === temp.id ? data : m));
      });
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)));
      toast.error(apiError(err));
    }
  }

  const lastMineRead = useMemo(() => {
    if (!messages) return null;
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].senderId === user.id && messages[i].readAt) return messages[i].id;
    return null;
  }, [messages, user.id]);

  const other = convo.other;
  const status = otherTyping ? t('chat.typing') : otherOnline ? t('chat.online') : other?.lastSeenAt ? t('chat.lastSeen', { when: timeAgo(other.lastSeenAt, lang) }) : '';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-surface">
        <button onClick={onBack} className="md:hidden btn btn-ghost btn-icon -ms-2" aria-label={t('common.back')}><ArrowLeft className="w-5 h-5 rtl:rotate-180" /></button>
        <Link to={other ? `/users/${other.id}` : '#'}><Avatar name={other?.name || '?'} src={other?.avatar} online={otherOnline} /></Link>
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate flex items-center gap-1">{other?.name} {other?.isVerified && <BadgeCheck className="w-4 h-4 text-pine" />}</p>
          <p className={`text-xs ${otherTyping ? 'text-pine font-semibold' : 'text-muted'}`}>{status || (other ? t(`role.${other.role}`) : '')}</p>
          {/* Where the listing card has no room (phones, and the narrow thread column on tablets),
              show which home this chat is about as a small link instead. */}
          {convo.listing && (
            <Link to={`/listings/${convo.listing.id}`} className="sm:hidden md:block lg:hidden mt-0.5 block text-xs font-semibold text-pine truncate hover:underline">
              {convo.listing.title}
            </Link>
          )}
        </div>
        {convo.listing && (
          <Link to={`/listings/${convo.listing.id}`} className="hidden sm:flex md:hidden lg:flex min-w-0 shrink items-center gap-2.5 p-1.5 pe-3 rounded-xl border border-line hover:bg-sunken max-w-[260px]">
            <img src={mediaUrl(convo.listing.cover)} alt="" className="w-10 h-10 shrink-0 rounded-lg object-cover bg-sunken" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold truncate">{convo.listing.title}</span>
              <span className="block text-xs text-muted ltr-nums">{formatRent(convo.listing.rent)}</span>
            </span>
          </Link>
        )}
      </div>

      {/* messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5 bg-[linear-gradient(180deg,var(--color-canvas),#fff)]">
        {messages === null ? (
          <div className="h-full flex items-center justify-center text-pine"><Spinner className="w-7 h-7" /></div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {hasMore && (
              <div className="text-center mb-4">
                <button onClick={loadOlder} className="btn btn-secondary btn-sm" disabled={loadingOlder}>{loadingOlder ? <Spinner className="w-4 h-4" /> : t('chat.loadOlder')}</button>
              </div>
            )}
            {messages.length === 0 && (
              <div className="text-center py-16 text-muted">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 text-pine" />
                <p className="font-semibold text-ink">{t('chat.sayHello', { name: other?.name?.split(' ')[0] || '' })}</p>
                <p className="text-sm mt-1">{t('chat.safety')}</p>
              </div>
            )}
            {messages.map((m, i) => {
              const mine = m.senderId === user.id;
              const prev = messages[i - 1];
              const showDay = !prev || !sameDay(prev.createdAt, m.createdAt);
              const grouped = prev && prev.senderId === m.senderId && !showDay && new Date(m.createdAt) - new Date(prev.createdAt) < 5 * 60 * 1000;
              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="flex justify-center my-4">
                      <span className="text-[11px] font-semibold text-muted bg-sunken rounded-full px-3 py-1">{formatDate(m.createdAt, lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </div>
                  )}
                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : 'mt-3'}`}>
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] px-3.5 py-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                        mine ? 'bg-pine text-white rounded-2xl rounded-ee-md' : 'bg-surface border border-line text-ink rounded-2xl rounded-es-md'
                      } ${m.failed ? 'opacity-60 ring-2 ring-danger' : ''}`}
                    >
                      {m.text}
                      <span className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>
                        {chatTime(m.createdAt, lang)}
                        {mine && (m.pending ? <Clock className="w-3 h-3" /> : m.readAt ? <CheckCheck className="w-3.5 h-3.5 text-[#9FE3D6]" /> : <Check className="w-3.5 h-3.5" />)}
                      </span>
                    </div>
                  </div>
                  {mine && m.id === lastMineRead && i === messages.length - 1 && (
                    <p className="text-end text-[11px] text-muted mt-1">{t('chat.seen')}</p>
                  )}
                </div>
              );
            })}
            {otherTyping && (
              <div className="flex mt-3">
                <div className="bg-surface border border-line rounded-2xl rounded-es-md px-4 py-3 flex gap-1">
                  {[0, 1, 2].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* composer */}
      <form onSubmit={send} className="border-t border-line bg-surface p-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            maxLength={2000}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            onBlur={() => sendTyping(convo.id, false)}
            placeholder={t('chat.placeholder')}
            className="input flex-1 resize-none py-3 min-h-[2.9rem] max-h-40 rounded-2xl"
            aria-label={t('chat.placeholder')}
          />
          <button className="btn btn-primary btn-icon w-12 h-12 rounded-2xl shrink-0" disabled={!text.trim()} aria-label={t('chat.send')}>
            <Send className="w-5 h-5 rtl:-scale-x-100" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Messages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { subscribe } = useRealtime();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('');
  const [single, setSingle] = useState(null); // convo opened by id that isn't in the list yet
  useDocumentTitle(t('nav.messages'));

  useEffect(() => {
    api.get('/conversations').then((r) => setItems(r.data)).catch((err) => { toast.error(apiError(err)); setItems([]); });
  }, []);

  useEffect(() => {
    if (!id || !items || items.some((c) => c.id === id)) return;
    api.get(`/conversations/${id}`).then((r) => setSingle(r.data)).catch(() => navigate('/messages', { replace: true }));
  }, [id, items, navigate]);

  // Keep the list fresh when messages arrive anywhere.
  useEffect(
    () =>
      subscribe('message:new', ({ conversation }) => {
        setItems((prev) => {
          if (!prev) return prev;
          const rest = prev.filter((c) => c.id !== conversation.id);
          const updated = conversation.id === id ? { ...conversation, unread: 0 } : conversation;
          return [updated, ...rest];
        });
      }),
    [subscribe, id],
  );
  useEffect(
    () => subscribe('presence', ({ userId, online }) => setItems((prev) => prev?.map((c) => (c.other?.id === userId ? { ...c, other: { ...c.other, online } } : c)))),
    [subscribe],
  );

  const onConversationUpdate = useCallback((cid, patch) => {
    setItems((prev) => prev?.map((c) => (c.id === cid ? { ...c, ...patch } : c)));
  }, []);

  const active = items?.find((c) => c.id === id) || (single?.id === id ? single : null);

  return (
    <div className="h-[calc(100dvh-64px)] md:h-[calc(100dvh-72px)] max-w-[1400px] mx-auto md:px-6 md:py-6">
      <div className="h-full md:border md:border-line md:rounded-[1.25rem] md:shadow-card md:overflow-hidden grid md:grid-cols-[340px_1fr] lg:grid-cols-[380px_1fr] bg-surface">
        <aside className={`${id ? 'hidden md:flex' : 'flex'} flex-col min-h-0 md:border-e border-line`}>
          {items === null ? (
            <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
          ) : (
            <ConversationList items={items} activeId={id} onPick={(cid) => navigate(`/messages/${cid}`)} filter={filter} setFilter={setFilter} />
          )}
        </aside>
        <section className={`${id ? 'flex' : 'hidden md:flex'} flex-col min-h-0 min-w-0`}>
          {active ? (
            <Thread key={active.id} convo={active} onBack={() => navigate('/messages')} onConversationUpdate={onConversationUpdate} />
          ) : id ? (
            <div className="flex-1 flex items-center justify-center text-pine"><Spinner className="w-7 h-7" /></div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-16 h-16 rounded-2xl bg-pine-50 text-pine flex items-center justify-center"><MessageCircle className="w-8 h-8" /></div>
              <p className="mt-4 text-lg font-bold">{t('chat.pickTitle')}</p>
              <p className="text-ink-2 mt-1 max-w-sm">{t('chat.pickText')}</p>
              <Link to="/listings" className="btn btn-secondary mt-6">{t('nav.browse')}</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
