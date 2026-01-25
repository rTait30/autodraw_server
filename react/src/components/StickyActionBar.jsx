import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function StickyActionBar({ children, className = '' }) {
  // Wait for mount to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Render content
  const content = (
    <div className={`action-bar ${className}`}>
      {children}
    </div>
  );

  // Styling
  const styles = (
    <style>{`
      .action-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
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

  return createPortal(
    <>
      {styles}
      {content}
    </>,
    document.body
  );
}
