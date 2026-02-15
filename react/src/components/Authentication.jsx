import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import CollapsibleCard from './CollapsibleCard';
import { getBaseUrl } from '../utils/baseUrl';
import { TextInput } from './FormUI';
// New style: access token stays in memory (not localStorage) (HttpOnly, same‑site cookie.)

import { setAccessToken, apiFetch, refresh } from '../services/auth';

import { Button } from './UI';

function resetViewport() {

  // Force reflow
  window.scrollTo(0, 0);

  document.body.style.transform = "1";
  document.body.style.transformOrigin = "top left";
  document.body.style.width = "100%";
  document.body.style.height = "100%";
}

export default function Authentication({ onAuthSuccess, onCancel }) {
  const darkMode = useSelector(state => state.toggles.darkMode);
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '', email: '', address: '', password1: '', password2: ''
  });
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();

  // Auto-login check on mount
  useEffect(() => {
    async function checkExistingSession() {
      console.log("[Authentication] Checking for existing session...");
      const success = await refresh();
      if (success) {
        if (onAuthSuccess) {
            console.log("[Authentication] Existing session found. Calling onSuccess.");
            onAuthSuccess();
            return;
        }
        console.log("[Authentication] Existing session found. Redirecting to projects.");
        const draftStr = localStorage.getItem('autodraw_draft');
        let destination = '/copelands/projects';
        if (draftStr) {
          try {
            const draft = JSON.parse(draftStr);
            if (draft.from === 'discrepancy') {
                destination = '/copelands/discrepancy';
            }
          } catch(e) {}
        }
        navigate(destination);
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
        skipRefresh: true,
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

      if (onAuthSuccess) {
        onAuthSuccess();
        return;
      }

      const draftStr = localStorage.getItem('autodraw_draft');
      let destination = '/copelands/projects';
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          if (draft.from === 'discrepancy') {
              destination = '/copelands/discrepancy';
          }
        } catch(e) {}
      }
      navigate(destination);

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
      // Check if username is essentially an email
      const isEmailUser = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.username);
      console.log('[Register] Username:', registerForm.username, 'Is Email:', isEmailUser);

      const res = await apiFetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerForm.username.trim(),
          email: (isEmailUser ? registerForm.username : registerForm.email).trim(),
          address: registerForm.address,
          password: registerForm.password1,
          password2: registerForm.password2,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Registration failed');

      // Attempt immediate login
      try {
        const loginRes = await apiFetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: registerForm.username.trim(),
            password: registerForm.password1,
          }),
          skipRefresh: true,
        });

        const loginData = await loginRes.json();

        // Login success logic
        setAccessToken(loginData.access_token || null);
        localStorage.setItem('role', loginData.role || 'client');
        localStorage.setItem('username', loginData.username || 'Guest');
        localStorage.setItem('verified', loginData.verified ? 'true' : 'false');

        resetViewport();
        
        if (onAuthSuccess) {
            onAuthSuccess();
            return;
        }

        const draftStr = localStorage.getItem('autodraw_draft');
        let destination = '/copelands/projects';
        if (draftStr) {
          try {
            const draft = JSON.parse(draftStr);
            if (draft.from === 'discrepancy') {
                destination = '/copelands/discrepancy';
            }
          } catch(e) {}
        }

        if (onAuthSuccess) {
            onAuthSuccess();
            // Don't navigate if handling inline
            return;
        }

        setTimeout(() => {
          resetViewport();
          navigate(destination);
        }, 50);

      } catch (loginErr) {
        // Registration worked, but auto-login failed
        setSuccessText('Registration successful! Please log in.');
        setMode('login');
      }

    } catch (err) {
      setErrorText(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full flex flex-col items-center p-4">
          <div className="flex justify-center w-full mb-4">
            <img
              src={getBaseUrl(`/static/img/${darkMode ? 'WhiteLogos.png' : 'BlackLogos.png'}`)}
              alt="Logo"
              className="mx-auto max-h-16"
            />
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4">
              <div className="w-full">
                <div className="space-y-4">
                  <TextInput
                    id="login-username"
                    label="Username/Email (Required)"
                    name="username"
                    className="text-base"
                    value={loginForm.username}
                    onChange={(val) => setLoginForm((s) => ({ ...s, username: val }))}
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />

                  <TextInput
                    id="login-password"
                    label="Password (Required)"
                    name="password"
                    type="password"
                    className="text-base"
                    value={loginForm.password}
                    onChange={(val) => setLoginForm((s) => ({ ...s, password: val }))}
                    required
                    autoComplete="current-password"
                  />
                  
                  <div className="mt-1">
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline focus:outline-none"
                      onClick={() => setShowForgotPassword(!showForgotPassword)}
                    >
                      I forgot my password
                    </button>
                    {showForgotPassword && (
                      <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                        <p className="mb-1">
                          Please call <a href="tel:0466185676" className="text-blue-600 font-medium">0466 185 676</a>
                        </p>
                        <p>
                          or email <a href="mailto:rtait@drgroup.com.au" className="text-blue-600 font-medium">rtait@drgroup.com.au</a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <Button 
                  variant="submit" 
                  className="w-full" 
                  isLoading={submitting}
                >
                  Login
                </Button>

                <Button
                    type="button"
                    onClick={() => {
                      setRegisterForm(s => ({
                        ...s,
                        username: loginForm.username,
                        password1: '',
                        password2: ''
                      }));
                      setMode('register');
                      setSuccessText('');
                      setErrorText('');
                    }}
                    className="w-full"
                    variant="primary" 
                    disabled={submitting}
                  >
                    Register as client
                </Button>

                {onCancel && (
                  <Button
                    type="button"
                    onClick={onCancel}
                    className="w-full bg-red-600 hover:bg-red-700 text-white border-transparent"
                    variant="custom"
                  >
                    Cancel Login / Registration
                  </Button>
                )}
              </div>

              { errorText && <div className="auth-error mt-2">{errorText} </div> }

            </form>
            
          ) : (
            <form onSubmit={handleRegister} className="w-full max-w-sm flex flex-col gap-4">
              <div className="w-full">
                <div className="space-y-4">
                  <TextInput
                    id="signup-username"
                    label={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.username) ? "Email (Required)" : "Username (Required)"}
                    name="username"
                    className="text-red text-base"
                    value={registerForm.username}
                    onChange={(val) => {
                      const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
                      console.log('Username changed:', val, 'Looks like email:', looksLikeEmail);
                      setRegisterForm((s) => ({ ...s, username: val }));
                    }}
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  {/* If username looks like an email, we hide email field */}
                  {!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.username) && (
                    <TextInput
                      id="signup-email"
                      label="Email (Optional)"
                      name="email"
                      type="email"
                      className="text-base"
                      value={registerForm.email}
                      onChange={(val) => setRegisterForm((s) => ({ ...s, email: val }))}
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                  )}
                  <TextInput
                    id="signup-address"
                    label="Address (Optional)"
                    name="address"
                    className="text-base"
                    value={registerForm.address}
                    onChange={(val) => setRegisterForm((s) => ({ ...s, address: val }))}
                    autoComplete="street-address"
                  />
                  <TextInput
                    id="signup-password"
                    label="Password (Required)"
                    name="password"
                    type="password"
                    className="text-base"
                    value={registerForm.password1}
                    onChange={(val) => setRegisterForm((s) => ({ ...s, password1: val }))}
                    required
                    autoComplete="new-password"
                  />

                  {errorText && <div className="auth-error mb-1">{errorText}</div>}

                  <TextInput
                    id="signup-confirm-password"
                    label="Confirm Password (Required)"
                    name="confirm_password"
                    type="password"
                    className="text-base"
                    value={registerForm.password2}
                    onChange={(val) => setRegisterForm((s) => ({ ...s, password2: val }))}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <Button
                  variant="submit"
                  className="w-full"
                  disabled={submitting}
                  isLoading={submitting}
                >
                  Register
                </Button>

                <Button
                  type="button"
                  onClick={() => { setMode('login'); setErrorText(''); setSuccessText(''); }}
                  className="w-full"
                  disabled={submitting}
                  variant="primary"
                >
                  Back to Login
                </Button>

                {onCancel && (
                  <Button
                    type="button"
                    onClick={onCancel}
                    className="w-full bg-red-600 hover:bg-red-700 text-white border-transparent"
                    variant="custom"
                  >
                    Cancel Login / Registration
                  </Button>
                )}
              </div>

              {successText && <div className="auth-success mt-2">{successText}</div>}
            </form>
          )}
    </div>
  );
}
