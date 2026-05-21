// src/lib/api.js
// Central API client. All fetch calls go through here.
// Why centralize? One place to handle auth headers, token refresh, and errors.
// Route handlers never call fetch directly — they import from here.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// In-memory token storage.
// Why not localStorage? XSS can read localStorage. Memory is safer for access tokens.
// The refresh token lives in an httpOnly cookie (server-managed).
let accessToken = null;

export function setToken(token) {
  accessToken = token;
}

export function clearToken() {
  accessToken = null;
}

// Core fetch wrapper — attaches auth header and handles 401 → refresh flow
async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',  // Needed to send httpOnly refresh cookie
  });

  // If access token expired, try to refresh once then retry
  if (res.status === 401) {
    let body = {};
    try {
      body = await res.clone().json();
    } catch {
      body = {};
    }

    if (body.code === 'TOKEN_EXPIRED') {
      const refreshed = await tryRefresh();

      if (refreshed) {
        // Retry original request with new token
        return request(path, options);
      }
    }

    // Not refreshable — clear token, redirect to login
    clearToken();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

async function tryRefresh() {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) return null;

    const data = await res.json();

    if (data.accessToken) {
      setToken(data.accessToken);
      return data.accessToken;
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login:    (data) => request('/auth/login',    { method: 'POST', body: JSON.stringify(data) }),
  logout:   ()     => request('/auth/logout',   { method: 'POST' }),
  refresh:  ()     => tryRefresh(),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = {
  browse:      (params = {}) => request(`/users?${new URLSearchParams(params)}`),
  getById:     (id)          => request(`/users/${id}`),
  updateMe:    (data)        => request('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  addSkill:    (data)        => request('/users/me/skills', { method: 'POST', body: JSON.stringify(data) }),
  deleteSkill: (skillId)     => request(`/users/me/skills/${skillId}`, { method: 'DELETE' }),
};

// ─── Connections ──────────────────────────────────────────────────────────────
export const connections = {
  send:    (data) => request('/connections', { method: 'POST', body: JSON.stringify(data) }),
  respond: (id, status) => request(`/connections/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  mine:    (type = 'received') => request(`/connections/me?type=${type}`),
};

// ─── Groups ───────────────────────────────────────────────────────────────────
export const groups = {
  browse:        ()               => request('/groups'),
  getById:       (id)             => request(`/groups/${id}`),
  create:        (data)           => request('/groups', { method: 'POST', body: JSON.stringify(data) }),
  update:        (id, data)       => request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  join:          (groupId)        => request(`/groups/${groupId}/join`, { method: 'POST' }),
  respondMember: (groupId, userId, status) =>
    request(`/groups/${groupId}/members/${userId}/respond`, { method: 'PUT', body: JSON.stringify({ status }) }),
  promoteMember: (groupId, userId) =>
    request(`/groups/${groupId}/members/${userId}/promote`, { method: 'PUT' }),
};