import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getBaseUrl } from '../utils/baseUrl';

function LoginForm({ onShowRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    //`url(${getStaticUrl('/api/login')})`

    const res = await fetch(getBaseUrl('/api/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password }),
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

  return (
    <form onSubmit={handleLogin} style={{ width: '100%' }}>
      <input
        type="text"
        placeholder="Email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        style={inputStyle}
      />
      <div className="remember" style={{ display: 'flex', marginBottom: 20, fontSize: 14 }}>
        <label htmlFor="remember">Remember me</label>
        <input type="checkbox" id="remember" style={{ marginLeft: 8 }} />
      </div>
      <button type="submit" style={buttonStyle}>Login</button>
      <br /><br />
      <button type="button" onClick={onShowRegister} style={buttonStyle}>Register as client</button>
      {errorText && <div id="errorBox" style={{ color: 'red', fontSize: 14, marginTop: 10 }}>{errorText}</div>}
    </form>
  );
}

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

export default LoginForm;
