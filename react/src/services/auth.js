// src/services/auth.js
const API_BASE = import.meta.env.VITE_API_BASE ?? "/copelands/api";

let accessToken = null;
export const setAccessToken = (t) => { 
  if (t) console.log("[Auth] Access token updated (in-memory)");
  else console.log("[Auth] Access token cleared");
  accessToken = t; 
};
export const getAccessToken = () => {
  // console.log("[Auth] getAccessToken called", !!accessToken);
  return accessToken;
};

const getCookie = (name) =>
  document.cookie.split("; ").find(r => r.startsWith(name + "="))?.split("=")[1];

export async function refresh() {
  console.log("[Auth] Attempting value refresh...");
  try {
    const csrf = getCookie("csrf_refresh_token"); // if JWT_COOKIE_CSRF_PROTECT=True
    if (!csrf) console.warn("[Auth] No CSRF token found in cookies");
    
    const res = await fetch(`${API_BASE}/refresh`, {
      method: "POST",
      credentials: "include",
      headers: csrf ? { "X-CSRF-TOKEN": csrf } : {}
    });
    
    if (!res.ok) {
      console.error(`[Auth] Refresh failed: ${res.status}`);
      return false;
    }
    
    const data = await res.json();
    console.log("[Auth] Refresh successful");
    setAccessToken(data.access_token ?? null);
    return data;
  } catch (error) {
    console.error("[Auth] Refresh network error:", error);
    setAccessToken(null);
    return null;
  }
}

export async function apiFetch(path, options = {}, _retried = false) {
  const { skipRefresh, ...fetchOptions } = options;
  const headers = { ...(fetchOptions.headers || {}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  console.log(`[API] Req: ${path} | Retry: ${_retried}`);

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',  // preserve old behavior
    ...fetchOptions,
    headers,
  });

  // Preserve: one retry on 401 if refresh() succeeds
  // skipRefresh allows specific calls (like login) to handle 401s themselves
  if (res.status === 401 && !_retried && !skipRefresh) {
    console.warn("[API] 401 Unauthorized. Attempting refresh...");
    if (await refresh()) {
      console.log("[API] Refresh worked. Retrying original request...");
      // Re-fetch token from updated storage before retrying
      const newToken = getAccessToken();
      const newHeaders = { ...headers };
      if (newToken) newHeaders.Authorization = `Bearer ${newToken}`;
      
      const retryOptions = { ...options, headers: newHeaders };
      return apiFetch(path, retryOptions, true);
    } else {
      // Refresh failed (session > 14 days old). 
      // Force redirect so user isn't stuck on a zombie page.
      console.error("[API] Refresh failed or session expired. Redirecting to login.");
      setAccessToken(null);
      window.location.href = "/copelands/";
      throw new Error("Session expired. Redirecting...");
    }
  }

  // If OK, preserve old behavior: return the Response for caller to .json()/.blob()
  if (res.ok) return res;

  // New: throw a friendly error using server message (JSON or text)
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
