// components/ProjectSidebar.jsx
import React from 'react';

export default function ProjectSidebar({ 
  selectedProduct, 
  setSelectedProduct, 
  products,
  favorites = [],
  onToggleFavorite,
  showAll,
  setShowAll,
  hasFavorites
}) {
  const handleSelect = (id) => {
    setSelectedProduct(id);
  };

  return (
    <aside className="bg-white dark:bg-gray-800 shadow-md p-4 md:p-6 md:w-64 md:min-h-screen flex-shrink-0 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold dark:text-white">Select product</h3>
        {hasFavorites && (
             <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
             >
                {showAll ? 'Show Favorites' : 'Show All'}
             </button>
        )}
      </div>

      <ul className="list-none p-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        {products.map(({ name, id }) => {
          const isFav = favorites.includes(id);
          return (
          <li key={id} className={`flex-shrink-0 group rounded transition ${
            selectedProduct === id
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 font-semibold'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
          }`}>
            <div className="flex items-center w-full">
                <button
                onClick={() => handleSelect(id)}
                className="flex-grow text-left py-2 pl-3 pr-2"
                >
                {name}
                </button>
                {onToggleFavorite && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(id);
                        }}
                        className={`flex-shrink-0 mr-2 p-1.5 rounded-full border shadow-sm transition-all ${
                            isFav 
                                ? 'bg-white dark:bg-gray-800 text-yellow-500 border-yellow-300 dark:border-yellow-700' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-300 dark:border-gray-500 hover:bg-white dark:hover:bg-gray-600 hover:border-gray-400'
                        }`}
                        title={isFav ? "Remove from favorites" : "Add to favorites"}
                    >
                        <svg className="w-4 h-4" fill={isFav ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </button>
                )}
            </div>
          </li>
        )})}
      </ul>
      {products.length === 0 && (
          <div className="text-gray-500 text-sm mt-4 italic">No products found.</div>
      )}
    </aside>
  );
}

