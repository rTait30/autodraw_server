import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBaseUrl } from '../utils/baseUrl';
import { TextInput, FormContainer } from './FormUI';
// New style: access token stays in memory (not localStorage) (HttpOnly, same‑site cookie.)

import { setAccessToken, apiFetch, refresh } from '../services/auth';

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

  // Auto-login check on mount
  useEffect(() => {
    async function checkExistingSession() {
      console.log("[Authentication] Checking for existing session...");
      const success = await refresh();
      if (success) {
        console.log("[Authentication] Existing session found. Redirecting to projects.");
        navigate('/copelands/projects');
      } else {
        console.log("[Authentication] No valid previous session found.");
      }
    }
    checkExistingSession();
  }, [navigate]);

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

      navigate('/copelands/projects');

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

      // Attempt immediate login
      const loginRes = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerForm.username.trim(),
          password: registerForm.password1,
        }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        // If login fails, fall back to showing success message on login screen
        setSuccessText('Registration successful! Please log in.');
        setMode('login');
        return;
      }

      // Login success logic
      setAccessToken(loginData.access_token || null);
      localStorage.setItem('role', loginData.role || 'client');
      localStorage.setItem('username', loginData.username || 'Guest');
      localStorage.setItem('verified', loginData.verified ? 'true' : 'false');

      resetViewport();
      setTimeout(() => resetViewport(), 50);

      navigate('/copelands/home');

    } catch (err) {
      setErrorText(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="w-full flex items-center justify-center">
        <div className="auth-box dark:bg-gray-800">
          <div className="auth-logo">
            <img
              src={getBaseUrl('/static/img/DRlogo.png')}
              alt="Logo"
              className="mx-auto"
            />
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="formStyle">

              <TextInput
                label="Username"
                value={loginForm.username}
                onChange={(val) => setLoginForm((s) => ({ ...s, username: val }))}
                required
                autoComplete="username"
              />

              <TextInput
                label="Password"
                type="password"
                value={loginForm.password}
                onChange={(val) => setLoginForm((s) => ({ ...s, password: val }))}
                required
                autoComplete="current-password"
              />

              <button type="submit" className="buttonStyle w-full mt-4" disabled={submitting}>
                {submitting ? 'Logging in…' : 'Login'}
              </button>

              <button
                  type="button"
                  onClick={() => {
                    setRegisterForm(s => ({
                      ...s,
                      username: loginForm.username,
                      password1: loginForm.password,
                      password2: ''
                    }));
                    setMode('register');
                    setSuccessText('');
                    if (loginForm.password) {
                      setErrorText('Please re-type your password below to confirm.');
                    } else {
                      setErrorText('');
                    }
                  }}
                  className="buttonStyle w-full"
                  disabled={submitting}
                >
                  Register as client
              </button>

              { errorText && <div className="auth-error">{errorText} </div> }

            </form>
            
          ) : (
            <form onSubmit={handleRegister} className="formStyle">
              <TextInput
                label="Username"
                value={registerForm.username}
                onChange={(val) => setRegisterForm((s) => ({ ...s, username: val }))}
                required
                autoComplete="username"
              />
              <TextInput
                label="Email"
                value={registerForm.email}
                onChange={(val) => setRegisterForm((s) => ({ ...s, email: val }))}
                autoComplete="email"
              />
              <TextInput
                label="Address"
                value={registerForm.address}
                onChange={(val) => setRegisterForm((s) => ({ ...s, address: val }))}
                autoComplete="street-address"
              />
              <TextInput
                label="Password"
                type="password"
                value={registerForm.password1}
                onChange={(val) => setRegisterForm((s) => ({ ...s, password1: val }))}
                required
                autoComplete="new-password"
              />

              {errorText && <div className="auth-error mb-2">{errorText}</div>}

              <TextInput
                label="Confirm Password"
                type="password"
                value={registerForm.password2}
                onChange={(val) => setRegisterForm((s) => ({ ...s, password2: val }))}
                required
                autoComplete="new-password"
              />

              <button type="submit" className="buttonStyle w-full mt-4" disabled={submitting}>
                {submitting ? 'Registering…' : 'Register'}
              </button>

              <button
                type="button"
                onClick={() => { setMode('login'); setErrorText(''); setSuccessText(''); }}
                className="buttonStyle w-full"
                disabled={submitting}
              >
                Cancel
              </button>

              {successText && <div className="auth-success">{successText}</div>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
