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
    navigate('/copelands/');
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
      <Link to="/copelands/projects" className="link-nav" onClick={() => setMenuOpen(false)}>Projects</Link>
      <Link to="/copelands/newproject" className="link-nav" onClick={() => setMenuOpen(false)}>New Project</Link>
      {role === 'admin' && (
        <>
          <Link to="/copelands/users" className="link-nav" onClick={() => setMenuOpen(false)}>Users</Link>
          <Link to="/copelands/database" className="link-nav" onClick={() => setMenuOpen(false)}>Database</Link>
        </>
      )}
      {role !== 'client' && (
        <>
          <Link to="/copelands/analytics" className="link-nav" onClick={() => setMenuOpen(false)}>Analytics</Link>
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
        className="self-end mb-6 bg-none border-white rounded border p-1 text-white cursor-pointer mr-0 leading-none flex items-center gap-2 hover:bg-white/10"
        aria-label="Close menu"
      >
        <span className="text-lg">Close</span>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      
      {/* Toggle buttons row */}
      <div className="flex items-center mb-6 space-x-2">
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
    <div className="flex flex-col h-full overflow-hidden">
      <header className="topbar flex-none flex items-center justify-between px-5 h-[60px] w-full bg-primary dark:bg-gray-900 text-white transition-colors duration-200 z-[100]">
        <div className="flex items-center gap-6 flex-1">
          <img
            src={getBaseUrl(darkMode ? '/static/img/DRlogoHDark.png' : '/static/img/DRlogoH.png')}
            alt="Logo"
            className="h-9 mr-5"
          />
        </div>

        {/* Right side: name, role, burger icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <span className="txt-role">{name}</span>
          <span className="txt-role">{role}</span>
          {role === 'client' ? (
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded border border-white text-lg transition-colors duration-200"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
              aria-label="Logout"
            >
              LOGOUT
            </button>
          ) : (
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
          )}
        </div>
      </header>

      {mobileMenu}

      <main className="flex-1 overflow-y-auto relative bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </main>
    </div>
  );
}

export default TopBar;
