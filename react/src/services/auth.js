// src/services/auth.js
const API_BASE = import.meta.env.VITE_API_BASE ?? "/copelands/api";

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

const getCookie = (name) =>
  document.cookie.split("; ").find(r => r.startsWith(name + "="))?.split("=")[1];

export async function refresh() {
  try {
    const csrf = getCookie("csrf_refresh_token"); // if JWT_COOKIE_CSRF_PROTECT=True
    const res = await fetch(`${API_BASE}/refresh`, {
      method: "POST",
      credentials: "include",
      headers: csrf ? { "X-CSRF-TOKEN": csrf } : {}
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.access_token ?? null);
    return !!data.access_token;
  } catch {
    setAccessToken(null);
    return false;
  }
}

export async function apiFetch(path, options = {}, _retried = false) {
  const headers = { ...(options.headers || {}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers
  });
  if (res.status === 401 && !_retried && await refresh()) {
    return apiFetch(path, options, true); // retry once with fresh token
  }
  return res;
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    credentials: "include", // sets the HttpOnly refresh cookie
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  setAccessToken(data.access_token); // keep in memory only
  return data; // { id, username, role, verified }
}

export async function logout() {
  await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
  setAccessToken(null);
}

export async function bootstrapSession() {
  await refresh(); // mint an access token from the cookie on app load (if present)
}
