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
      navigate('/copelands/reacthome');
    } else {
      setErrorText('Login failed.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorText('');
    setSuccessText('');
    const res = await fetch(getBaseUrl('/copelands/api/register'), {
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
    <div style={boxStyle}>
        <img
        src={getBaseUrl('/static/img/DRlogo.png')}
        alt="Logo"
        style={{ maxWidth: 320, marginBottom: 20 }}
      />
      {mode === 'login' ? (
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <input
            type="text"
            placeholder="Email"
            value={login.username}
            onChange={e => setLogin(l => ({ ...l, username: e.target.value }))}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={login.password}
            onChange={e => setLogin(l => ({ ...l, password: e.target.value }))}
            required
            style={inputStyle}
          />
          <div style={{ display: 'flex', marginBottom: 20, fontSize: 14 }}>
            <label htmlFor="remember">Remember me</label>
            <input type="checkbox" id="remember" style={{ marginLeft: 8 }} />
          </div>
          <button type="submit" style={buttonStyle}>Login</button>
          <br /><br />
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorText(''); setSuccessText(''); }}
            style={buttonStyle}
          >
            Register as client
          </button>
          {errorText && <div style={errorStyle}>{errorText}</div>}
        </form>
      ) : (
        <form onSubmit={handleRegister} style={{ width: '100%' }}>
          <input
            placeholder="Username"
            value={register.username}
            onChange={e => setRegister(r => ({ ...r, username: e.target.value }))}
            required style={inputStyle}
          />
          <input
            placeholder="Email"
            value={register.email}
            onChange={e => setRegister(r => ({ ...r, email: e.target.value }))}
            required style={inputStyle}
          />
          <input
            placeholder="Address"
            value={register.address}
            onChange={e => setRegister(r => ({ ...r, address: e.target.value }))}
            required style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={register.password1}
            onChange={e => setRegister(r => ({ ...r, password1: e.target.value }))}
            required style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={register.password2}
            onChange={e => setRegister(r => ({ ...r, password2: e.target.value }))}
            required style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>Register</button>
          <br /><br />
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorText(''); setSuccessText(''); }}
            style={buttonStyle}
          >
            Cancel
          </button>
          {errorText && <div style={errorStyle}>{errorText}</div>}
          {successText && <div style={successStyle}>{successText}</div>}
        </form>
      )}
    </div>
  );
}

const boxStyle = {
  marginTop: 24,
  background: '#fff',
  borderRadius: 20,
  padding: '32px 40px',
  width: 320,
  boxShadow: '0 0 30px rgba(0,0,0,0.10)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const inputStyle = {
  width: '100%',
  padding: 12,
  marginBottom: 14,
  border: '1px solid #ccc',
  borderRadius: 8,
  fontSize: 14,
};

const buttonStyle = {
  width: '100%',
  padding: 12,
  backgroundColor: '#2f2f6f',
  color: 'white',
  fontSize: 16,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 500,
};

const errorStyle = {
  color: 'red',
  fontSize: 14,
  marginTop: 10,
};

const successStyle = {
  color: 'green',
  fontSize: 14,
  marginTop: 10,
};