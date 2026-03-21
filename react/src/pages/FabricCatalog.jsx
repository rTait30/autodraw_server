import React from 'react';
import { useNavigate } from 'react-router-dom';
import FabricSelector from '../components/FabricSelector';
import PageHeader from '../components/PageHeader';

const FabricCatalog = () => {
  const navigate = useNavigate();

  // Simple check for active account (token/user existence)
  const isLoggedIn = !!localStorage.getItem('username');

  const handleSelect = (selection) => {
    console.log('Selected:', selection);
    // In catalog mode, maybe show details or something
  };

  const backPath = isLoggedIn ? "/copelands/tools" : "/copelands/";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
      
      {/* Header Bar */}
      <PageHeader 
        title="Fabric Catalog" 
        backPath={backPath}
        backLabel={"Back"}
      />

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <FabricSelector onSelect={handleSelect} mode="catalog" />
        </div>
      </main>

    </div>
  );
};

export default FabricCatalog;
