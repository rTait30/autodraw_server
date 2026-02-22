import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import ProjectInline from './ProjectInline';
import ConfirmOverlay from './ConfirmOverlay';

export default function GeneralBottomBar({ className = '', onProjectsClick, onToolsClick }) {
  // Wait for mount to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [height, setHeight] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Internal state for project Controller
  const [isProjectMounted, setIsProjectMounted] = useState(false);
  const [isProjectVisible, setIsProjectVisible] = useState(false);
  const [draftProject, setDraftProject] = useState({});
  const [hasDraft, setHasDraft] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [activeProjectName, setActiveProjectName] = useState('');
  const [saveRequestToken, setSaveRequestToken] = useState(0);

  const [replaceConfirm, setReplaceConfirm] = useState({ show: false });

  // Landing is on /copelands. Check exact match or if it's the root.
  const isLanding = location.pathname === '/copelands' || location.pathname === '/copelands/';

  const checkDraft = () => {
    // Only check if we don't have an active session in memory? 
    // Actually standard draft check
    try {
      const draftStr = localStorage.getItem('autodraw_draft');
      if (!draftStr) {
        setHasDraft(false);
        setDraftName('');
        return;
      }
      const draft = JSON.parse(draftStr);
      if (!draft) {
          setHasDraft(false);
          setDraftName('');
          return;
      }
      const username = localStorage.getItem('username');
      // If draft has a username, it must match current user.
      // If draft has no username (legacy), we might show it or hide it.
      // Safer to hide if we want to enforce ownership.
      if (draft.username && draft.username !== username) {
        setHasDraft(false);
        setDraftName('');
        return;
      }
      // Also if user is logged in but draft has no username?
      // Let's stick to: if mismatches, hide.
      
      const name = draft?.project?.general?.name;
      setDraftName(typeof name === 'string' && name.trim() ? name.trim() : 'Untitled');
      setHasDraft(!!draft);
    } catch {
      setHasDraft(false);
      setDraftName('');
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
    // When the editor is visible, the center button becomes "New Project".
    // This requires the same discard warning as other New Project entry points.
    if (isProjectMounted && isProjectVisible) {
      setReplaceConfirm({ show: true });
      return;
    }

    // If we already have an in-memory editor, just toggle visibility.
    if (isProjectMounted) {
      if (isProjectVisible) {
        // Force-save before hiding so a quick hide doesn't lose persistence.
        setSaveRequestToken(t => t + 1);
        setIsProjectVisible(false);
      } else {
        setIsProjectVisible(true);
      }
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
      const name = draftProject?.general?.name;
      if (typeof name === 'string' && name.trim()) {
        setActiveProjectName(name.trim());
      } else if (hasDraft && draftName) {
        setActiveProjectName(draftName);
      }

      setIsProjectMounted(true);
      setIsProjectVisible(true);
  };

  const cancelReplaceConfirm = () => setReplaceConfirm({ show: false });
  const confirmReplaceConfirm = () => {
    setReplaceConfirm({ show: false });

    // Discard current work/draft and reset the inline editor.
    handleCloseProjectWithOptions({ discardDraft: true });

    // Start a fresh "New Project" flow (product selector will show).
    setDraftProject({ status: 'New', general: { name: 'New Project' } });
    setIsProjectMounted(true);
    setIsProjectVisible(true);
  };

  const handleCloseProject = () => {
    // Backwards-compatible signature: default close saves draft.
    handleCloseProjectWithOptions();
  };

  const handleCloseProjectWithOptions = ({ discardDraft = false } = {}) => {
    if (discardDraft) {
      // Explicit discard: do NOT force-save; remove persisted draft.
      try { localStorage.removeItem('autodraw_draft'); } catch {}
    } else {
      // Normal close: force-save before closing/unmounting.
      setSaveRequestToken(t => t + 1);
    }

    setIsProjectVisible(false);
    setIsProjectMounted(false);
    setDraftProject({}); // Clear current
    setActiveProjectName('');
  };

  // Allow other parts of the app (e.g. Projects page) to discard/close the bottom-bar editor.
  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      handleCloseProjectWithOptions({ discardDraft: !!detail.discardDraft });
    };
    window.addEventListener('autodraw:close-project-inline', handler);
    return () => window.removeEventListener('autodraw:close-project-inline', handler);
  }, []);

  // If landing page, we typically don't show the bar
  if (!mounted || isLanding) return null;

  // Contents of the bar
  const size = 32;
  const color = '#475569'; // slate-600 - high contrast

  const content = (
    <div ref={ref} className={`general-bottom-bar fixed border-t border-border bg-surface ${className}`}>
      
      {/* Projects Button (Left) */}
      <button 
        className="nav-btn border-r border-gray-200 dark:border-gray-700" 
        onClick={onProjectsClick || (() => { 
            // Force-save then hide so it can't overlay the page.
            if (isProjectMounted) setSaveRequestToken(t => t + 1);
            setIsProjectVisible(false);
            navigate('/copelands/projects'); 
        })}
        title="View Projects"
      >
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vertical Poles */}
          <rect x="3.5" y="11" width="1" height="9" rx="0.5" fill={color} />
          <rect x="19.5" y="11" width="1" height="9" rx="0.5" fill={color} />
          <rect x="11.5" y="4" width="1" height="16" rx="0.5" fill={color} />

          {/* The Hypar Sail Shape */}
          <path 
            d="M12 5C15 8 20 9 21 11.5C18 13.5 15 14 12 17C9 14 6 13.5 3 11.5C4 9 9 8 12 5Z" 
            fill={color}
            stroke={color}
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </svg>
        <span className="nav-text">Projects</span>
      </button>

      {/* New Project / Continue Button (Center - Prominent) */}
      <button 
        className={`nav-btn border-r border-gray-200 dark:border-gray-700 ${
            // If active and open: green
            // If just draft exists: orange
            // Default: blue
          isProjectVisible 
            ? 'bg-blue-50 dark:bg-blue-900/10' 
            : (isProjectMounted || hasDraft) ? 'bg-orange-50 dark:bg-orange-900/10' 
            : 'bg-blue-50 dark:bg-blue-900/10'
        }`} 
        onClick={handleNewProjectClick}
        title={isProjectVisible ? "Start New Project" : ((isProjectMounted || hasDraft) ? `Continue ${activeProjectName || draftName || 'Draft'}` : "Create New Project")}
      >
        <div className="new-project-icon-wrapper">
          {(!isProjectVisible && hasDraft) ? (
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
            isProjectVisible 
             ? 'text-blue-700 dark:text-blue-300' 
             : (isProjectMounted || hasDraft) ? 'text-orange-700 dark:text-orange-300' 
             : 'text-blue-700 dark:text-blue-300'
        }`}>
          {isProjectVisible
            ? "New Project"
            : ((isProjectMounted || hasDraft)
              ? <>
                  Continue<br/>
                  <span className="nav-text-ellipsis">{activeProjectName || draftName || 'Draft'}</span>
                </>
              : "New Project")}
        </span>
      </button>

      {/* Tools Button (Right) - Wrench Icon */}
      <button 
        className="nav-btn" 
        onClick={onToolsClick || (() => {
          // Force-save then hide so it can't overlay the page.
          if (isProjectMounted) setSaveRequestToken(t => t + 1);
          setIsProjectVisible(false);
          navigate('/copelands/tools');
        })}
        title="Tools"
      >
        <svg
        width={32}
        height={32}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill={color}
          d="M20.7 7.1a6 6 0 0 1-8.2 7.6L6.4 20.8a1.6 1.6 0 0 1-2.2 0l-1-1a1.6 1.6 0 0 1 0-2.2l6.1-6.1A6 6 0 0 1 16.9 3c.4.1.6.7.3 1l-2 2 2.8 2.8 2-2c.3-.3.9-.1 1 .3Z"
        />
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
        
        height: 96px; /* Fixed height, slightly taller for ease of use */
        padding-bottom: env(safe-area-inset-bottom);
        background-color: white; /* default fallback */
      }
      
      @media (prefers-color-scheme: dark) {
        .general-bottom-bar {
           background-color: white; 
        }
      }

      .nav-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        transition: background-color 0.2s, color 0.2s;
        background: white;
        border-top: none;
        border-bottom: none;
        border-left: none; 
        /* Right border handled by class */
        cursor: pointer;
        padding: 8px;
        height: 100%;
        width: 100%;
        overflow: hidden;
      }

      .nav-btn:active {
        background-color: white;
      }

      @media (prefers-color-scheme: dark) {
        .nav-btn {
           color: #000000; /* slate-300 */
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
        color: #475569; /* slate-600 - high contrast */
        line-height: 1.2;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: clip;
      }
      
      .nav-text-ellipsis {
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
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
      {isProjectMounted && createPortal(
        <div style={{ display: isProjectVisible ? 'block' : 'none' }}>
          <ProjectInline 
            isNew={true} 
            project={draftProject} 
            onClose={handleCloseProjectWithOptions} 
            onSaved={handleCloseProject}
            requestSaveToken={saveRequestToken}
            onDraftMeta={(meta) => {
              const nextName = meta?.name;
              if (typeof nextName === 'string' && nextName.trim()) {
                setActiveProjectName(nextName.trim());
              }
            }}
          />
        </div>,
        document.body
      )}

      {createPortal(
        <ConfirmOverlay
          show={replaceConfirm.show}
          title="Start New Project?"
          message="Start a new project? This will discard any unsaved changes and replace your saved draft."
          confirmLabel="Start New"
          confirmVariant="danger"
          onCancel={cancelReplaceConfirm}
          onConfirm={confirmReplaceConfirm}
        />,
        document.body
      )}

      {createPortal(
        <>
          {styles}
          {content}
        </>,
        document.body
      )}
    </>
  );
}
