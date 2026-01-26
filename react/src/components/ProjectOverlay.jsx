import React, { useEffect, useState } from 'react';
import ProjectConfirmation from './ProjectConfirmation';

export default function ProjectOverlay({ 
  mode, // 'preview' | 'confirm' | null
  isClosing,
  onClose, 
  canvasRef, 
  project, 
  productName,
  devMode,
  toggleData,
  setToggleData,
  children // Optional: if we want to pass specific children instead of standard confirm/canvas
}) {

  // If no mode is active, we might render "inline" or nothing depending on usage.
  // But based on current design, this component handles the "sidebar that becomes overlay".
  // Note: Parent controls the logic of "when to show".
  // Here we just handle the rendering styles.

  // Determine container classes based on mode
  const containerClasses = mode 
    ? `fixed left-4 right-4 top-24 bottom-36 md:bottom-28 z-[48] flex flex-col p-2 md:p-4 shadow-2xl border-2 border-blue-500/30 ${isClosing ? 'animate-slide-down-card' : 'animate-slide-up-card'} max-w-5xl mx-auto`
    : 'p-1 md:p-4';

  const showBackdrop = !!mode;

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div 
            className={`fixed inset-0 bg-black/40 z-[45] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
            onClick={onClose}
        />
      )}

      {/* Container */}
      <div className={`
         bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300
         ${containerClasses}
      `}>
        
        {/* Overlay Header */}
        {mode && (
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {mode === 'confirm' ? 'Confirm Details' : 'Check Visualisation'}
                </h3>
                <button 
                    onClick={onClose}
                    className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                    aria-label="Close"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        )}

        {/* Desktop Sidebar Title (Hidden if overlay is active) */}
        <h3 className={`font-bold text-gray-800 dark:text-gray-200 mb-2 px-2 hidden md:block ${mode ? '!hidden' : ''}`}>
            Visualisation Preview
        </h3>
        
        <div className={`${mode ? 'flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700' : ''}`}>
            
            {mode === 'confirm' ? (
                <ProjectConfirmation project={project} productName={productName} />
            ) : (
                /* Default / Preview Mode: Canvas */
                <div className={`flex items-center justify-center ${mode ? 'min-h-[300px]' : ''}`}>
                    <canvas 
                        ref={canvasRef} 
                        width={800} 
                        height={600} 
                        className={`${mode ? 'max-w-full max-h-full object-contain' : 'w-full h-auto'} bg-white rounded`}
                    />
                </div>
            )}
            
        </div>
      </div>

      {/* Dev Debug (Keep showing below container if in sidebar, or inside? Original was below) */}
      {devMode && !mode && (
        <div className="text-right mt-4">
            <button onClick={() => setToggleData(!toggleData)} className="text-sm text-blue-600 underline cursor-pointer">
            {toggleData ? 'Hide' : 'Show'} Debug Data
            </button>
            {toggleData && (
            <pre className="text-xs text-left bg-gray-900 text-green-400 p-4 rounded mt-2 overflow-auto max-h-96">
                {JSON.stringify(project, null, 2)}
            </pre>
            )}
        </div>
      )}

      {/* Pass children (like Downloads) for sidebar rendering */}
      {children}
    </>
  );
}
