import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const projectTypes = [
  { name: 'Covers', path: '/copelands/new/cover' },
  { name: 'Shade Sails', path: '/copelands/new/shadesail' },
  // Add more as needed
];

export default function NewProject() {
  const location = useLocation();

  return (
    <div className="flex gap-10 min-h-screen bg-gray-50">
      <aside className="w-56 min-w-56 max-w-56 bg-white shadow-md p-6">
        <h3 className="text-lg font-bold mb-4">List of Products</h3>
        <ul className="list-none p-0">
          {projectTypes.map(({ name, path }) => (
            <li key={path} className="mb-2">
              <Link
                to={path}
                className={`block py-1 px-2 rounded transition ${
                  location.pathname === path
                    ? 'bg-blue-100 text-blue-800 font-semibold underline'
                    : 'hover:bg-gray-100'
                }`}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}