import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

function TopBar() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pb-[var(--bottom-nav-height,0px)] bg-gray-50 dark:bg-gray-900 z-0">
      <Navigation />
      <main className="flex-1 overflow-y-auto relative w-full h-full">
        <Outlet />
      </main>
    </div>
  );
}

export default TopBar;
