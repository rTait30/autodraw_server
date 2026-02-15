import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function StickyActionBar({ children, className = '', mode = 'fixed' }) {
  // Wait for mount to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [height, setHeight] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ref.current) return;

    const updateHeight = () => {
      if (ref.current) {
        setHeight(ref.current.offsetHeight);
      }
    };

    // Initial update
    updateHeight();

    // Watch for size changes
    const observer = new ResizeObserver(updateHeight);
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [mounted, mode]);

  if (!mounted) return null;

  // Contents of the bar
  const content = (
    <div ref={ref} className={`action-bar ${mode} border-t border-border bg-surface ${className}`}>
      {children}
    </div>
  );

  // Styling
  const styles = (
    <style>{`
      .action-bar {
        box-sizing: border-box;
        /* background/border handled by Tailwind utility classes */
        z-index: 50;
        display: flex;
        justify-content: space-around;
        align-items: center;
        box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
        
        /* Desktop: Fixed height, spacing between buttons */
        min-height: 80px; 
        padding: 16px 32px;
        padding-bottom: max(16px, env(safe-area-inset-bottom));
        gap: 24px;
      }

      .action-bar.fixed {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        /* Updated: Respect the bottom nav bar height if it exists */
        bottom: var(--bottom-nav-height, 0px);
        /* Mobile keyboard fix: ensure it sticks to bottom of viewport, not document */
        /* Use modern viewport unit if available, fallback to fixed bottom */
      }

      .action-bar.static {
        position: relative;
        width: 100%;
        flex-shrink: 0;
      }

      /* Mobile: Adjust spacing */
      @media (max-width: 799px) {
        .action-bar {
          height: auto;
          padding: 12px 16px;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
          gap: 12px;
          flex-wrap: wrap; 
        }
        
        /* Hide if keyboard is likely open (focus within inputs) - optional approach */
        /* Better approach: Use static positioning on small screens to avoid covering content */
      }
    `}</style>
  );

  // Responsive mode: On mobile, force 'static' to participate in flow and avoid keyboard issues
  // unless explicitly requested to be fixed
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 800;
  const effectiveMode = (isMobile && mode === 'fixed') ? 'static' : mode;

  if (effectiveMode === 'fixed') {
    return (
      <>
        {createPortal(
          <>
            {styles}
            {content}
          </>,
          document.body
        )}
        {/* Spacer to prevent content from being hidden behind the fixed bar */}
        <div style={{ height: height, width: '100%', flexShrink: 0 }} aria-hidden="true" />
      </>
    );
  }

  return (
    <>
      {styles}
      {content}
    </>
  );
}
