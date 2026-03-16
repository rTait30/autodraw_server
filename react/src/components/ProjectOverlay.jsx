import React from 'react';
import ProjectConfirmation from './ProjectConfirmation';
import { Button } from './UI';

export default function ProjectOverlay({ 
  mode, // 'preview' | 'confirm' | 'success' | null
  onClose,
  onReturn,
  canvasRef, 
  project, 
  productName,
  devMode,
  toggleData,
  setToggleData,
  children
}) {

  if (mode === 'success') {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center min-h-[200px] max-w-md mx-auto my-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Project Submitted!</h2>
        <p className="text-base text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          Your project has been successfully saved. What would you like to do next?
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Button onClick={onReturn} variant="secondary" className="flex-1">Return to Projects</Button>
          <Button onClick={onClose} className="flex-1">Continue Editing</Button>
        </div>
      </div>
    );
  }

  if (mode === 'confirm') {
    return <ProjectConfirmation project={project} productName={productName} />;
  }

  // Default: canvas preview (inline or overlay)
  return (
    <div className="flex flex-col h-full w-full">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={600} 
        className="w-full h-auto"
      />
      {devMode && (
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
      {children}
    </div>
  );
}
