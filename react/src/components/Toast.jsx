import React, { useEffect, useState, useRef, useCallback } from 'react';
import { resolveToastMessage } from '../config/toastRegistry';

/**
 * centralized Toast component.
 * 
 * Props:
 * - message: string (The text to display)
 * - onClose: function (Callback to clear the toast)
 * - duration: number (Auto-close duration in ms, default 3000. Set to 0 to disable auto-close)
 * - type: 'info' | 'success' | 'error' | 'warning' (Controls border color)
 * - className: string (Extra classes for positioning or overrides)
 */
const Toast = ({ message, onClose, duration = 3000, type = 'info', className = '' }) => {
  const onCloseRef = useRef(onClose);

  // Keep callback ref stable to avoid resetting timer on render
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Handle auto-close
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        if (onCloseRef.current) onCloseRef.current();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, message]); // Reset only when duration or message changes

  if (!message) return null;

  // Type-based styling
  const typeStyles = {
    info: 'bg-blue-50 dark:bg-gray-800 text-blue-800 dark:text-blue-100 border-blue-200 dark:border-blue-800',
    success: 'bg-green-50 dark:bg-gray-800 text-green-800 dark:text-green-100 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-gray-800 text-red-800 dark:text-red-100 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-gray-800 text-yellow-800 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800',
  };

  // Default fallback
  const styleClass = typeStyles[type] || typeStyles.info;

  // Icons for each type
  const typeIcons = {
    info: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    success: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    error: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    warning: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
  };

  return (
    <div 
      className={`
        fixed left-1/2 -translate-x-1/2 z-[200] 
        w-[90%] max-w-lg 
        shadow-lg rounded-lg
        border
        px-4 py-3 
        break-words 
        animate-fade-in-up
        gap-3 flex items-start
        ${styleClass}
        ${className} /* Allows overriding bottom/top positioning */
      `}
      role="alert"
    >
      <div className="shrink-0 mt-0.5">{typeIcons[type]}</div>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button 
        className="shrink-0 -mt-0.5 -mr-1" 
        onClick={onClose}
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export const useToast = () => {
    const [toast, setToast] = useState(null);
  
    const showToast = useCallback((tagOrMsg, opts = {}) => {
      const { args = [], ...restOpts } = opts;
      // Resolve message if it's a tag, or pass through string
      const msg = resolveToastMessage(tagOrMsg, ...args);
      setToast({ msg: String(msg), ...restOpts });
    }, []);
  
    const hideToast = useCallback(() => setToast(null), []);
  
    const ToastDisplay = useCallback(({ className = '', defaultDuration = 4000 }) => {
      if (!toast) return null;
      return (
        <Toast
          message={toast.msg}
          onClose={hideToast}
          duration={toast.duration ?? defaultDuration}
          type={toast.type}
          className={className}
        />
      );
    }, [toast, hideToast]);
  
    return {
      showToast,
      hideToast,
      ToastDisplay,
      // Expose state if needed for custom handling, but prefer Component
      toast
    };
  };

export default Toast;
