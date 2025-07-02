import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBaseUrl } from '../utils/baseUrl';


export default function Authentication() {
  const [mode, setMode] = useState('login');
  const [login, setLogin] = useState({ username: '', password: '' });
  const [register, setRegister] = useState({
    username: '', email: '', address: '', password1: '', password2: ''
  });
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const navigate = useNavigate();



  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorText('');
    const res = await fetch(getBaseUrl('/api/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username: login.username, password: login.password }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('id', data.id);
      localStorage.setItem('role', data.role);
      navigate('/copelands/home');
    } else {
      setErrorText('Login failed.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorText('');
    setSuccessText('');
    const res = await fetch(getBaseUrl('/api/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: register.username,
        email: register.email,
        company: register.address,
        password: register.password1,
        password2: register.password2,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSuccessText('Registration successful! Awaiting verification.');
    } else {
      setErrorText(data.error || 'Registration failed.');
    }
  };
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
                placeholder="Email"
                value={login.username}
                onChange={e => setLogin(l => ({ ...l, username: e.target.value }))}
                required
                className="inputStyle"
              />
              <input
                type="password"
                placeholder="Password"
                value={login.password}
                onChange={e => setLogin(l => ({ ...l, password: e.target.value }))}
                required
                className="inputStyle"
              />
              <div className="auth-checkbox-row">
                <label htmlFor="remember">Remember me</label>
                <input type="checkbox" id="remember" className="ml-2" />
              </div>
              <button type="submit" className="buttonStyle">Login</button>
              <div className="my-2" />
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorText(''); setSuccessText(''); }}
                className="buttonStyle"
              >
                Register as client
              </button>
              {errorText && (
                <div className="auth-error">{errorText}</div>
              )}
            </form>
          ) : (
            <form onSubmit={handleRegister} className="formStyle">
              <input
                placeholder="Username"
                value={register.username}
                onChange={e => setRegister(r => ({ ...r, username: e.target.value }))}
                required className="inputStyle"
              />
              <input
                placeholder="Email"
                value={register.email}
                onChange={e => setRegister(r => ({ ...r, email: e.target.value }))}
                required className="inputStyle"
              />
              <input
                placeholder="Address"
                value={register.address}
                onChange={e => setRegister(r => ({ ...r, address: e.target.value }))}
                required className="inputStyle"
              />
              <input
                type="password"
                placeholder="Password"
                value={register.password1}
                onChange={e => setRegister(r => ({ ...r, password1: e.target.value }))}
                required className="inputStyle"
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={register.password2}
                onChange={e => setRegister(r => ({ ...r, password2: e.target.value }))}
                required className="inputStyle"
              />
              <button type="submit" className="buttonStyle">Register</button>
              <div className="my-2" />
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorText(''); setSuccessText(''); }}
                className="buttonStyle"
              >
                Cancel
              </button>
              {errorText && (
                <div className="auth-error">{errorText}</div>
              )}
              {successText && (
                <div className="auth-success">{successText}</div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
