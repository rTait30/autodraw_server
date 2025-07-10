// components/ProjectSidebar.jsx
import React from 'react';
import { Menu } from 'lucide-react';

export default function ProjectSidebar({ open, setOpen, selectedType, setSelectedType, projectTypes }) {
  const handleSelect = (id) => {
    setSelectedType(id);
    setOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between p-4 bg-white shadow-md md:hidden">
        <h3 className="text-lg font-bold">Products</h3>
        <button onClick={() => setOpen(!open)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
        <aside
        className={`
            h-screen md:h-auto
            bg-white shadow-md p-6 w-56 z-50
            md:relative md:translate-x-0 md:block
            fixed top-0 left-0 transform transition-transform duration-300 ease-in-out
            ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        >
        <h3 className="text-lg font-bold mb-4">Select product</h3>
        <ul className="list-none p-0">
          {projectTypes.map(({ name, id }) => (
            <li key={id} className="mb-2">
              <button
                onClick={() => handleSelect(id)}
                className={`block w-full text-left py-1 px-2 rounded transition ${
                  selectedType === id
                    ? 'bg-blue-100 text-blue-800 font-semibold underline'
                    : 'hover:bg-gray-100'
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
