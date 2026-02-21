import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function StickyActionBar({
  children,
  className = '',
  mode = 'fixed', // default to fixed because you want it to sit above the fixed bottom bar
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const base =
    'w-full border-t bg-white dark:bg-gray-800 ' +
    'border-gray-200 dark:border-gray-700 ' +
    'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]';

  const layout = 'flex items-stretch gap-3 px-4 py-3 md:px-8';

  // Key part: bottom is offset by the bottom nav height (which GeneralBottomBar sets)
const fixedStyle = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 60,
};

  const bar = (
    <div style={fixedStyle} className={[base, layout, className].join(' ').trim()}>
      {children}
    </div>
  );

  return mode === 'fixed' ? createPortal(bar, document.body) : bar;
}