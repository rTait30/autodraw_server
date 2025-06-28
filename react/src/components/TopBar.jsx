import React from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom'; // <-- add Outlet

import { getBaseUrl } from '../utils/baseUrl';

function TopBar({ children }) {
  const name = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/copelands/react');
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
        boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <img
            src={getBaseUrl('/static/img/DRlogo.png')}
            alt="Logo"
            style={{ height: '36px', marginRight: '20px' }}
          />
          <Link to="/copelands/reacthome" style={linkStyle}>Home</Link>
          <Link to="/copelands/reactnew" style={linkStyle}>New Project</Link>
          <Link to="/copelands/reactprojects" style={linkStyle}>Projects</Link>
          {role === 'estimator' && (
            <Link to="/copelands/reactanalytics" style={linkStyle}>Analytics</Link>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={roleStyle}>{name}</span>
          <span style={roleStyle}>{role}</span>
          <a href="#" onClick={handleLogout} style={linkStyle}>Logout</a>
        </div>
      </header>

      <main style={{ padding: '24px', backgroundColor: '#f9f9f9', minHeight: 'calc(100vh - 60px)' }}>
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