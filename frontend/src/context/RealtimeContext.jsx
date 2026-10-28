// context/RealtimeContext.jsx — one Socket.IO connection per logged-in user.
// Provides live unread counters (notifications + messages), toasts for new
// notifications, and a tiny pub/sub so pages (e.g. Messages) can listen to events.
import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { API_ORIGIN } from '../api/client';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { notificationText } from '../lib/notifications';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifUnread, setNotifUnread] = useState(0);
  const [msgUnread, setMsgUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const listeners = useRef(new Map());
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const tRef = useRef(t);
  tRef.current = t;

  const emitLocal = useCallback((event, payload) => {
    for (const fn of listeners.current.get(event) || []) fn(payload);
  }, []);

  /** Subscribe to a socket event. Returns an unsubscribe function. */
  const subscribe = useCallback((event, fn) => {
    if (!listeners.current.has(event)) listeners.current.set(event, new Set());
    listeners.current.get(event).add(fn);
    return () => listeners.current.get(event)?.delete(fn);
  }, []);

  const refreshCounts = useCallback(async () => {
    try {
      const [n, m] = await Promise.all([api.get('/notifications/unread-count'), api.get('/conversations/unread-count')]);
      setNotifUnread(n.data.count);
      setMsgUnread(m.data.count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setNotifUnread(0);
      setMsgUnread(0);
      setConnected(false);
      return undefined;
    }

    refreshCounts();
    const socket = io(API_ORIGIN || undefined, {
      path: '/socket.io',
      withCredentials: true, // sends the login cookie
      transports: ['websocket', 'polling'],
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => { setConnected(true); refreshCounts(); });
    socket.on('disconnect', () => setConnected(false));

    socket.on('notification:new', ({ notification, unreadCount }) => {
      if (typeof unreadCount === 'number') setNotifUnread(unreadCount);
      else api.get('/notifications/unread-count').then((r) => setNotifUnread(r.data.count)).catch(() => {});
      emitLocal('notification:new', notification);
      // Don't toast chat messages if the user is already looking at that chat.
      const convoId = notification.data?.conversationId;
      if (notification.type === 'new_message' && convoId && pathRef.current.startsWith(`/messages/${convoId}`)) return;
      const { title, body } = notificationText(notification, tRef.current);
      toast(title, {
        description: body,
        action: notification.link ? { label: tRef.current('common.view'), onClick: () => navigate(notification.link) } : undefined,
      });
    });
    socket.on('notification:count', ({ unreadCount }) => setNotifUnread(unreadCount));

    socket.on('message:new', (payload) => {
      emitLocal('message:new', payload);
      api.get('/conversations/unread-count').then((r) => setMsgUnread(r.data.count)).catch(() => {});
    });
    socket.on('conversation:read', (p) => emitLocal('conversation:read', p));
    socket.on('typing', (p) => emitLocal('typing', p));
    socket.on('presence', (p) => emitLocal('presence', p));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  // Show unread count in the browser tab title.
  useEffect(() => {
    const total = notifUnread + msgUnread;
    const base = document.title.replace(/^\(\d+\)\s/, '');
    document.title = total > 0 ? `(${total}) ${base}` : base;
  }, [notifUnread, msgUnread, location.pathname]);

  const sendTyping = useCallback((conversationId, isTyping) => {
    socketRef.current?.emit('typing', { conversationId, isTyping });
  }, []);

  const queryPresence = useCallback(
    (ids) =>
      new Promise((resolve) => {
        const s = socketRef.current;
        if (!s?.connected) return resolve([]);
        s.timeout(4000).emit('presence:query', ids, (err, online) => resolve(err ? [] : online));
      }),
    [],
  );

  const value = useMemo(
    () => ({ connected, notifUnread, msgUnread, setNotifUnread, setMsgUnread, refreshCounts, subscribe, sendTyping, queryPresence }),
    [connected, notifUnread, msgUnread, refreshCounts, subscribe, sendTyping, queryPresence],
  );
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}
