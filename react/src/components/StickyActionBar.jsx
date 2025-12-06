import React from 'react';

export default function StickyActionBar({ children, className = '' }) {
  return (
    <>
      <div className={`action-bar ${className}`}>
        {children}
      </div>
      <style>{`
        /* Default (Desktop) style - inline */
        .action-bar {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        /* Mobile style - sticky bottom */
        @media (max-width: 799px) {
          .action-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: white;
            border-top: 1px solid #e5e7eb;
            padding: 12px;
            z-index: 50;
            justify-content: space-around;
            margin-top: 0 !important;
            box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow-x: auto;
          }
          
          .dark .action-bar {
             background-color: #111827;
             border-top-color: #374151;
          }
        }
      `}</style>
    </>
  );
}
