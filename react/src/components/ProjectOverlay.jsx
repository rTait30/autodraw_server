import React, { useEffect, useState } from 'react';
import ProjectConfirmation from './ProjectConfirmation';

export default function ProjectOverlay({ 
  mode, // 'preview' | 'confirm' | null
  isClosing,
  onClose,
  onReturn,
  canvasRef, 
  project, 
  productName,
  devMode,
  toggleData,
  setToggleData,
  children // Optional: if we want to pass specific children instead of standard confirm/canvas
}) {

  // Simplified: ProjectOverlay now only handles INTERNAL content.
  // The Overlay/Container logic is handled by CollapsibleCard.

  if (mode === 'success') {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[400px]">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-fade-in-up">
                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Project Submitted!
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-md">
                Your project has been successfully saved. What would you like to do next?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <button
                    onClick={onReturn}
                    className="flex-1 py-4 px-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:scale-[1.02]"
                    >
                    Return to Projects
                    </button>
                    <button
                    onClick={onClose}
                    className="flex-1 py-4 px-6 rounded-xl bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02]"
                    >
                    Continue Editing
                    </button>
            </div>
        </div>
      );
  }

  if (mode === 'confirm') {
      return (
        <div className="h-full overflow-auto">
             <ProjectConfirmation project={project} productName={productName} />
        </div>
      );
  }

  // Default / Preview Mode: Canvas
  return (
    <div className="flex flex-col h-full w-full">
        {/* Canvas Container */}
            <canvas 
                ref={canvasRef} 
                width={800} 
                height={600} 
                className={`${mode ? 'max-w-full h-auto' : 'w-full h-auto'} `}
            />

        {/* Dev Debug */}
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
    </div>
  );
}
