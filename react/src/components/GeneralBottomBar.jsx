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

  const [activePage, setActivePage] = useState(() => {
    if (location.pathname.endsWith('/tools')) return 'tools';
    if (location.pathname.endsWith('/projects')) return 'projects';
    return '';
  });

  useEffect(() => {
    if (isProjectVisible) {
      setActivePage('project');
    } else if (location.pathname.endsWith('/projects')) {
      setActivePage('projects');
    } else if (location.pathname.endsWith('/tools')) {
      setActivePage('tools');
    }
  }, [location.pathname, isProjectVisible]);

  const [draftProject, setDraftProject] = useState({});
  const [hasDraft, setHasDraft] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [activeProjectName, setActiveProjectName] = useState('');
  const [saveRequestToken, setSaveRequestToken] = useState(0);

  const [replaceConfirm, setReplaceConfirm] = useState({ show: false });

  // Landing is on /copelands. Check exact match or if it's the root.
  const isLanding = location.pathname === '/copelands' || location.pathname === '/copelands/';

  const checkDraft = () => {
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
      if (draft.username && draft.username !== username) {
        setHasDraft(false);
        setDraftName('');
        return;
      }
      
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
        document.body.style.paddingBottom = `${h}px`;
      }
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--bottom-nav-height');
      document.body.style.paddingBottom = '';
    };
  }, [mounted]);

  const handleNewProjectClick = () => {
    if (isProjectMounted && isProjectVisible) {
      setReplaceConfirm({ show: true });
      return;
    }

    if (isProjectMounted) {
      if (isProjectVisible) {
        setSaveRequestToken(t => t + 1);
        setIsProjectVisible(false);
      } else {
        setIsProjectVisible(true);
      }
      return;
    }

    try {
        const draftStr = localStorage.getItem('autodraw_draft');
        if (draftStr) {
            const draft = JSON.parse(draftStr);
            const username = localStorage.getItem('username');

            if (draft.username && draft.username !== username) {
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
      setActivePage('project');
  };

  const cancelReplaceConfirm = () => setReplaceConfirm({ show: false });
  const confirmReplaceConfirm = () => {
    setReplaceConfirm({ show: false });
    handleCloseProjectWithOptions({ discardDraft: true });
    setDraftProject({ status: 'New', general: { name: 'New Project' } });
    setIsProjectMounted(true);
    setIsProjectVisible(true);
  };

  const handleCloseProject = () => {
    handleCloseProjectWithOptions();
  };

  const handleCloseProjectWithOptions = ({ discardDraft = false } = {}) => {
    if (discardDraft) {
      try { localStorage.removeItem('autodraw_draft'); } catch {}
    } else {
      setSaveRequestToken(t => t + 1);
    }

    setIsProjectVisible(false);
    setIsProjectMounted(false);
    setDraftProject({});
    setActiveProjectName('');
  };

  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      handleCloseProjectWithOptions({ discardDraft: !!detail.discardDraft });
    };
    window.addEventListener('autodraw:close-project-inline', handler);
    return () => window.removeEventListener('autodraw:close-project-inline', handler);
  }, []);

  if (!mounted || isLanding) return null;

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
        <div 
          ref={ref} 
          className={`fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 h-24 
            bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] 
            pb-[env(safe-area-inset-bottom)] dark:bg-surface dark:border-gray-700 ${className}`}
        >
          {/* Projects Button (Left) */}
          <button 
            className={`
              flex flex-col items-center justify-center w-full h-full p-2 cursor-pointer
              transition-colors duration-200 border-r border-gray-200 dark:border-gray-700
              ${activePage === 'projects' 
                ? 'bg-warm-grey text-primary dark:bg-gray-900 dark:text-blue-400' 
                : 'bg-white text-text-sub hover:bg-gray-50 dark:bg-surface dark:text-gray-400 dark:hover:bg-gray-800'}
            `}
            onClick={onProjectsClick || (() => { 
                if (isProjectMounted) setSaveRequestToken(t => t + 1);
                setIsProjectVisible(false);
                setActivePage('projects');
                navigate('/copelands/projects'); 
            })}
            title="View Projects"
          >
            <svg
              className="w-8 h-8 mb-1"
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="3.5" y="11" width="1" height="9" rx="0.5" fill="currentColor" />
              <rect x="19.5" y="11" width="1" height="9" rx="0.5" fill="currentColor" />
              <rect x="11.5" y="4" width="1" height="16" rx="0.5" fill="currentColor" />
              <path 
                d="M12 5C15 8 20 9 21 11.5C18 13.5 15 14 12 17C9 14 6 13.5 3 11.5C4 9 9 8 12 5Z" 
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-base font-semibold leading-tight truncate w-full text-center">Projects</span>
          </button>

          {/* New Project / Continue Button (Center) */}
          <button 
            className={`
              flex flex-col items-center justify-center w-full h-full p-2 cursor-pointer
              transition-colors duration-200 border-r border-gray-200 dark:border-gray-700
              bg-primary text-white hover:bg-primary-hover active:bg-primary-hover
            `}
            onClick={handleNewProjectClick}
            title={isProjectVisible ? "Start New Project" : ((isProjectMounted || hasDraft) ? `Continue ${activeProjectName || draftName || 'Draft'}` : "Create New Project")}
          >
            <div className="flex items-center justify-center mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            </div>
            <span className="text-base font-bold text-white text-center leading-tight">
              {isProjectVisible ? "New Project" : (
                (isProjectMounted || hasDraft) 
                  ? <>
                      Continue
                      <div className="text-sm font-normal truncate max-w-full px-1">
                        {activeProjectName || draftName || 'Draft'}
                      </div>
                    </>
                  : "New Project"
              )}
            </span>
          </button>

          {/* Tools Button (Right) */}
          <button 
            className={`
              flex flex-col items-center justify-center w-full h-full p-2 cursor-pointer
              transition-colors duration-200 
              ${activePage === 'tools' 
                ? 'bg-warm-grey text-primary dark:bg-gray-900 dark:text-blue-400' 
                : 'bg-white text-text-sub hover:bg-gray-50 dark:bg-surface dark:text-gray-400 dark:hover:bg-gray-700'}
            `}
            onClick={onToolsClick || (() => {
              if (isProjectMounted) setSaveRequestToken(t => t + 1);
              setIsProjectVisible(false);
              setActivePage('tools');
              navigate('/copelands/tools');
            })}
            title="Tools"
          >
            <svg
              className="w-8 h-8 mb-1"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="currentColor"
            >
              <path
                d="M20.7 7.1a6 6 0 0 1-8.2 7.6L6.4 20.8a1.6 1.6 0 0 1-2.2 0l-1-1a1.6 1.6 0 0 1 0-2.2l6.1-6.1A6 6 0 0 1 16.9 3c.4.1.6.7.3 1l-2 2 2.8 2.8 2-2c.3-.3.9-.1 1 .3Z"
              />
            </svg>
            <span className="text-base font-semibold leading-tight truncate w-full text-center">Tools</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
