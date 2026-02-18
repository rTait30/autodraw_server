import React from 'react';
import { Button } from './UI';

export default function ConfirmOverlay({
  show,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex justify-center items-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{message}</p>
          <div className="flex gap-3">
            <Button onClick={onCancel} variant="secondary" className="flex-1">
              {cancelLabel}
            </Button>
            <Button onClick={onConfirm} variant={confirmVariant} className="flex-1">
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
