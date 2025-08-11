import React, { useState } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { getBaseUrl } from '../utils/baseUrl';

function TopBar() {
  const name = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/copelands');
  };

  const headerStyle = {
    backgroundColor: '#1b1c3a',
    padding: '0 20px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: 'white',
    width: '100%',
    position: 'relative',
    zIndex: 100,
    boxSizing: 'border-box',
  };

  const navLinks = (
    <>
      <Link to="/copelands/home" style={linkStyle} onClick={() => setMenuOpen(false)}>Home</Link>
      <Link to="/copelands/newproject" style={linkStyle} onClick={() => setMenuOpen(false)}>New Project</Link>
      <Link to="/copelands/projects" style={linkStyle} onClick={() => setMenuOpen(false)}>Projects</Link>
      {role !== 'client' && (
        <>
          <Link to="/copelands/database" style={linkStyle} onClick={() => setMenuOpen(false)}>Database</Link>
          <Link to="/copelands/analytics" style={linkStyle} onClick={() => setMenuOpen(false)}>Analytics</Link>
        </>
      )}
    </>
  );

  const mobileMenu = (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 'min(75vw, 320px)',
      height: '100dvh',              // better on iOS Safari
      background: '#23244a',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.2)',
      display: menuOpen ? 'flex' : 'none',
      flexDirection: 'column',
      padding: '32px 24px',
      zIndex: 200,
      transition: 'transform 0.2s',
      willChange: 'transform',
    }}>
      <button
        onClick={() => setMenuOpen(false)}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: 28,
          alignSelf: 'flex-end',
          marginBottom: 24,
          cursor: 'pointer'
        }}
        aria-label="Close menu"
      >×</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {navLinks}
        <span style={roleStyle}>{name}</span>
        <span style={roleStyle}>{role}</span>
        <a href="#" onClick={handleLogout} style={linkStyle}>Logout</a>
      </div>
    </div>
  );

  return (
    <>
      <header style={headerStyle} className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <img
            src={getBaseUrl('/static/img/DRlogo.png')}
            alt="Logo"
            style={{ height: '36px', marginRight: '20px' }}
          />
          <div className="topbar-links" style={{ display: 'none', gap: '24px' }}>
            {navLinks}
          </div>
        </div>

        <div className="topbar-user" style={{ display: 'none', alignItems: 'center', gap: '24px' }}>
          <span style={roleStyle}>{name}</span>
          <span style={roleStyle}>{role}</span>
          <a href="#" onClick={handleLogout} style={linkStyle}>Logout</a>
        </div>

        {/* Burger menu icon */}
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: 32,
            cursor: 'pointer',
            display: 'block'
          }}
          className="burger"
          aria-label="Open menu"
        >
          ☰
        </button>
      </header>

      {mobileMenu}

      <main style={{ minHeight: 'calc(100vh - 60px)' }}>
        <Outlet />
      </main>

      <style>
        {`
          @media (min-width: 800px) {
            .topbar-links, .topbar-user {
              display: flex !important;
            }
            .burger {
              display: none !important;
            }
          }

          /* Mobile hardening for Safari/Firefox */
          @media (max-width: 799px) {
            /* Prevent page-level horizontal nudge */
            html, body { overflow-x: hidden; }
            @supports (overflow-x: clip) {
              html, body { overflow-x: clip; }
            }

            .topbar {
              position: sticky;
              top: 0;
              inset-inline: 0;      /* logical left/right = 0 (FF-friendly) */
              width: 100%;
              max-width: 100%;
              min-width: 0;
              box-sizing: border-box;
              contain: paint;       /* isolate paints, reduce fractional overflow */
            }

            /* Make sure children don't force overflow */
            .topbar > * {
              min-width: 0;
              flex-shrink: 1;
            }

            .topbar img {
              max-width: 100%;
              height: auto;
              display: block;
            }
          }
        `}
      </style>
    </>
  );
}

const linkStyle = {
  color: 'white',
  textDecoration: 'none',
  fontWeight: 500,
  fontSize: '15px'
};

const roleStyle = {
  fontWeight: 500,
  fontSize: '14px',
  opacity: 0.8
};

export default TopBar;
