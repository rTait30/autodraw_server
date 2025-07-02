import React from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom'; // <-- add Outlet

import { getBaseUrl } from '../utils/baseUrl';

function TopBar({ children }) {
  const name = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/copelands');
  };

  return (
    <>
      <header style={{
        backgroundColor: '#1b1c3a',
        padding: '0 20px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <img
            src={getBaseUrl('/static/img/DRlogo.png')}
            alt="Logo"
            style={{ height: '36px', marginRight: '20px' }}
          />
          <Link to="/copelands/home" style={linkStyle}>Home</Link>
          <Link to="/copelands/new" style={linkStyle}>New Project</Link>
          <Link to="/copelands/projects" style={linkStyle}>Projects</Link>
          {role === 'estimator' && (
            <>
              <Link to="/copelands/analytics" style={linkStyle}>Analytics</Link>
              <Link to="/copelands/prices" style={linkStyle}>Prices</Link>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={roleStyle}>{name}</span>
          <span style={roleStyle}>{role}</span>
          <a href="#" onClick={handleLogout} style={linkStyle}>Logout</a>
        </div>
      </header>

      <main style={{ minHeight: 'calc(100vh - 60px)' }}>
        <Outlet /> {/* <-- replace {children} */}
      </main>
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
