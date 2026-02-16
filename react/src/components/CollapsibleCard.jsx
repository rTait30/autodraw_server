import React, { useState, useEffect } from 'react';

const CollapsibleCard = ({ 
  title, 
  children, 
  defaultOpen = true, 
  className = "", 
  contentClassName = "", 
  forceOpen = false, 
  icon = null,
  isOverlay = false,
  onClose = null,
  padding = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // If forceOpen or isOverlay becomes true, ensure open
  useEffect(() => {
    if (forceOpen || isOverlay) setIsOpen(true);
  }, [forceOpen, isOverlay]);

  const toggle = () => {
    if (forceOpen || isOverlay) return; 
    setIsOpen(prev => !prev);
  }

  const show = isOpen || forceOpen || isOverlay;

  const paddingClass = padding ? "p-4 md:p-6" : "";
  const combinedContentClass = `${paddingClass} ${contentClassName}`.trim();

  if (isOverlay) {
    return (
      <>
        {/* Backdrop */}
        <div 
            className="fixed inset-0 bg-black/40 z-[45] backdrop-blur-sm transition-opacity"
            onClick={onClose}
        />
        {/* Overlay Card */}
        <div className={`fixed inset-4 md:inset-10 top-24 md:bottom-24 z-[48] flex flex-col bg-white dark:bg-gray-800 rounded-sm shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
           <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 shrink-0 select-none">
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    {icon && <span className="text-gray-500">{icon}</span>}
                    <span className="font-bold text-lg">{title}</span>
                </div>
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}
            </div>
            
            <div className={`flex-1 overflow-auto p-4 md:p-6 ${contentClassName}`}>
               {children}
            </div>
        </div>
      </>
    );
  }

  return (
    <div className={`w-full max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-sm shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
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
      
      <div className={`grid transition-all duration-300 ease-in-out ${show ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className={combinedContentClass}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleCard;
