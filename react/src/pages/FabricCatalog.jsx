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
    <div className="page-fixed">
      
      {/* Header Bar */}
      <PageHeader 
        title="Fabric Catalog" 
        backPath={backPath}
        backLabel={"Back"}
      />

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
