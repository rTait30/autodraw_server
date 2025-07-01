import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBaseUrl } from '../utils/baseUrl';

const inputStyle =
  "w-full p-3 mb-3 border border-gray-300 rounded-lg text-sm";
const buttonStyle =
  "w-full p-3 bg-[#2f2f6f] text-white text-base font-medium rounded-lg cursor-pointer mt-1";

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
    <div class=" flex items-center justify-center  font-mono">
      <div class="w-full  flex items-center justify-center ">
        <div class=" rounded-2xl bg-white p-8 w-80 shadow-lg flex flex-col items-center">
          <div class="flex justify-center w-full mb-5">
            <img
              src={getBaseUrl('/static/img/DRlogo.png')}
              alt="Logo"
              class="mx-auto"
            />
          </div>
          {mode === 'login' ? (
            <form onSubmit={handleLogin} class="w-full">
              <input
                type="text"
                placeholder="Email"
                value={login.username}
                onChange={e => setLogin(l => ({ ...l, username: e.target.value }))}
                required
                class={inputStyle}
              />
              <input
                type="password"
                placeholder="Password"
                value={login.password}
                onChange={e => setLogin(l => ({ ...l, password: e.target.value }))}
                required
                class={inputStyle}
              />
              <div class="flex items-center mb-5 text-sm">
                <label htmlFor="remember">Remember me</label>
                <input type="checkbox" id="remember" class="ml-2" />
              </div>
              <button type="submit" class={buttonStyle}>Login</button>
              <div class="my-2" />
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorText(''); setSuccessText(''); }}
                class={buttonStyle}
              >
                Register as client
              </button>
              {errorText && (
                <div class="text-red-600 text-sm mt-2">{errorText}</div>
              )}
            </form>
          ) : (
            <form onSubmit={handleRegister} class="w-full">
              <input
                placeholder="Username"
                value={register.username}
                onChange={e => setRegister(r => ({ ...r, username: e.target.value }))}
                required class={inputStyle}
              />
              <input
                placeholder="Email"
                value={register.email}
                onChange={e => setRegister(r => ({ ...r, email: e.target.value }))}
                required class={inputStyle}
              />
              <input
                placeholder="Address"
                value={register.address}
                onChange={e => setRegister(r => ({ ...r, address: e.target.value }))}
                required class={inputStyle}
              />
              <input
                type="password"
                placeholder="Password"
                value={register.password1}
                onChange={e => setRegister(r => ({ ...r, password1: e.target.value }))}
                required class={inputStyle}
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={register.password2}
                onChange={e => setRegister(r => ({ ...r, password2: e.target.value }))}
                required class={inputStyle}
              />
              <button type="submit" class={buttonStyle}>Register</button>
              <div class="my-2" />
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorText(''); setSuccessText(''); }}
                class={buttonStyle}
              >
                Cancel
              </button>
              {errorText && (
                <div class="text-red-600 text-sm mt-2">{errorText}</div>
              )}
              {successText && (
                <div class="text-green-600 text-sm mt-2">{successText}</div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}