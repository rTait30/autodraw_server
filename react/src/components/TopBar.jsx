import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode, toggleDevMode } from '../store/togglesSlice';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { getBaseUrl } from '../utils/baseUrl';

function TopBar() {
  const name = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Logout function: clears localStorage and navigates
  const handleLogout = () => {
    localStorage.clear();
    navigate('/copelands');
  };

  // Redux toggles
  const darkMode = useSelector(state => state.toggles.darkMode);
  const devMode = useSelector(state => state.toggles.devMode);
  const dispatch = useDispatch();

  const handleDarkModeToggle = () => {
    dispatch(toggleDarkMode());
    // TODO: Implement dark mode logic
  };

  const handleDevModeToggle = () => {
    dispatch(toggleDevMode());
    // TODO: Implement dev mode logic
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

  const toggleBtnStyle = (active) => ({
    background: active ? '#eeeeee' : '#23244a',
    color: active ? 'black' : 'white',
    border: '1px solid white',
    fontSize: 13,
    padding: '6px 10px',
    borderRadius: 5,
    marginRight: 8,
    cursor: 'pointer',
    minWidth: 70,
    fontWeight: 500,
    transition: 'background 0.2s',
  });

  const mobileMenu = (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 'min(75vw, 320px)',
      height: '100dvh',
      background: '#23244a',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.2)',
      display: menuOpen ? 'flex' : 'none',
      flexDirection: 'column',
      padding: '24px 18px',
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
          marginBottom: 16,
          cursor: 'pointer'
        }}
        aria-label="Close menu"
      >×</button>
      {/* Toggle buttons row */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 0, marginBottom: 18, justifyContent: 'flex-start' }}>
        <button
          onClick={handleDarkModeToggle}
          style={toggleBtnStyle(darkMode)}
        >🌙 Dark</button>
        <button
          onClick={handleDevModeToggle}
          style={toggleBtnStyle(devMode)}
        >Dev</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ...existing code... */}
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: '1px solid white',
            color: 'white',
            fontSize: 16,
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 8,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >Logout</button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
          <img
            src={getBaseUrl('/static/img/DRlogo.png')}
            alt="Logo"
            style={{ height: '36px', marginRight: '20px' }}
          />
          <div className="topbar-links" style={{ display: 'none', gap: '24px' }}>
            {navLinks}
          </div>
        </div>

        {/* Right side: name, role, burger icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <span style={roleStyle}>{name}</span>
          <span style={roleStyle}>{role}</span>
          <button
            onClick={() => setMenuOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: 32,
              cursor: 'pointer',
              display: 'block',
              marginRight: 0,
              padding: 0,
              lineHeight: 1
            }}
            className="burger"
            aria-label="Open menu"
          >
            {/* SVG burger icon for crisp white look */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect y="7" width="32" height="3" rx="1.5" fill="white" />
              <rect y="14" width="32" height="3" rx="1.5" fill="white" />
              <rect y="21" width="32" height="3" rx="1.5" fill="white" />
            </svg>
          </button>
        </div>
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
            /* .burger { display: none !important; } Burger always visible */
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
