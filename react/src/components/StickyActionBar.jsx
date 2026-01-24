import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function StickyActionBar({ children, className = '' }) {
  const [isMobile, setIsMobile] = useState(false);
  // Wait for mount to avoid hydration mismatch if SSR (though this is SPA)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 799px)').matches);
    
    // Initial check
    checkMobile();
    
    // Listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted) return null;

  // Render content
  const content = (
    <div className={`action-bar ${className} ${isMobile ? 'mobile-fixed' : ''}`}>
      {children}
    </div>
  );

  // Styling
  const styles = (
    <style>{`
      /* Default (Desktop) style - inline flow */
      .action-bar {
        display: flex;
        gap: 12px;
        margin-top: 20px;
      }

      /* Mobile style - fixed to viewport via Portal */
      .action-bar.mobile-fixed {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: white;
        border-top: 1px solid #e5e7eb; /* gray-200 */
        padding: 12px;
        z-index: 50;
        justify-content: space-around; /* Distribute buttons */
        margin-top: 0 !important;
        box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
        overflow-x: auto;
      }
      
      /* Dark mode support within portal (needs manual class if outside root?) 
         Since we portal to body, we lose the 'dark' class from html/body? 
         'dark' is usually on <html> or <body>. If on <html>, it inherits.
      */
      .dark .action-bar.mobile-fixed {
         background-color: #1f2937; /* gray-800 */
         border-top-color: #374151; /* gray-700 */
      }
    `}</style>
  );

  return (
    <>
      {styles}
      {isMobile ? createPortal(content, document.body) : content}
    </>
  );
}
