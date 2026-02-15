import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

export default function GeneralBottomBar({ className = '', onNewProjectClick, onProjectsClick, onToolsClick, hasDraft }) {
  // Wait for mount to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [height, setHeight] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ref.current) return;

    const updateHeight = () => {
      if (ref.current) {
        const h = ref.current.offsetHeight;
        setHeight(h);
        document.documentElement.style.setProperty('--bottom-nav-height', `${h}px`);
      }
    };

    // Initial update
    updateHeight();

    // Watch for size changes
    const observer = new ResizeObserver(updateHeight);
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--bottom-nav-height');
    };
  }, [mounted]);

  if (!mounted) return null;

  // Contents of the bar
  const content = (
    <div ref={ref} className={`general-bottom-bar fixed border-t border-border bg-surface ${className}`}>
      
      {/* Projects Button (Left) */}
      <button 
        className="nav-btn border-r border-gray-200 dark:border-gray-700" 
        onClick={onProjectsClick || (() => navigate('/copelands/projects'))}
        title="View Projects"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="nav-text">Projects</span>
      </button>

      {/* New Project / Continue Button (Center - Prominent) */}
      <button 
        className={`nav-btn border-r border-gray-200 dark:border-gray-700 ${hasDraft ? 'bg-orange-50 dark:bg-orange-900/10' : 'bg-blue-50 dark:bg-blue-900/10'}`} 
        onClick={onNewProjectClick || (() => navigate('/copelands/newproject'))}
        title={hasDraft ? "Continue Saved Draft" : "Create New Project"}
      >
        <div className="new-project-icon-wrapper">
          {hasDraft ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            </div>
          )}
        </div>
        <span className={`nav-text font-bold ${hasDraft ? 'text-orange-700 dark:text-orange-300' : 'text-blue-700 dark:text-blue-300'}`}>
          {hasDraft ? "Continue" : "New Project"}
        </span>
      </button>

      {/* Tools Button (Right) - Wrench Icon */}
      <button 
        className="nav-btn" 
        onClick={onToolsClick || (() => navigate('/copelands/tools'))}
        title="Tools"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="nav-text">Tools</span>
      </button>

    </div>
  );

  // Styling
  const styles = (
    <style>{`
      .general-bottom-bar {
        box-sizing: border-box;
        z-index: 50;
        display: grid; /* Use grid for strict columns */
        grid-template-columns: 1fr 1fr 1fr;
        align-items: stretch;
        box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
        
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        
        height: 85px; /* Fixed height, slightly taller for ease of use */
        padding-bottom: env(safe-area-inset-bottom);
        background-color: white; /* default fallback */
      }
      
      @media (prefers-color-scheme: dark) {
        .general-bottom-bar {
           background-color: #1a1a1a; 
        }
      }

      .nav-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #475569; /* slate-600 - high contrast */
        transition: background-color 0.2s, color 0.2s;
        background: none;
        border-top: none;
        border-bottom: none;
        border-left: none; 
        /* Right border handled by class */
        cursor: pointer;
        padding: 8px;
        height: 100%;
        width: 100%;
      }

      .nav-btn:active {
        background-color: #f1f5f9;
      }

      @media (prefers-color-scheme: dark) {
        .nav-btn {
           color: #cbd5e1; /* slate-300 */
        }
        .nav-btn:active {
           background-color: #334155;
        }
      }
      
      .nav-icon {
        height: 2rem; /* 32px - Large icons */
        width: 2rem;
        margin-bottom: 4px;
      }

      .nav-text {
        font-size: 1rem; /* 16px - Large text for readability */
        font-weight: 600;
        line-height: 1.2;
      }
      
      /* New Project specific overrides */
      .new-project-icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
      }

    `}</style>
  );

  return (
    <>
      {createPortal(
        <>
          {styles}
          {content}
        </>,
        document.body
      )}
      {/* Spacer */}
      <div style={{ height: height, width: '100%', flexShrink: 0 }} aria-hidden="true" />
    </>
  );
}
