import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

function TopBar() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Navigation />
      <main className="flex-1 overflow-y-auto relative bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </main>
    </div>
  );
}

export default TopBar;
