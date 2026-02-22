import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { apiFetch } from '../services/auth';
import CollapsibleCard from '../components/CollapsibleCard';
import ProjectTable from '../components/ProjectTable';
import ProjectInline from '../components/ProjectInline';
import StickyActionBar from '../components/StickyActionBar';
import { Button } from '../components/UI';
import ConfirmOverlay from '../components/ConfirmOverlay';
import { discardDraftAndCloseInline } from '../utils/draft';
import PageHeader from '../components/PageHeader';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [deletedProjects, setDeletedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const productsList = useSelector(state => state.products.list);
  
  // Inline expansion state
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedProject, setExpandedProject] = useState(null);
  
  const navigate = useNavigate();

  // Draft State -- null if no draft, else object { isNew, id, name }
  const [draftInfo, setDraftInfo] = useState(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, projectId: null, projectName: null });

  // Recover confirmation state
  const [recoverConfirm, setRecoverConfirm] = useState({ show: false, projectId: null, projectName: null });

  // Hard Delete confirmation state
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState({ show: false, projectId: null, projectName: null });

  // Centralized confirm state for "replace/discard" actions
  // { type: 'new' | 'open', targetId?, targetName? }
  const [replaceConfirm, setReplaceConfirm] = useState({ show: false, type: null, targetId: null, targetName: null });

  const role = localStorage.getItem("role") || "client";

  useEffect(() => {
    const checkDraft = () => {
        const draftStr = localStorage.getItem('autodraw_draft');
        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr);
                if (draft && draft.project) {
                    setDraftInfo({
                        isNew: draft.isNew,
                        id: draft.project.id,
                        name: draft.project.general?.name || 'Untitled'
                    });
                } else {
                    setDraftInfo(null);
                }
            } catch (e) {
                console.error("Invalid draft", e);
                setDraftInfo(null);
            }
        } else {
            setDraftInfo(null);
        }
    };
    
    checkDraft();
    // Check less frequently to avoid constant re-renders/reads
    const interval = setInterval(checkDraft, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleContinueDraft = () => {
      try {
          const draftStr = localStorage.getItem('autodraw_draft');
          if (!draftStr) return;
          const draft = JSON.parse(draftStr);
          
          if (draft && draft.project) {
              // Set draft flag to prevent useEffect overwrite
              draft.project._isDraft = true;
              setExpandedProject(draft.project);
              
              if (draft.isNew) {
                  setSearchParams({ new: 'true' });
              } else if (draft.project.id) {
                  setSearchParams({ open: draft.project.id });
              }
          }
      } catch (e) {
          console.error("Failed to restore draft", e);
      }
  };

  const startNewProjectNow = () => {
    discardDraftAndCloseInline();
    setDraftInfo(null);
    setExpandedProject(null);
    setSearchParams({ new: 'true' });
  };

  const handleStartNewProject = () => {
    const hasDraftLocal = !!localStorage.getItem('autodraw_draft');
    const hasOpenEditor = !!expandedProject;

    if (hasDraftLocal || hasOpenEditor) {
      setReplaceConfirm({ show: true, type: 'new', targetId: null, targetName: null });
      return;
    }

    startNewProjectNow();
  };

  // 1. Load the list
  const fetchProjects = async () => {
    try {
      const res = await apiFetch('/projects/list');
      if (!res.ok) throw new Error('Failed to fetch project list');
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch project list:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load deleted projects list
  const fetchDeletedProjects = async () => {
    setLoadingDeleted(true);
    try {
      const res = await apiFetch('/projects/list/deleted');
      if (!res.ok) throw new Error('Failed to fetch deleted project list');
      const data = await res.json();
      setDeletedProjects(data);
    } catch (err) {
      console.error('Failed to fetch deleted project list:', err);
    } finally {
      setLoadingDeleted(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchDeletedProjects(); // Also fetch deleted projects on mount
  }, []);

  // 2. Handle URL "open" param checks
  useEffect(() => {
    const openId = searchParams.get('open');
    const isNew = searchParams.get('new');

    if (openId) {
       // If we have a draft loaded for this ID, don't re-fetch
      if (expandedProject && String(expandedProject.id) === String(openId)) {
          // If we are currently viewing the requested project, don't re-fetch from server
          // This avoids overwriting local state if parent re-renders
          return;
      }
      
      // Fetch full details for this ID
      apiFetch(`/project/${openId}`)
        .then(res => res.json())
        .then(data => setExpandedProject(data))
        .catch(err => console.error("Failed to load project details", err));
    } else if (isNew) {
      // New mode. ensure we have a project stub so ProjectInline can render (and handle draft check)
      if (!expandedProject) {
          setExpandedProject({ status: 'New', general: { name: 'New Project' } });
      }
    } else {
      // Only clear if NOT a draft we just loaded (prevents race condition where state updates before params)
      if (!expandedProject?._isDraft) {
          setExpandedProject(null);
      }
    }
  }, [searchParams, expandedProject]);

  const proceedOpenProject = (id) => {
    discardDraftAndCloseInline();
    setDraftInfo(null);
    setExpandedProject(null);
    setSearchParams({ open: id });
  };

  const handleOpenProject = (id) => {
    const hasDraftLocal = !!localStorage.getItem('autodraw_draft');
    const hasOpenEditor = !!expandedProject;
    const isDifferentFromExpanded = expandedProject && String(expandedProject.id) !== String(id);
    const isDifferentFromDraft = hasDraftLocal && draftInfo?.id && String(draftInfo.id) !== String(id);

    // Warn if we are replacing anything in progress:
    // - switching away from an expanded project
    // - OR a saved draft exists for a different project (bottom-bar editor or prior session)
    if ((hasOpenEditor && isDifferentFromExpanded) || isDifferentFromDraft || (hasDraftLocal && !draftInfo?.id)) {
      const target = projects.find(p => String(p.id) === String(id))
        || deletedProjects.find(p => String(p.id) === String(id));
      setReplaceConfirm({
        show: true,
        type: 'open',
        targetId: id,
        targetName: target?.name || `Project ${id}`
      });
      return;
    }

    proceedOpenProject(id);
  };

  const cancelReplaceConfirm = () => setReplaceConfirm({ show: false, type: null, targetId: null, targetName: null });
  const confirmReplaceConfirm = () => {
    const next = replaceConfirm;
    cancelReplaceConfirm();

    if (next.type === 'new') {
      startNewProjectNow();
      return;
    }

    if (next.type === 'open' && next.targetId) {
      proceedOpenProject(next.targetId);
    }
  };

  const handleCloseProject = () => {
    setSearchParams((params) => {
      params.delete('open');
      params.delete('new');
      return params;
    });
    setExpandedProject(null);
  };

  const handleProductSelect = (product) => {
    setExpandedProject({
        status: 'New',
        general: { name: 'New Project' },
        product: product,
        product_id: product.id,
        products: [],
        project_attributes: {}
    });
  };

  // Handle delete confirmation
  const handleDeleteProject = (id, name) => {
    setDeleteConfirm({ show: true, projectId: id, projectName: name });
  };

  const confirmDelete = async () => {
    try {
      const res = await apiFetch(`/project/${deleteConfirm.projectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete project');
      // Refresh the list
      fetchProjects();
      setDeleteConfirm({ show: false, projectId: null, projectName: null });
    } catch (err) {
      console.error('Failed to delete project:', err);
      // Optionally show error message
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, projectId: null, projectName: null });
  };

  // Handle recover confirmation
  const handleRecoverProject = (id, name) => {
    setRecoverConfirm({ show: true, projectId: id, projectName: name });
  };

  const confirmRecover = async () => {
    try {
      const res = await apiFetch(`/project/${recoverConfirm.projectId}/recover`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to recover project');
      // Refresh both lists
      fetchProjects();
      fetchDeletedProjects();
      setRecoverConfirm({ show: false, projectId: null, projectName: null });
    } catch (err) {
      console.error('Failed to recover project:', err);
      // Optionally show error message
    }
  };

  const cancelRecover = () => {
    setRecoverConfirm({ show: false, projectId: null, projectName: null });
  };

  // Handle hard delete confirmation
  const handleHardDeleteProject = (id, name) => {
    setHardDeleteConfirm({ show: true, projectId: id, projectName: name });
  };

  const confirmHardDelete = async () => {
      try {
          const res = await apiFetch(`/projects/${hardDeleteConfirm.projectId}/hard_delete`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to hard delete project');
          // Refresh both lists
          fetchProjects();
          fetchDeletedProjects();
          setHardDeleteConfirm({ show: false, projectId: null, projectName: null });
      } catch (err) {
          console.error('Failed to hard delete project:', err);
      }
  };

  const cancelHardDelete = () => {
      setHardDeleteConfirm({ show: false, projectId: null, projectName: null });
  };

  const renderProjectActions = (project) => (
    <div className="flex items-center gap-1 justify-end">
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteProject(project.id, project.name);
        }}
        variant="ghost"
        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
        title="Delete project"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </Button>
      
      {role === 'admin' && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleHardDeleteProject(project.id, project.name);
          }}
          variant="ghost"
          className="p-1.5 text-red-800 hover:text-red-900 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-200 dark:hover:bg-red-900/40 rounded transition-colors"
          title="Permanently Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </Button>
      )}
    </div>
  );

  const renderRecoveryActions = (project) => (
    <div className="flex items-center gap-1 justify-end">
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleRecoverProject(project.id, project.name);
        }}
        variant="ghost"
        className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
        title="Recover project"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </Button>

      {role === 'admin' && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleHardDeleteProject(project.id, project.name);
          }}
          variant="ghost"
          className="p-1.5 text-red-800 hover:text-red-900 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-200 dark:hover:bg-red-900/40 rounded transition-colors"
          title="Permanently Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </Button>
      )}
    </div>
  );

  // Format Helper
  const formatName = (name) => name ? name.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) : '';

  if (loading) return <div className="p-8 text-center text-gray-500">Loading projects...</div>;

  const isNewMode = searchParams.get('new') === 'true';
  // Don't show selector if we have a draft loaded, even if product object might be momentarily checking
  // Also if we have a draft in storage, let ProjectInline handle the draft recovery UI
  const hasDraft = !!localStorage.getItem('autodraw_draft');
  const showSelector = isNewMode && !hasDraft && (!expandedProject || (!expandedProject.product && !expandedProject._isDraft));

  // Split projects
  const activeProjects = projects.filter(p => !p.status?.toLowerCase().includes("completed"));
  const completedProjects = projects.filter(p => p.status?.toLowerCase().includes("completed"));

  /*
<Button
              variant="primary"
              onClick={handleStartNewProject}
              className="flex items-center gap-3 text-sm font-bold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </Button>
  */

  return (
    
      
    <div>

      <PageHeader
        title="Projects"
        includeNav={false}
        hideBackButton={true}
      />
      
      <div className="p-4 mt-2 flex flex-col gap-4">

        <CollapsibleCard 
            title="Active" 
            defaultOpen={true}
        >
             <ProjectTable 
                projects={activeProjects} 
                onOpen={handleOpenProject} 
                renderActions={renderProjectActions}
             />
        </CollapsibleCard>

        <CollapsibleCard 
            title="Completed" 
            defaultOpen={false}
        >
             <ProjectTable 
                projects={completedProjects} 
                onOpen={handleOpenProject} 
                renderActions={renderProjectActions}
             />
        </CollapsibleCard>

        <CollapsibleCard 
            title="Recover" 
            defaultOpen={false}
        >
             {loadingDeleted ? (
                 <div className="text-center py-4 text-gray-500">Loading deleted projects...</div>
             ) : (
                <ProjectTable 
                    projects={deletedProjects} 
                    onOpen={handleOpenProject}
                    renderActions={renderRecoveryActions}
                />
             )}
        </CollapsibleCard>

      </div>

      

      {/* Delete Confirmation Overlay */}
      {deleteConfirm.show && (
        <div 
          className="fixed inset-0 z-[300] flex justify-center items-center bg-black/50 backdrop-blur-sm"
          onClick={cancelDelete}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 max-w-sm w-full mx-4 animate-fade-in-down"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Are you sure you want to delete "{deleteConfirm.projectName}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button onClick={cancelDelete} variant="secondary" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={confirmDelete} variant="danger" className="flex-1">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recover Confirmation Overlay */}
      {recoverConfirm.show && (
        <div 
          className="fixed inset-0 z-[300] flex justify-center items-center bg-black/50 backdrop-blur-sm"
          onClick={cancelRecover}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 max-w-sm w-full mx-4 animate-fade-in-down"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Recovery</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Are you sure you want to recover "{recoverConfirm.projectName}"? This will restore the project and all its products.
              </p>
              <div className="flex gap-3">
                <Button onClick={cancelRecover} variant="secondary" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={confirmRecover} variant="success" className="flex-1">
                  Recover
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Overlay */}
      {hardDeleteConfirm.show && (
        <div 
            className="fixed inset-0 z-[300] flex justify-center items-center bg-black/50 backdrop-blur-sm"
            onClick={cancelHardDelete}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 max-w-sm w-full mx-4 animate-fade-in-down"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Permanent Delete</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Are you sure you want to <strong>permanently delete</strong> "{hardDeleteConfirm.projectName}"? 
                        <br/><br/>
                        <span className="text-sm text-red-500">This action cannot be undone. All data will be lost forever.</span>
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={cancelHardDelete} variant="secondary" className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={confirmHardDelete} variant="danger" className="flex-1">
                            PERMANENTLY DELETE
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <ConfirmOverlay
        show={replaceConfirm.show}
        title={replaceConfirm.type === 'new' ? 'Start New Project?' : 'Open Project?'}
        message={
          replaceConfirm.type === 'new'
            ? 'Start a new project? This will discard any unsaved changes and replace your saved draft.'
            : `Open "${replaceConfirm.targetName}"? This will discard any unsaved changes and replace your saved draft.`
        }
        confirmLabel={replaceConfirm.type === 'new' ? 'Start New' : 'Open'}
        confirmVariant="danger"
        onCancel={cancelReplaceConfirm}
        onConfirm={confirmReplaceConfirm}
      />

      {/* Render Inline Editor if a project is expanded OR new mode */}
      {(expandedProject && !showSelector) && (
        <ProjectInline 
          key={isNewMode ? 'new' : (expandedProject?.id || 'open')}
          project={expandedProject} 
          isNew={isNewMode}
          onClose={handleCloseProject}
          onSaved={() => {
            fetchProjects();
            // Do not close - allow ProjectInline to handle navigation or stay open
            // handleCloseProject(); 
          }} 
        />
      )}
    </div>
  );
}


export default Projects;
