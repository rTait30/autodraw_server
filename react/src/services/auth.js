// src/services/auth.js

// Build API base from current page host, hardcode :5001
const DEFAULT_PROTO = window.location.protocol.startsWith("https") ? "https" : "http";
const DEFAULT_HOST = window.location.hostname;
const DEFAULT_API_BASE = `${DEFAULT_PROTO}://${DEFAULT_HOST}:5001/copelands/api`;

const RAW_API_BASE = import.meta.env.VITE_API_BASE ?? DEFAULT_API_BASE;

// --- helpers ---------------------------------------------------------------
const ensureProtocol = (u) => (/^https?:\/\//i.test(u) ? u : `http://${u}`);
const stripTrailingSlash = (u) => u.replace(/\/+$/, "");
const join = (base, path) =>
  `${stripTrailingSlash(base)}/${String(path || "").replace(/^\/+/, "")}`;

const API_BASE = stripTrailingSlash(ensureProtocol(RAW_API_BASE));
const API_ORIGIN = new URL(API_BASE).origin;

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

const getCookie = (name) =>
  document.cookie.split("; ").find(r => r.startsWith(name + "="))?.split("=")[1];

export async function refresh() {
  try {
    const csrf = getCookie("csrf_refresh_token");
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

  let res;
  try {
    res = await fetch(url, { credentials: "include", ...options, headers });
  } catch (e) {
    const hint =
      window.location.protocol === "https:" && new URL(url).protocol === "http:"
        ? " Mixed content: your app is https but API is http."
        : "";
    const err = new Error(`Network error fetching ${url}.${hint}`);
    err.cause = e;
    throw err;
  }

  if (res.status === 401 && !_retried && await refresh()) {
    return apiFetch(path, options, true);
  }
  if (res.ok) return res;

  let message = `HTTP ${res.status}`;
  try {
    const data = await res.clone().json();
    message = data.error || data.message || JSON.stringify(data);
  } catch {
    try {
      const text = await res.text();
      if (text) message = text;
    } catch {}
  }

  const err = new Error(message);
  err.status = res.status;
  err.response = res;
  throw err;
}

export async function login(username, password) {
  // Use the same API_BASE to avoid path/origin mismatches
  const url = join(API_BASE, "/login");
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
  } catch (e) {
    const hint =
      window.location.protocol === "https:" && new URL(url).protocol === "http:"
        ? " Mixed content: your app is https but API is http."
        : "";
    throw new Error(`Network error during login.${hint}`);
  }

  if (!res.ok) {
    let msg = "Login failed";
    try {
      const d = await res.clone().json();
      msg = d.error || d.message || msg;
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  setAccessToken(data.access_token);
  return data;
}

export async function logout() {
  try {
    await fetch(join(API_BASE, "/logout"), { method: "POST", credentials: "include" });
  } finally {
    setAccessToken(null);
  }
}

export async function bootstrapSession() {
  await refresh();
}

export { API_BASE, API_ORIGIN };
