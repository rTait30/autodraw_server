// components/ProjectSidebar.jsx
import React from 'react';

export default function ProjectSidebar({ selectedProduct, setSelectedProduct, products }) {
  const handleSelect = (id) => {
    setSelectedProduct(id);
  };

  return (
    <aside className="bg-white dark:bg-gray-800 shadow-md p-4 md:p-6 md:w-64 md:min-h-screen flex-shrink-0">
      <h3 className="text-lg font-bold mb-4 dark:text-white">Select product</h3>
      <ul className="list-none p-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        {products.map(({ name, id }) => (
          <li key={id} className="flex-shrink-0">
            <button
              onClick={() => handleSelect(id)}
              className={`block w-full text-left py-2 px-3 rounded transition whitespace-nowrap ${
                selectedProduct === id
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 font-semibold'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
