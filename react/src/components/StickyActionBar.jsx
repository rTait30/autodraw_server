import React from 'react';

export default function StickyActionBar({
  children,
  className = '',
  mode = 'fixed',
}) {
  const isInline = mode === 'inline';

  const base =
    'w-full border-t bg-white dark:bg-gray-800 ' +
    'border-gray-200 dark:border-gray-700 ' +
    'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]';

  const layout = 'flex items-stretch gap-3 px-4 py-3 md:px-8';

  const fixedStyle = isInline ? {
    position: 'relative',
    zIndex: 60,
  } : {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 'var(--bottom-nav-height, 0px)',
    zIndex: 60,
    height: '96px',
  };

  return (
    <div style={fixedStyle} className={[base, layout, className].join(' ').trim()}>
      {children}
    </div>
  );
}
