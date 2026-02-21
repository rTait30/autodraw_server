import React, { useEffect } from "react";

export default function Toast({
  message,
  type = "info",
  duration = 3000,
  onClose,
  className = "",
}) {
  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [duration, message, onClose]);

  if (!message) return null;

  const typeStyles = {
    info: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-gray-800 dark:text-blue-100 dark:border-blue-800",
    success:
      "bg-green-50 text-green-800 border-green-200 dark:bg-gray-800 dark:text-green-100 dark:border-green-800",
    error: "bg-red-50 text-red-800 border-red-200 dark:bg-gray-800 dark:text-red-100 dark:border-red-800",
    warning:
      "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-gray-800 dark:text-yellow-100 dark:border-yellow-800",
  };

  const styleClass = typeStyles[type] || typeStyles.info;

  const icon = {
    info: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  }[type];

  return (
    <div
      role="alert"
      className={[
        "fixed left-1/2 -translate-x-1/2 bottom-32 z-[9999] pointer-events-auto",
        "w-[92%] max-w-lg h-auto",
        "rounded-lg border shadow-lg",
        "px-4 py-3",
        "flex items-start gap-3",
        "break-words",
        "max-h-[80dvh] overflow-hidden",
        styleClass,
        className,
      ].join(" ")}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>

      {/* message scrolls if long */}
      <div className="flex-1 text-sm font-medium pr-1 overflow-y-auto max-h-[60dvh]">
        {message}
      </div>

      {/* 44x44 touch target, border shows hitbox */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="shrink-0 w-11 h-11 flex items-center justify-center rounded-md border border-current bg-transparent focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2"
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}