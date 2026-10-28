// context/AuthContext.jsx — who is logged in.
// The JWT lives in an httpOnly cookie, so on page load we simply ask the
// backend "who am I?" (GET /auth/me). Nothing is stored in localStorage.
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import api, { onSessionExpired } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false); // false until we know if someone is logged in

  useEffect(() => {
    onSessionExpired(() => setUser(null));
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setUser(data.user);
    return data.user;
  }, []);

  /** Brand-new Google users get { needsProfile, profile } back; everyone else is logged in. */
  const googleLogin = useCallback(async (payload) => {
    const { data } = await api.post('/auth/google', payload);
    if (data.needsProfile) return data;
    setUser(data.user);
    return { user: data.user };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* still log out locally */ }
    setUser(null);
  }, []);

  const updateUser = useCallback((fresh) => setUser(fresh), []);

  const toggleSaved = useCallback((listingId, saved) => {
    setUser((u) => {
      if (!u) return u;
      const ids = new Set(u.savedListings || []);
      if (saved) ids.add(listingId);
      else ids.delete(listingId);
      return { ...u, savedListings: [...ids] };
    });
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, googleLogin, logout, updateUser, toggleSaved }),
    [user, ready, login, register, googleLogin, logout, updateUser, toggleSaved],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
