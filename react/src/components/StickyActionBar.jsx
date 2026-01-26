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
    <div ref={ref} className={`action-bar ${mode} ${className}`}>
      {children}
    </div>
  );

  // Styling
  const styles = (
    <style>{`
      .action-bar {
        box-sizing: border-box;
        background-color: white;
        border-top: 1px solid #e5e7eb;
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
          padding: 24px;
          padding-bottom: max(24px, env(safe-area-inset-bottom));
          gap: 16px;
          flex-wrap: wrap; 
        }
      }
      
      .dark .action-bar {
         background-color: #1f2937;
         border-top-color: #374151;
      }
    `}</style>
  );

  if (mode === 'fixed') {
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
