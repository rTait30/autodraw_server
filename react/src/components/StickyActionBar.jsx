import React, { useEffect, useState } from 'react';

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

  // When used inside `ProjectInline`, render the bar positioned absolutely
  // at the bottom of that container so it sits above the bottom nav correctly.
  const fixedStyle = mode === 'fixed' ? {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '0px',
    zIndex: 60,
    height: '96px',
  } : {
    position: 'relative',
    zIndex: 60,
  };

  const bar = (
    <div style={fixedStyle} className={[base, layout, className].join(' ').trim()}>
      {children}
    </div>
  );

  // Render the bar in-place so it stays visible inside ProjectInline
  return bar;
}