import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Authentication from '../components/Authentication';
import { getBaseUrl } from '../utils/baseUrl';
import '../styles/index.css'; // Uncomment if you want to use the global styles

//const buttonStyle = "w-full p-3 bg-[#2f2f6f] text-white text-base font-medium rounded-lg cursor-pointer mt-1";

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
          <button className="buttonStyle">
            Open Discrepancy Calculator
          </button>
        </Link>
      </div>
    </div>
  );
}