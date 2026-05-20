// src/lib/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi, setToken, clearToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load, try to restore session via refresh token cookie
  // useEffect(() => {
  //   authApi.refresh()
  //     .then(data => {
  //       setToken(data.accessToken);
  //       // Decode user from token payload (base64 middle segment)
  //       const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
  //       setUser({ id: payload.sub, email: payload.email });
  //     })
  //     .catch(() => {
  //       // No valid session — that's fine, user needs to log in
  //     })
  //     .finally(() => setLoading(false));
  // }, []);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.accessToken) {
          setToken(data.accessToken);
          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          setUser({ id: payload.sub, email: payload.email });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await authApi.login({ email, password });
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }

  async function register(formData) {
    const data = await authApi.register(formData);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await authApi.logout();
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
