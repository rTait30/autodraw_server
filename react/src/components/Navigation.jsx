import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode, toggleDevMode } from '../store/togglesSlice';
import { Link, useNavigate } from 'react-router-dom';
import { getBaseUrl } from '../utils/baseUrl';
import { logout } from '../services/auth';
import { Button } from "./UI";

const Navigation = () => {
  const name = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const verified = localStorage.getItem('verified') === 'true';
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Redux toggles
  const darkMode = useSelector(state => state.toggles.darkMode);
  const devMode = useSelector(state => state.toggles.devMode);
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn("Logout API call failed", e);
    } finally {
      localStorage.clear();
      // Explicitly remove in case clear fails or is polyfilled weirdly
      localStorage.removeItem('autodraw_draft'); 
      navigate('/copelands/');
    }
  };

  const handleDevModeToggle = () => {
    dispatch(toggleDevMode());
  };
  
  const toggleBtnStyle = (active) => ({
    background: active ? 'var(--color-toggle-active)' : 'var(--color-toggle-inactive)',
    color: active ? 'black' : 'white',
    width: '64px',
  });

  const navLinks = (
    <>
      <Link to="/copelands/projects" className="link-nav" onClick={() => setMenuOpen(false)}>Projects</Link>
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
    <div className={`gap-8 fixed top-[var(--header-height)] right-0 w-[320px] max-w-full h-[calc(100dvh-var(--header-height))] bg-primary dark:bg-gray-900 shadow-[-2px_4px_12px_rgba(0,0,0,0.3)] flex flex-col p-8 z-[90] transition-transform duration-200 ease-out border-l border-white/10 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      
      <div className="flex flex-col gap-8 text-lg font-medium">
        <div className="user-info flex flex-row flex-wrap gap-4 items-baseline md:hidden">
          <span className="text-white font-semibold">{name}</span>
          <span className="text-white/80 text-sm">{role}</span>
        </div>
        <div className="h-px bg-white/20 my-2"></div>
        {navLinks}
      </div>
      <div className="h-px bg-white/20 my-2"></div>

      <Button
        variant="danger"
        onClick={handleLogout}
      >
        Logout
      </Button>

      <Button
        variant="dev"
        onClick={handleDevModeToggle}
        style={toggleBtnStyle(devMode)}
      >
        Dev Mode
      </Button>
      
    </div>
  );

  return (
    <>
      <style>{`:root { --header-height: 60px; }`}</style>
      <header className="topbar flex-none flex items-center justify-between px-5 h-[var(--header-height)] w-full bg-primary dark:bg-gray-900 text-white transition-colors duration-200 z-[100]">
        <div className="flex items-center gap-4 flex-1">
          <img
            src={getBaseUrl('/static/img/WhiteLogos.png')}
            alt="Logo"
            className="h-9 mr-5 object-contain"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <span className="hidden md:inline txt-role">{name}</span>
          <span className="hidden md:inline txt-role">{role}</span>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="bg-transparent border border-white rounded p-0 text-white cursor-pointer leading-none flex items-center justify-center gap-3 w-[100px] h-[44px] hover:bg-white/10 transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <span className="text-lg font-bold tracking-wide">{menuOpen ? 'Close' : 'Menu'}</span>
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect y="7" width="32" height="3" rx="1.5" fill="currentColor" />
                <rect y="14" width="32" height="3" rx="1.5" fill="currentColor" />
                <rect y="21" width="32" height="3" rx="1.5" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </header>
      {!verified && role !== 'admin' && (
        <div className="w-full bg-yellow-500 text-black text-center py-2 font-bold px-4 shadow-sm relative">
          ⚠️ Account Not Verified - Access Limited
        </div>
      )}
      {createPortal(mobileMenu, document.body)}
    </>
  );
};

export default Navigation;
