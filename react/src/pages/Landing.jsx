import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Authentication from '../components/Authentication';
import { getBaseUrl } from '../utils/baseUrl';

export default function Landing() {
  const [backgroundStyle, setBackgroundStyle] = useState({});

  useEffect(() => {
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
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.3s ease-in-out',
        ...backgroundStyle,
      }}
    >
      <Authentication />

      
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
        <Link to="/copelands/discrepancy">
          <button style={{ padding: '12px 24px', fontSize: 16, borderRadius: 8, border: 'none', background: '#1b1c3a', color: '#fff', cursor: 'pointer' }}>
            Open Discrepancy Calculator
          </button>
        </Link>
      </div>
    </div>
  );
}