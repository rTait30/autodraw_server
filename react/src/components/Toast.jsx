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
    info: 'border-l-blue-600',
    success: 'border-l-green-600',
    error: 'border-l-red-600',
    warning: 'border-l-yellow-600',
  };

  const borderClass = typeStyles[type] || typeStyles.info;

  return (
    <div 
      className={`
        fixed left-1/2 -translate-x-1/2 z-[100] 
        w-[90%] max-w-lg 
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        shadow-xl rounded-md
        px-4 py-3 
        text-sm text-gray-900 dark:text-gray-100 
        break-words 
        border-l-4 ${borderClass}
        animate-fade-in-up
        ${className}
      `}
      role="alert"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 pt-0.5">{message}</div>
        <button 
          className="text-gray-400 hover:text-black dark:hover:text-white transition-colors shrink-0" 
          onClick={onClose}
          aria-label="Close notification"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
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
