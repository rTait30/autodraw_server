import React, { useEffect, useState } from 'react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import DiscrepancyCalculator from '../components/DiscrepancyCalculator';

import { getBaseUrl } from '../utils/baseUrl';

export default function Home() {
  const [showRegister, setShowRegister] = useState(false);
  const [backgroundStyle, setBackgroundStyle] = useState({});

  useEffect(() => {
    // Lazy-load background image
    setTimeout(() => {
      setBackgroundStyle({
        backgroundImage: `url(${getBaseUrl('/static/img/shadesails.jpg')})`,
      });
    }, 100);
  }, []);

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.3s ease-in-out',
        ...backgroundStyle,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          padding: 40,
          width: 320,
          boxShadow: '0 0 30px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <img
          src={getBaseUrl('/static/img/DRlogo.png')}
          alt="Logo"
          style={{ maxWidth: '100%', marginBottom: 20 }}
        />
        {showRegister ? (
          <RegisterForm onCancel={() => setShowRegister(false)} />
        ) : (
          <LoginForm onShowRegister={() => setShowRegister(true)} />
        )}
        <div style={{ marginTop: 16, fontSize: 14 }}>
          <a href="#" style={{ color: '#333', textDecoration: 'none' }}>
            Forgot password?
          </a>
        </div>
      </div>

      <div
        style={{
          marginTop: 24,
          background: '#fff',
          borderRadius: 20,
          padding: '32px 40px',
          width: 320,
          boxShadow: '0 0 30px rgba(0,0,0,0.10)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <DiscrepancyCalculator />
      </div>
    </div>
  );
}
