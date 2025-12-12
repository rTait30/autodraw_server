import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode, toggleDevMode } from '../store/togglesSlice';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { getBaseUrl } from '../utils/baseUrl';
import { logout } from '../services/auth';

function TopBar() {
  const name = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Logout function: clears localStorage and navigates
  const handleLogout = async () => {
    await logout();
    localStorage.clear();
    navigate('/copelands');
  };

  // Redux toggles
  const darkMode = useSelector(state => state.toggles.darkMode);
  const devMode = useSelector(state => state.toggles.devMode);
  const dispatch = useDispatch();

  const handleDarkModeToggle = () => {
    dispatch(toggleDarkMode());
  };

  const handleDevModeToggle = () => {
    dispatch(toggleDevMode());
  };

  const toggleBtnStyle = (active) => ({
    background: active ? 'var(--color-toggle-active)' : 'var(--color-toggle-inactive)',
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

  const navLinks = (
    <>
      <Link to="/copelands/home" className="linkStyle" onClick={() => setMenuOpen(false)}>Home</Link>
      <Link to="/copelands/newproject" className="linkStyle" onClick={() => setMenuOpen(false)}>New Project</Link>
      <Link to="/copelands/projects" className="linkStyle" onClick={() => setMenuOpen(false)}>Projects</Link>
      {role === 'admin' && (
          <Link to="/copelands/database" className="linkStyle" onClick={() => setMenuOpen(false)}>Database</Link>
      )}
      {role !== 'client' && (
        <>
          <Link to="/copelands/analytics" className="linkStyle" onClick={() => setMenuOpen(false)}>Analytics</Link>
        </>
      )}
    </>
  );

  const mobileMenu = (
    <div className="fixed top-0 right-0 w-[min(75vw,320px)] h-[100dvh] bg-primary dark:bg-gray-900 shadow-[-2px_0_8px_rgba(0,0,0,0.2)] flex flex-col p-6 z-[200] transition-transform duration-200"
      style={{
        display: menuOpen ? 'flex' : 'none',
      }}
    >
      <button
        onClick={() => setMenuOpen(false)}
        className="bg-none border-none text-white text-3xl self-end mb-4 cursor-pointer"
        aria-label="Close menu"
      >×</button>
      
      {/* Toggle buttons row */}
      <div className="flex items-center mb-6 space-x-2">
        <button
          onClick={handleDarkModeToggle}
          style={toggleBtnStyle(darkMode)}
        >🌙 Dark</button>
        <button
          onClick={handleDevModeToggle}
          style={toggleBtnStyle(devMode)}
        > Dev</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {navLinks}
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
      <header className="topbar flex items-center justify-between px-5 h-[60px] w-full sticky top-0 z-[100] bg-primary dark:bg-gray-900 text-white transition-colors duration-200">
        <div className="flex items-center gap-6 flex-1">
          <img
            src={getBaseUrl('/static/img/DRlogo.png')}
            alt="Logo"
            className="h-9 mr-5"
          />
          <div className="topbar-links hidden gap-6">
            {navLinks}
          </div>
        </div>

        {/* Right side: name, role, burger icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <span className="roleStyle">{name}</span>
          <span className="roleStyle">{role}</span>
          <button
            onClick={() => setMenuOpen(true)}
            className="bg-none border-white rounded border p-1 text-white text-3xl cursor-pointer mr-0 leading-none burger"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            aria-label="Open menu"
          >
            <span className="text-lg">Menu</span>
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
          /* Make topbar sticky on all screen sizes */
          .topbar-header {
            position: sticky;
            top: 0;
            inset-inline: 0;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            box-sizing: border-box;
            contain: paint;
            z-index: 100;
          }

          @media (min-width: 800px) {
            .topbar-links, .topbar-user {
              display: flex !important;
            }
            /* .burger { display: none !important; } Burger always visible */
          }

          @media (max-width: 799px) {
            /* Prevent page-level horizontal nudge */
            html, body { overflow-x: hidden; }
            @supports (overflow-x: clip) {
              html, body { overflow-x: clip; }
            }

            /* Make sure children don't force overflow */
            .topbar-header > * {
              min-width: 0;
              flex-shrink: 1;
            }

            .topbar-header img {
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

export default TopBar;
