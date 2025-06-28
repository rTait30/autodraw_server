import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const projectTypes = [
  { name: 'Covers', path: '/copelands/reactnew/cover' },
  { name: 'Shade Sails', path: '/copelands/reactnew/shadesail' },
  // Add more as needed
];

export default function NewProject() {
  const location = useLocation();

  return (
    <div style={{ display: 'flex', gap: '40px' }}>
      <aside style={{ width: '220px' }}>
        <h3>List of Products</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {projectTypes.map(({ name, path }) => (
            <li key={path}>
              <Link
                to={path}
                style={{
                  textDecoration: location.pathname === path ? 'underline' : 'none',
                }}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
    </div>
  );
}
