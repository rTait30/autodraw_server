import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { apiFetch } from '../services/auth';
import CollapsibleCard from '../components/CollapsibleCard';
import ToolsCard from '../components/ToolsCard';
import LegalCard from '../components/LegalCard';
import ProjectTable from '../components/ProjectTable';
import ProjectInline from '../components/ProjectInline';
import StickyActionBar from '../components/StickyActionBar';
import { Button } from '../components/UI';

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
      // New mode, wait for user selection or invalidation
    } else {
      // Only clear if NOT a draft we just loaded (prevents race condition where state updates before params)
      if (!expandedProject?._isDraft) {
          setExpandedProject(null);
      }
    }
  }, [searchParams, expandedProject]);

  const handleOpenProject = (id) => {
    setSearchParams({ open: id });
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

  // Format Helper
  const formatName = (name) => name ? name.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) : '';

  if (loading) return <div className="p-8 text-center text-gray-500">Loading projects...</div>;

  const isNewMode = searchParams.get('new') === 'true';
  // Don't show selector if we have a draft loaded, even if product object might be momentarily checking
  const showSelector = isNewMode && (!expandedProject || (!expandedProject.product && !expandedProject._isDraft));

  // Split projects
  const activeProjects = projects.filter(p => !p.status?.toLowerCase().includes("completed"));
  const completedProjects = projects.filter(p => p.status?.toLowerCase().includes("completed"));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 flex flex-row items-center justify-between gap-4 pb-4 pt-1 mb-2">
        <h1 className="heading-page">Projects</h1>
        <div className="flex flex-col-reverse md:flex-row items-end md:items-center gap-2 md:gap-3">
            {draftInfo && (
                 <Button
                    variant="warning"
                    onClick={handleContinueDraft}
                    className="flex items-center gap-2 text-sm font-bold"
                 >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {draftInfo.isNew 
                        ? "Continue New Project" 
                        : `Continue Editing #${draftInfo.id}`}
                 </Button>
             )}
        </div>
      </div>
      
      <div className="mt-2 flex flex-col gap-4">
        <ToolsCard defaultOpen={false} />

        <CollapsibleCard 
            title="Active Projects" 
            defaultOpen={true}
        >
             {/* Pass custom onOpen and onDelete handlers */}
             <ProjectTable projects={activeProjects} onOpen={handleOpenProject} onDelete={handleDeleteProject} />
        </CollapsibleCard>

        <CollapsibleCard 
            title="Completed Projects" 
            defaultOpen={false}
        >
             {/* Pass custom onOpen and onDelete handlers */}
             <ProjectTable projects={completedProjects} onOpen={handleOpenProject} onDelete={handleDeleteProject} />
        </CollapsibleCard>

        <CollapsibleCard 
            title="Recovery" 
            defaultOpen={false}
        >
            {loadingDeleted ? (
                <div className="text-center py-4 text-gray-500">Loading deleted projects...</div>
            ) : deletedProjects.length > 0 ? (
                <div className="space-y-2">
                    {deletedProjects.map((project) => (
                        <div
                            key={project.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {project.name || "Untitled"}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {project.type || "No type"} • {project.client || "No client"} • {project.status}
                                </div>
                            </div>
                            <Button
                                onClick={() => handleRecoverProject(project.id, project.name)}
                                variant="success"
                                size="sm"
                            >
                                Recover
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4 text-gray-500">No deleted projects found.</div>
            )}
        </CollapsibleCard>

        <LegalCard />
      </div>
      
      <StickyActionBar>
          <Button
            onClick={() => {
                localStorage.removeItem('autodraw_draft');
                setSearchParams({ new: 'true' });
            }}
            className="w-full"
          >
            New Project
          </Button>
      </StickyActionBar>

      {/* Product Selector Overlay */}
      {showSelector && (
        <div 
          className="fixed inset-0 z-[200] flex justify-center items-start pt-32 transition-colors bg-white/5 backdrop-blur-[1px]"
          onClick={handleCloseProject}
        >
          <div 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 w-full max-w-sm flex flex-col gap-4 animate-fade-in-down"
              onClick={(e) => e.stopPropagation()}
          >
              <div className="text-center border-b border-gray-100 dark:border-gray-700 pb-3">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Project</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Choose a product to start</p>
              </div>
              
              <div className="flex flex-col gap-3">
                  {productsList?.length > 0 ? productsList.map(p => (
                    <Button
                      key={p.id || p.name}
                      onClick={() => handleProductSelect(p)}
                      className="w-full text-center text-lg py-3 shadow-sm hover:scale-[1.02] transition-transform"
                    >
                       {formatName(p.name)}
                    </Button>
                  )) : (
                      <div className="text-center text-gray-500 py-4">Loading products...</div>
                  )}
                  
                  <button 
                    onClick={handleCloseProject}
                    className="mt-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-medium underline decoration-transparent hover:decoration-current transition-all"
                  >
                    Cancel
                  </button>
              </div>
          </div>
          <style>{`
            @keyframes fade-in-down { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
          `}</style>
        </div>
      )}

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

      {/* Render Inline Editor if a project is expanded OR new mode */}
      {(expandedProject && !showSelector) && (
        <ProjectInline 
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
