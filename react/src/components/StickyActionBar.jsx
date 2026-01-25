import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function StickyActionBar({ children, className = '', mode = 'fixed' }) {
  // Wait for mount to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ref.current || mode !== 'fixed') return;

    const updatePadding = () => {
      if (ref.current) {
        // Try to find the main scroll container first
        const main = document.querySelector('main');
        const target = main || document.body;
        target.style.paddingBottom = `${ref.current.offsetHeight}px`;
      }
    };

    // Initial update
    updatePadding();

    // Watch for size changes
    const observer = new ResizeObserver(updatePadding);
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      const main = document.querySelector('main');
      const target = main || document.body;
      target.style.removeProperty('padding-bottom');
    };
  }, [mounted, mode]);

  if (!mounted) return null;

  // Render content
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
        height: 128px;
        padding: 0 32px;
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
          padding: 32px;
          gap: 16px;
        }
      }
      
      .dark .action-bar {
         background-color: #1f2937;
         border-top-color: #374151;
      }
    `}</style>
  );

  if (mode === 'fixed') {
    return createPortal(
      <>
        {styles}
        {content}
      </>,
      document.body
    );
  }

  return (
    <>
      {styles}
      {content}
    </>
  );
}
