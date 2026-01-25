import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { apiFetch } from '../services/auth';
import ProjectTable from '../components/ProjectTable';
import ProjectInline from '../components/ProjectInline';
import StickyActionBar from '../components/StickyActionBar';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const productsList = useSelector(state => state.products.list);
  
  // Inline expansion state
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedProject, setExpandedProject] = useState(null);
  
  const navigate = useNavigate();

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
      // Fetch full details for this ID
      apiFetch(`/project/${openId}`)
        .then(res => res.json())
        .then(data => setExpandedProject(data))
        .catch(err => console.error("Failed to load project details", err));
    } else if (isNew) {
      // New mode, wait for user selection or invalidation
    } else {
      setExpandedProject(null);
    }
  }, [searchParams]);

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
  const showSelector = isNewMode && (!expandedProject || !expandedProject.product);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="sm:flex sm:items-center justify-between mb-6">
        <h1 className="headingStyle">Projects</h1>
      </div>
      
      <div className="mt-2 flex flex-col">
        {/* Pass custom onOpen handler to override default navigation */}
        <ProjectTable projects={projects} onOpen={handleOpenProject} />
      </div>
      
      <StickyActionBar>
          <button
            onClick={() => setSearchParams({ new: 'true' })}
            className="buttonStyle w-full"
          >
            New Project
          </button>
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
                    <button
                      key={p.id || p.name}
                      onClick={() => handleProductSelect(p)}
                      className="buttonStyle w-full text-center text-lg py-3 shadow-sm hover:scale-[1.02] transition-transform"
                    >
                       {formatName(p.name)}
                    </button>
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
            handleCloseProject();
          }} 
        />
      )}
    </div>
  );
}


export default Projects;
