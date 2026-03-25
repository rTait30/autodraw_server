import React, { useEffect } from 'react';
import ProjectConfirmation from './ProjectConfirmation';
import { Button } from './UI';

export default function ProjectOverlay({ 
  mode, // 'preview' | 'confirm' | 'success' | null
  variant = 'embedded',
  showDialogActions = true,
  isCalculating = false,
  currentOrderType = 'quote',
  onReturn,
  onSubmit,
  canvasRef, 
  onPreviewReady,
  project, 
  productName,
  devMode,
  toggleData,
  setToggleData,
  children
}) {
  const isExistingProject = Boolean(project?.id);
  const submitLabel = `${isExistingProject ? 'Edit' : 'Submit'} ${currentOrderType === 'job' ? 'Job' : 'Quote'}`;

  useEffect(() => {
    if (mode !== 'preview' || isCalculating) return;
    if (!canvasRef?.current) return;
    onPreviewReady?.(canvasRef.current);
  }, [mode, isCalculating, canvasRef, onPreviewReady, project]);

  const renderPreview = () => (
    <div className="flex flex-col h-full w-full min-h-[360px]">
      <canvas 
        ref={canvasRef} 
        width={1000} 
        height={1000}
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

  const renderContent = () => {
    if (isCalculating) {
      return (
        <div className="flex items-center justify-center py-24">
          <span className="text-lg text-gray-500 dark:text-gray-400">Calculating...</span>
        </div>
      );
    }

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
            Your project has been successfully saved.
          </p>
          <Button onClick={onReturn} variant="secondary" className="w-full">Return to Projects</Button>
        </div>
      );
    }

    if (mode === 'confirm') {
      return <ProjectConfirmation project={project} productName={productName} />;
    }

    return renderPreview();
  };

  if (variant === 'dialog') {
    return (
      <>
        <div className={mode === 'preview' ? 'bg-gray-50 dark:bg-gray-900' : 'p-4'}>
          {renderContent()}
        </div>
        {showDialogActions && mode !== 'success' && !isCalculating && (
          <div className="sticky bottom-0 z-10 flex p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={onSubmit} variant="submit" className="flex-1">{submitLabel}</Button>
          </div>
        )}
      </>
    );
  }

  return renderContent();
}
