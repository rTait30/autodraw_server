import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GeneralBottomBar from './GeneralBottomBar';
import ProjectInline from './ProjectInline';

export default function LayoutWithBottomBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [draftProject, setDraftProject] = useState({});
  const [hasDraft, setHasDraft] = useState(false);

  // Landing is on /copelands. Check exact match or if it's the root.
  // Based on your routes, Landing is /copelands
  const isLanding = location.pathname === '/copelands' || location.pathname === '/copelands/';

  const checkDraft = () => {
    const draft = localStorage.getItem('autodraw_draft');
    setHasDraft(!!draft);
  };

  React.useEffect(() => {
    // Check initial
    checkDraft();
    
    // Poll for changes (since localStorage doesn't emit events in same window)
    const interval = setInterval(checkDraft, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleNewProjectClick = () => {
    try {
        const draftStr = localStorage.getItem('autodraw_draft');
        if (draftStr) {
            const draft = JSON.parse(draftStr);
            if (draft && draft.project) {
                // Set draft flag to let ProjectInline know
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
    setIsCreatingProject(true);
  };

  const handleProjectsClick = () => {
      setIsCreatingProject(false);
      navigate('/copelands/projects');
  };

  const handleToolsClick = () => {
      setIsCreatingProject(false);
      navigate('/copelands/tools');
  };

  if (isLanding) {
    return null;
  }

  return (
    <>
      <GeneralBottomBar 
        onNewProjectClick={handleNewProjectClick} 
        onProjectsClick={handleProjectsClick}
        onToolsClick={handleToolsClick}
        hasDraft={hasDraft && !isCreatingProject}
      />
      {isCreatingProject && (
        <ProjectInline 
            isNew={true} 
            project={draftProject} 
            onClose={() => setIsCreatingProject(false)} 
            onSaved={() => setIsCreatingProject(false)}
        />
      )}
    </>
  );
}
