import React, { useState, useEffect } from 'react';

const CollapsibleCard = ({ title, children, defaultOpen = true, className = "", contentClassName = "", forceOpen = false, icon = null }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // If forceOpen becomes true (e.g. entering overlay mode), ensure open
  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

  const toggle = () => {
    if (forceOpen) return; 
    setIsOpen(prev => !prev);
  }

  const show = isOpen || forceOpen;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {!forceOpen && (
        <div 
            className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 cursor-pointer select-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={toggle}
        >
            <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                {icon && <span className="text-gray-500">{icon}</span>}
                <span className="font-bold text-lg">{title}</span>
            </div>
            <div className="text-gray-500 dark:text-gray-400">
                <svg 
                    className={`w-5 h-5 transition-transform duration-200 ${show ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
      )}
      
      <div className={show ? contentClassName : "hidden"}>
          {children}
      </div>
    </div>
  );
};

export default CollapsibleCard;
