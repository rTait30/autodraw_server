// src/services/auth.js
const RAW_API_BASE =
  import.meta.env.VITE_API_BASE ??
  "http://127.0.0.1:5001/copelands/api";

// --- helpers ---------------------------------------------------------------
const ensureProtocol = (u) => (/^https?:\/\//i.test(u) ? u : `http://${u}`);
const stripTrailingSlash = (u) => u.replace(/\/+$/, "");
const join = (base, path) =>
  `${stripTrailingSlash(base)}/${String(path || "").replace(/^\/+/, "")}`;

const API_BASE = stripTrailingSlash(ensureProtocol(RAW_API_BASE));
// e.g. "http://127.0.0.1:5001/copelands/api"
const API_ORIGIN = new URL(API_BASE).origin;
// e.g. "http://127.0.0.1:5001"

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

const getCookie = (name) =>
  document.cookie.split("; ").find(r => r.startsWith(name + "="))?.split("=")[1];

export async function refresh() {
  try {
    const csrf = getCookie("csrf_refresh_token"); // if JWT_COOKIE_CSRF_PROTECT=True
    const res = await fetch(join(API_BASE, "/refresh"), {
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

  const url = join(API_BASE, path);
  // console.debug("apiFetch →", url);

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  // One retry on 401 if refresh() succeeds
  if (res.status === 401 && !_retried && await refresh()) {
    return apiFetch(path, options, true);
  }

  if (res.ok) return res;

  // Throw friendly error message
  let message = `HTTP ${res.status}`;
  try {
    const data = await res.clone().json();
    message = data.error || data.message || JSON.stringify(data);
  } catch {
    try {
      const text = await res.text();
      if (text) message = text;
    } catch { /* ignore */ }
  }

  const err = new Error(message);
  err.status = res.status;
  err.response = res;
  throw err;
}

export async function login(username, password) {
  const res = await fetch(join(API_ORIGIN, "/login"), {
    method: "POST",
    credentials: "include", // sets the HttpOnly refresh cookie
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  setAccessToken(data.access_token); // keep in memory only
  return data; // { id, username, role, verified, ... }
}

export async function logout() {
  await fetch(join(API_BASE, "/logout"), { method: "POST", credentials: "include" });
  setAccessToken(null);
}

export async function bootstrapSession() {
  await refresh(); // mint an access token from the cookie on app load (if present)
}

// Optional: export the resolved bases for debugging or other services
export { API_BASE, API_ORIGIN };
