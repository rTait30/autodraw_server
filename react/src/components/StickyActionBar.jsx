import React, { useEffect, useState } from 'react';

export default function StickyActionBar({
  children,
  className = '',
  mode = 'fixed', // default to fixed because you want it to sit above the fixed bottom bar
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isFixed = mode === 'fixed';
  
  // If fixed, we want to ensure the body has enough padding so content isn't covered.
  // However, multiple fixed bars might conflict.
  // We assume StickyActionBar is the only other fixed bar besides the global nav.
  useEffect(() => {
    if (!isFixed || !mounted) return;
  }, [isFixed, mounted]);

  if (!mounted) return null;

  const base =
    'w-full border-t bg-white dark:bg-gray-800 ' +
    'border-gray-200 dark:border-gray-700 ' +
    'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]';

  const layout = 'flex items-stretch gap-3 px-4 py-3 md:px-8';

  const fixedStyle = isFixed ? {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 'var(--bottom-nav-height, 0px)',
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
