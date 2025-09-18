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
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,        // stays above page content
    boxSizing: 'border-box',
  };

  const navLinks = (
    <>
      <Link to="/copelands/home" style={linkStyle} onClick={() => setMenuOpen(false)}>Home</Link>
      <Link to="/copelands/newproject" style={linkStyle} onClick={() => setMenuOpen(false)}>New Project</Link>
      <Link to="/copelands/projects" style={linkStyle} onClick={() => setMenuOpen(false)}>Projects</Link>
      {role === 'admin' && (
          <Link to="/copelands/database" style={linkStyle} onClick={() => setMenuOpen(false)}>Database</Link>
      )}
      {role !== 'client' && (
        <>
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
      zIndex: 2000,
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

  console.log("verified:", localStorage.getItem('verified'));

  const unverified =
    localStorage.getItem('verified') !== 'true'
      ? (
        <span style={{
          color: 'red',
          fontWeight: 'bold',
          fontSize: '14px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginRight: '12px'
        }}>
          UNVERIFIED ACCESS LIMITED
        </span>
      )
      : null;
  

  return (
    <>
      <header style={headerStyle} className="topbar">
        <div className="topbar-spacer" />
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
          {unverified}
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

      <main style={{ minHeight: 'calc(100svh - 60px)' }}>
        <Outlet />
      </main>

      <style>
        {`

        /* iOS-specific: detect WebKit/iOS and pin header fixed with safe-area */
          @supports (-webkit-touch-callout: none) {
            .topbar {
              position: fixed !important;
              top: env(safe-area-inset-top);
              left: 0;
              right: 0;
              z-index: 1000;
              -webkit-transform: translateZ(0); /* create its own layer */
              will-change: transform;
            }
            /* spacer equals bar height + safe-area so content starts below it */
            .topbar-spacer {
              height: calc(60px + env(safe-area-inset-top));
            }
          }
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
              inset-inline: 0;
              width: 100%;
              max-width: 100%;
              min-width: 0;
              box-sizing: border-box;
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
