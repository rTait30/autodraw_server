import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import ProjectInline from './ProjectInline';

export default function GeneralBottomBar({ className = '', onProjectsClick, onToolsClick }) {
  // Wait for mount to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [height, setHeight] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Internal state for project Controller
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [draftProject, setDraftProject] = useState({});
  const [hasDraft, setHasDraft] = useState(false);

  // Landing is on /copelands. Check exact match or if it's the root.
  const isLanding = location.pathname === '/copelands' || location.pathname === '/copelands/';

  const checkDraft = () => {
    // Only check if we don't have an active session in memory? 
    // Actually standard draft check
    try {
      const draftStr = localStorage.getItem('autodraw_draft');
      if (!draftStr) {
        setHasDraft(false);
        return;
      }
      const draft = JSON.parse(draftStr);
      if (!draft) {
          setHasDraft(false);
          return;
      }
      const username = localStorage.getItem('username');
      // If draft has a username, it must match current user.
      // If draft has no username (legacy), we might show it or hide it.
      // Safer to hide if we want to enforce ownership.
      if (draft.username && draft.username !== username) {
        setHasDraft(false);
        return;
      }
      // Also if user is logged in but draft has no username?
      // Let's stick to: if mismatches, hide.
      
      setHasDraft(!!draft);
    } catch (e) {
      setHasDraft(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    checkDraft();
    const interval = setInterval(checkDraft, 2000);
    return () => clearInterval(interval);
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

  const handleNewProjectClick = () => {
    // If it's already "mounted" (in memory), just toggle visibility
    if (isProjectOpen || isMinimized) {
        setIsProjectOpen(!isProjectOpen);
        setIsMinimized(!isMinimized);
        return;
    }

    // Otherwise, initialize fresh or from draft
    try {
        const draftStr = localStorage.getItem('autodraw_draft');
        if (draftStr) {
            const draft = JSON.parse(draftStr);
            const username = localStorage.getItem('username');

            if (draft.username && draft.username !== username) {
                // Mismatch, ignore draft
                setDraftProject({});
            } else if (draft && draft.project) {
                draft.project._isDraft = true;
                setDraftProject(draft.project);
            } else {
                setDraftProject({});
            }
        } else {
            setDraftProject({});
        }
      } catch (e) {
        console.error("Failed to restore draft", e);
        setDraftProject({});
      }
      setIsProjectOpen(true);
      setIsMinimized(false);
  };

  const handleCloseProject = () => {
    setIsProjectOpen(false);
    setIsMinimized(false);
    setDraftProject({}); // Clear current
  };

  // If landing page, we typically don't show the bar
  if (!mounted || isLanding) return null;

  // Contents of the bar
  const content = (
    <div ref={ref} className={`general-bottom-bar fixed border-t border-border bg-surface ${className}`}>
      
      {/* Projects Button (Left) */}
      <button 
        className="nav-btn border-r border-gray-200 dark:border-gray-700" 
        onClick={onProjectsClick || (() => { 
            // If project is open, maybe confirm close? For now just navigate.
            navigate('/copelands/projects'); 
        })}
        title="View Projects"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="nav-text">Projects</span>
      </button>

      {/* New Project / Continue Button (Center - Prominent) */}
      <button 
        className={`nav-btn border-r border-gray-200 dark:border-gray-700 ${
            // If active and open: green
            // If active but minimized: different shade/state?
            // If just draft exists: orange
            // Default: blue
          isProjectOpen 
            ? 'bg-green-50 dark:bg-green-900/10' 
            : isMinimized ? 'bg-indigo-50 dark:bg-indigo-900/10' // Minimized state
            : hasDraft ? 'bg-orange-50 dark:bg-orange-900/10' 
            : 'bg-blue-50 dark:bg-blue-900/10'
        }`} 
        onClick={handleNewProjectClick}
        title={isProjectOpen ? "Hide Project" : (isMinimized ? "Resume Editing" : (hasDraft ? "Continue Saved Draft" : "Create New Project"))}
      >
        <div className="new-project-icon-wrapper">
          {isProjectOpen ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
          ) : isMinimized ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                 </svg>
          ) : hasDraft ? (
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
        <span className={`nav-text font-bold ${
            isProjectOpen 
             ? 'text-green-700 dark:text-green-300' 
             : isMinimized ? 'text-indigo-700 dark:text-indigo-300'
             : hasDraft ? 'text-orange-700 dark:text-orange-300' 
             : 'text-blue-700 dark:text-blue-300'
        }`}>
          {isProjectOpen ? "Hide" : (isMinimized ? "Resume" : (hasDraft ? "Continue" : "New Project"))}
        </span>
      </button>

      {/* Tools Button (Right) - Wrench Icon */}
      <button 
        className="nav-btn" 
        onClick={onToolsClick || (() => navigate('/copelands/tools'))}
        title="Tools"
      >
        
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
      {/* 
          PERSISTENCE LOGIC: 
          We keep ProjectInline mounted if it is open OR if it is just minimized.
          This preserves local state (inputs, scroll) in memory.
          Only closing it fully (handleCloseProject) removes it from DOM.
      */}
      {(isProjectOpen || isMinimized) && createPortal(
        <div style={{ display: isMinimized ? 'none' : 'block' }}>
            <ProjectInline 
                isNew={true} 
                project={draftProject} 
                onClose={handleCloseProject} 
                onSaved={handleCloseProject}
            />
        </div>,
        document.body
      )}

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
