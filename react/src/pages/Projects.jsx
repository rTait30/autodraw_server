import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { apiFetch } from '../services/auth';
import CollapsibleCard from '../components/CollapsibleCard';
import ToolsCard from '../components/ToolsCard';
import ProjectTable from '../components/ProjectTable';
import ProjectInline from '../components/ProjectInline';
import StickyActionBar from '../components/StickyActionBar';
import { Button } from '../components/UI';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const productsList = useSelector(state => state.products.list);
  
  // Inline expansion state
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedProject, setExpandedProject] = useState(null);
  
  const navigate = useNavigate();

  // Draft State -- null if no draft, else object { isNew, id, name }
  const [draftInfo, setDraftInfo] = useState(null);

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

  useEffect(() => {
    fetchProjects();
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

  // Format Helper
  const formatName = (name) => name ? name.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) : '';

  if (loading) return <div className="p-8 text-center text-gray-500">Loading projects...</div>;

  const isNewMode = searchParams.get('new') === 'true';
  // Don't show selector if we have a draft loaded, even if product object might be momentarily checking
  const showSelector = isNewMode && (!expandedProject || (!expandedProject.product && !expandedProject._isDraft));

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
            title="Projects" 
            defaultOpen={true}
        >
             {/* Pass custom onOpen handler to override default navigation */}
             <ProjectTable projects={projects} onOpen={handleOpenProject} />
        </CollapsibleCard>
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
