import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBaseUrl } from '../utils/baseUrl';
// New style: access token stays in memory (not localStorage) (HttpOnly, same‑site cookie.)

import { setAccessToken, apiFetch } from '../services/auth';

function resetViewport() {

  // Force reflow
  window.scrollTo(0, 0);

  document.body.style.transform = "1";
  document.body.style.transformOrigin = "top left";
  document.body.style.width = "100%";
  document.body.style.height = "100%";
}

export default function Authentication() {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '', email: '', address: '', password1: '', password2: ''
  });
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {

    e.preventDefault();
    setErrorText('');
    setSubmitting(true);
    try {
      const res = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username.trim(),
          password: loginForm.password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Login failed');

      // Keep access token only in memory
      setAccessToken(data.access_token || null);

      // Store non-sensitive user info in localStorage for layout and visuals
      localStorage.setItem('role', data.role || 'client');
      localStorage.setItem('username', data.username || 'Guest');
      localStorage.setItem('verified', data.verified ? 'true' : 'false');

      // After storing tokens/role etc
      resetViewport();

      // Small delay can help some Android devices apply the change
      setTimeout(() => resetViewport(), 50);

      navigate('/copelands/home');

    } catch (err) {
      setErrorText(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setErrorText('');
    setSuccessText('');
    setSubmitting(true);
    try {
      const res = await apiFetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerForm.username.trim(),
          email: registerForm.email.trim(),
          address: registerForm.address,
          password: registerForm.password1,
          password2: registerForm.password2,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Registration failed');
      setSuccessText('Registration successful! Awaiting verification.');
      setMode('login');
    } catch (err) {
      setErrorText(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="w-full flex items-center justify-center">
        <div className="auth-box">
          <div className="auth-logo">
            <img
              src={getBaseUrl('/static/img/DRlogo.png')}
              alt="Logo"
              className="mx-auto"
            />
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="formStyle">
              <input
                type="text"
                placeholder="Username"
                value={loginForm.username}
                onChange={(e) => setLoginForm((s) => ({ ...s, username: e.target.value }))}
                required
                className="inputStyle"
                autoComplete="username"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((s) => ({ ...s, password: e.target.value }))}
                required
                className="inputStyle"
                autoComplete="current-password"
              />

              <button type="submit" className="buttonStyle" disabled={submitting}>
                {submitting ? 'Logging in…' : 'Login'}
              </button>

              <div className="my-2" />

              <button
                type="button"
                onClick={() => { setMode('register'); setErrorText(''); setSuccessText(''); }}
                className="buttonStyle"
                disabled={submitting}
              >
                Register as client
              </button>

              {errorText && <div className="auth-error">{errorText}</div>}
            </form>
          ) : (
            <form onSubmit={handleRegister} className="formStyle">
              <input
                placeholder="Username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm((s) => ({ ...s, username: e.target.value }))}
                required
                className="inputStyle"
                autoComplete="username"
              />
              <input
                placeholder="Email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((s) => ({ ...s, email: e.target.value }))}
                required
                className="inputStyle"
                autoComplete="email"
              />
              <input
                placeholder="Address"
                value={registerForm.address}
                onChange={(e) => setRegisterForm((s) => ({ ...s, address: e.target.value }))}
                required
                className="inputStyle"
                autoComplete="street-address"
              />
              <input
                type="password"
                placeholder="Password"
                value={registerForm.password1}
                onChange={(e) => setRegisterForm((s) => ({ ...s, password1: e.target.value }))}
                required
                className="inputStyle"
                autoComplete="new-password"
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={registerForm.password2}
                onChange={(e) => setRegisterForm((s) => ({ ...s, password2: e.target.value }))}
                required
                className="inputStyle"
                autoComplete="new-password"
              />

              <button type="submit" className="buttonStyle" disabled={submitting}>
                {submitting ? 'Registering…' : 'Register'}
              </button>

              <div className="my-2" />

              <button
                type="button"
                onClick={() => { setMode('login'); setErrorText(''); setSuccessText(''); }}
                className="buttonStyle"
                disabled={submitting}
              >
                Cancel
              </button>

              {errorText && <div className="auth-error">{errorText}</div>}
              {successText && <div className="auth-success">{successText}</div>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
