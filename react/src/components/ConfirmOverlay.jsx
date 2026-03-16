import React from 'react';
import { Button } from './UI';
import OverlayShell from './OverlayShell';

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
  return (
    <OverlayShell open={show} onClose={onCancel} panelClassName="max-w-sm">
      <div className="p-6 text-center">
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
    </OverlayShell>
  );
}
