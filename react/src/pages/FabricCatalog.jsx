import React from 'react';
import { useNavigate } from 'react-router-dom';
import FabricSelector from '../components/FabricSelector';
import TopBar from '../components/TopBar';

const FabricCatalog = () => {
  const navigate = useNavigate();

  // Simple check for active account (token/user existence)
  const isLoggedIn = !!localStorage.getItem('username');

  const handleSelect = (selection) => {
    console.log('Selected:', selection);
    // In catalog mode, maybe show details or something
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      
      {/* Header Bar */}
      {isLoggedIn ? (
        <div className="flex-none z-10 flex flex-col">
          <TopBar />
          <div className="flex items-center justify-between px-4 py-4 md:px-8 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                  onClick={() => navigate("/copelands/projects")}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 font-medium text-lg"
              >
                  <span>← Back to Projects</span>
              </button>
              <div className="hidden sm:block h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
              <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  Fabric Catalog
                  </h2>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-none flex items-center justify-between px-4 py-4 md:px-8 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm z-10">
          <div className="flex items-center gap-4">
              <button 
                  onClick={() => navigate("/copelands/")}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 font-medium text-lg"
              >
                  <span>← Back</span>
              </button>
              <div className="hidden sm:block h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
              <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  Fabric Catalog
                  </h2>
              </div>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain bg-gray-100 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4 py-8">
          <FabricSelector onSelect={handleSelect} mode="catalog" />
        </div>
      </div>

    </div>
  );
};

export default FabricCatalog;
