import React, { useState } from 'react';

function RegisterForm({ onCancel }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    address: '',
    password1: '',
    password2: '',
  });
  const [errorText, setErrorText] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/copelands/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: formData.username,
        email: formData.email,
        company: formData.address,
        password: formData.password1,
        password2: formData.password2,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setErrorText('Registration successful! Awaiting verification.');
    } else {
      setErrorText(data.error || 'Registration failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 20, width: '100%' }}>
      <input id="username" placeholder="Username" value={formData.username} onChange={handleChange} required style={inputStyle} />
      <input id="email" placeholder="Email" value={formData.email} onChange={handleChange} required style={inputStyle} />
      <input id="address" placeholder="Address" value={formData.address} onChange={handleChange} required style={inputStyle} />
      <input type="password" id="password1" placeholder="Password" value={formData.password1} onChange={handleChange} required style={inputStyle} />
      <input type="password" id="password2" placeholder="Confirm Password" value={formData.password2} onChange={handleChange} required style={inputStyle} />
      <button type="submit" style={buttonStyle}>Register</button>
      <button type="button" onClick={onCancel} style={{ ...buttonStyle, marginTop: 10 }}>Cancel</button>
      {errorText && <div style={{ color: 'red', fontSize: 14, marginTop: 10 }}>{errorText}</div>}
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

export default RegisterForm;
// This code defines a RegisterForm component that allows users to register by providing their username, email, address, and password.