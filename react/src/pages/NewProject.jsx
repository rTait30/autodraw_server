import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react'; // Optional: any icon lib

const projectTypes = [
  { name: 'Covers', path: '/copelands/new/cover' },
  { name: 'Shade Sails', path: '/copelands/new/shadesail' },
  // Add more as needed
];

export default function NewProject() {
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Top bar for mobile */}
      <div className="flex items-center justify-between p-4 bg-white shadow-md md:hidden">
        <h3 className="text-lg font-bold">Products</h3>
        <button onClick={toggleSidebar}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <aside
        className={`bg-white shadow-md p-6 w-56 min-w-56 max-w-56 transform transition-transform duration-300 ease-in-out z-50
          md:translate-x-0 md:relative md:block
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full fixed top-0 left-0 h-full'}`}
      >
        <h3 className="text-lg font-bold mb-4">List of Products</h3>
        <ul className="list-none p-0">
          {projectTypes.map(({ name, path }) => (
            <li key={path} className="mb-2">
              <Link
                to={path}
                onClick={() => setSidebarOpen(false)} // close after click
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
