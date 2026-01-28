import React, { useRef, useEffect, useState, Suspense, useMemo } from 'react';
import { useSelector } from 'react-redux';
import ProjectForm from './ProjectForm'; // Use ProjectForm wrapper
import StickyActionBar from './StickyActionBar';
import ProjectOverlay from './ProjectOverlay';
import SimpleEstimateTable from './SimpleEstimateTable';
import ProjectDocuments from './ProjectDocuments';
import { useToast } from './Toast';
import { apiFetch } from '../services/auth';
import { TOAST_TAGS } from "../config/toastRegistry";
import { Button } from './UI';
import { useNavigate } from 'react-router-dom';
import CollapsibleCard from './CollapsibleCard';

// Helper to load dynamic form components (used internally by ProjectForm now)
// async function loadTypeResources(type) { ... } REMOVED

const ProjectInline = ({ project = null, isNew = false, onClose = () => {}, onSaved = () => {} }) => {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Local state for the "working copy"
  const [editedProject, setEditedProject] = useState(project);
  // const [Form, setForm] = useState(null); // REMOVED
  const [toggleData, setToggleData] = useState(false);
  const [overlayMode, setOverlayMode] = useState(null); // 'preview' | 'confirm' | null
  const [isClosing, setIsClosing] = useState(false);
  
  // Estimate / Schema State
  const [schema, setSchema] = useState(null);
  const [editedSchema, setEditedSchema] = useState(null);
  const [estimateVersion, setEstimateVersion] = useState(0);
  const [currentEstimateTotal, setCurrentEstimateTotal] = useState(0);
  const [toggleSchemaEditor, setToggleSchemaEditor] = useState(false);

  // Autosave status state
  const [lastAutoSaved, setLastAutoSaved] = useState(null);

  // Toast State
  const { showToast, ToastDisplay } = useToast();
  
  // Dev mode toggle
  const devMode = useSelector(state => state.toggles.devMode);

  // User Role
  const role = localStorage.getItem('role');
  const isAdminOrEstimator = ['estimator', 'admin'].includes(role);
  const isStaff = ['estimator', 'admin', 'designer'].includes(role);

  // Load type-specific form & schema when project changes
  useEffect(() => {
    setEditedProject(project);
    if (!project) return;
    // loadFormForProject(project); // Legacy loader removed
    
    // Load schema
    // Prefer the Evaluated schema (results of calculation)
    // Fallback to template schema if not yet calculated
    const backendSchema = project?.estimate_schema_evaluated || project?.estimate_schema || null;
    setSchema(backendSchema);
    setEditedSchema(backendSchema);
    
    // Initial Viz Render
    if (project) renderPreview(project);

    // Reset overlay mode when project prop changes (e.g. switching projects)
    setOverlayMode(null);
    setIsClosing(false);
  }, [project]);

  // Helper to load form - REMOVED (Handled by ProjectForm)
  /*
  const loadFormForProject = (proj) => {
    const productName = proj?.product?.name || proj?.type?.name;
    if (productName) {
      loadTypeResources(productName).then(({ Form }) => setForm(() => Form));
    } else {
      setForm(null);
    }
  };
  */

  // Select Product Handler (for New Projects)
  // const handleSelectProduct = (product) => { ... } // MOVED TO PARENT
    
  // Reset canvas when project changes
  useEffect(() => {
    if (canvasRef.current && editedProject) {
      // Logic handled in renderPreview called by check/calc or explicit effect?
      // For now, let's just clear
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [editedProject?.product?.id]); // clear when product changes

  // Sync Form -> State
  const syncEditedFromForm = () => {
    const values = formRef.current?.getValues?.();
    if (!values) return editedProject;
    
    return {
      ...editedProject,
      general: values.general || editedProject?.general || {},
      project_attributes: values.project_attributes || editedProject?.project_attributes || {},
      products: values.products || editedProject?.products || [],
    };
  };

  // Autosave Draft
  useEffect(() => {
    const saveDraft = () => {
      // Don't save if in overlay mode (confirming/previewing) or closing
      if (overlayMode === 'confirm' || isClosing) return;

      // CRITICAL: Only save if we can actually read the form.
      // If formRef isn't attached, we might overwrite a good draft with an empty shell.
      if (!formRef.current || !formRef.current.getValues) return;

      const currentData = syncEditedFromForm();
      if (!currentData) return;

      // Basic validity check - don't save empty shells if not useful
      if (!currentData.product && !currentData.type) return;

      try {
        const draft = {
           project: currentData,
           isNew: isNew,
           timestamp: Date.now()
        };
        localStorage.setItem('autodraw_draft', JSON.stringify(draft));
        setLastAutoSaved(Date.now());
      } catch (e) {
        console.warn("Autosave failed", e);
      }
    };

    // Save less frequently (10s) to avoid performance hits
    const intervalId = setInterval(saveDraft, 30000); 
    return () => clearInterval(intervalId);
  }, [editedProject, isNew, overlayMode, isClosing]); // Deps are fine, syncEditedFromForm uses ref

  const handleCheck = async () => {
    // Ensure form is accessible before checking
    if (!formRef.current) {
        // If the form isn't ready, don't submit empty data (which wipes the project)
        console.warn("Form reference missing - cannot calculate.");
        return;
    }

    const base = syncEditedFromForm();
    if (!base) return;

    try {
      const payload = {
        // If updating, include ID so backend can find existing schema
        ...(isNew ? {} : { id: base.id }),
        product_id: base.product_id || base.product?.id,
        general: base.general || {},
        project_attributes: base.project_attributes || {},
        products: base.products || [],
      };

      const res = await apiFetch('/projects/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Calculation failed');
      
      const result = await res.json();
      
      // Merge result but preserve product/type objects if backend returns incomplete data
      const updated = { 
          ...base, 
          ...result, 
          products: result.products || base.products,
          product: result.product || base.product, // Preserve product object
          type: result.type || base.type           // Preserve type object
      };
      
      setEditedProject(updated);

      // Temporary update of schema for preview without save
      if (result.estimate_schema_evaluated) {
          setSchema(result.estimate_schema_evaluated);
      }
      
      // Attempt to render preview (simple version for now)
      renderPreview(updated);
      showToast(TOAST_TAGS.CALCULATION_COMPLETE);
      
      // Trigger overlay only on mobile/tablet (below lg breakpoint) to show results without scrolling
      if (window.innerWidth < 1024) {
          setOverlayMode('preview');
          setIsClosing(false);
      }

    } catch (e) {
      console.error(e);
      showToast(TOAST_TAGS.GENERIC_ERROR, { args: [e.message] });
    }
  };

  // Submit changes to server
  const handleSave = async () => {
    // Show confirmation screen first (Removed mobile check to allow on desktop too per request)
    if (overlayMode !== 'confirm') {
        const base = syncEditedFromForm() || editedProject;
        
        // Prevent submission if discrepancies exist
        const problems = (base.products || []).reduce((acc, p, idx) => {
            const orig = editedProject?.products?.[idx];
            if (p.attributes?.discrepancyProblem || orig?.attributes?.discrepancyProblem) {
                acc.push(`${p.name || orig?.name || 'Sail'} (#${idx + 1})`);
            }
            return acc;
        }, []);

        if (problems.length > 0) {
            showToast(TOAST_TAGS.GENERIC_ERROR, { args: [`Please resolve discrepancies in: ${problems.join(', ')}`] });
            return;
        }

        // Ensure we have the latest form data in state before showing summary
        setEditedProject(base);
        setOverlayMode('confirm');
        setIsClosing(false);
        return;
    }

    try {
      const base = syncEditedFromForm() || editedProject;
      if (!base) {
        showToast('No edited values to submit.');
        return;
      }

      const problems = (base.products || []).reduce((acc, p, idx) => {
        const orig = editedProject?.products?.[idx];
        if (p.attributes?.discrepancyProblem || orig?.attributes?.discrepancyProblem) {
            acc.push(`${p.name || orig?.name || 'Sail'} (#${idx + 1})`);
        }
        return acc;
      }, []);

      if (problems.length > 0) {
        showToast(TOAST_TAGS.GENERIC_ERROR, { args: [`Please resolve discrepancies in: ${problems.join(', ')}`] });
        return;
      }

      const payload = {
        // If updating, include ID
        ...(isNew ? {} : { id: base.id }),
        product_id: base.product_id || base.product?.id,
        general: base.general || {},
        project_attributes: base.project_attributes || {},
        products: base.products || [],
        estimate_total: currentEstimateTotal,
      };
      
      console.log('Submitting payload:', JSON.parse(JSON.stringify(payload)));

      let url = isNew ? "/projects/create" : `/products/edit/${base.id}`;
      let method = isNew ? "POST" : "PUT";

      const res = await apiFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res) return;

      const json = await res.json();
      if (!res.ok || json?.error) {
        showToast(`Update failed: ${json?.error || res.statusText}`);
        return;
      }

      // If new, json is the full object. If edit, json might have { project: ... } or just be the project
      // Standardize response handling
      // Ensure we preserve the product/type info from existing state if missing in response (to prevent unmount)
      const serverData = json?.project || json || {};
      const updatedProject = { 
           ...base, 
           ...serverData,
           // Preserve nested objects if missing in server response but present in base
           product: serverData.product || base.product || editedProject?.product,
           type: serverData.type || base.type || editedProject?.type,
      };

      console.log('Updated project:', updatedProject);
      
      // Update local state immediately so UI reflects changes (important for edits)
      setEditedProject(updatedProject);
      if (updatedProject.estimate_schema_evaluated) {
        setSchema(updatedProject.estimate_schema_evaluated);
      }

      showToast(isNew ? "Project Created!" : "Project Updated!");
      
      // Clear draft on success
      localStorage.removeItem('autodraw_draft');
      
      onSaved();
      
      // Close the confirmation overlay immediately upon success
      setOverlayMode(null);

      // Only navigate if it was a new project creation to switch context to 'Edit' mode
      if (isNew && updatedProject?.id) {
         navigate(`/copelands/projects?open=${updatedProject.id}`);
      }
      
    } catch (e) {
      console.error('Submit error:', e);
      showToast(TOAST_TAGS.GENERIC_ERROR, { args: [`submitting project: ${e.message}`] });
    }
  };

  const renderPreview = async (proj) => {
    if (!canvasRef.current || !proj) return;
    const productName = (proj.product?.name || proj.type?.name || '').toUpperCase();
    
    try {
      const module = await import(`./products/${productName}/Display.js`);
      if (typeof module.render === 'function') {
        module.render(canvasRef.current, {
          products: proj.products || [],
          project_attributes: proj.project_attributes || {},
        });
      }
    } catch (e) {
      console.warn('No display module found or render failed', e);
      // Fallback text
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0,0,800,300);
      ctx.fillStyle = '#666';
      ctx.fillText('Preview not available', 20, 30);
    }
  };

  // Allow closing with Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Schema Handlers
  const handleSchemaCheck = (next) => setEditedSchema(next);
  const handleSchemaReturn = () => setEditedSchema(schema);
  const handleSchemaSubmit = (next) => {
    console.log('[Schema submit] (stub):', next);
    showToast(TOAST_TAGS.SCHEMA_SUBMIT_NOT_IMPLEMENTED);
  };
  
  // Bump version on schema change
  useEffect(() => {
    setEstimateVersion(v => v + 1);
  }, [editedSchema]);

  const closeOverlay = () => {
    setIsClosing(true);
    setTimeout(() => {
        setIsClosing(false);
        setOverlayMode(null);
    }, 300); // match animation duration
  };

  const productName = editedProject?.product?.name || editedProject?.type?.name;

  if (!productName) return null;

  return (
    <div className="fixed inset-0 top-[60px] z-[60] flex flex-col bg-white dark:bg-gray-900 transition-opacity animate-fade-in-up overflow-hidden">
      
      {/* Toast Overlay - Positioned above StickyActionBar (approx 80px + margin) */}
      <ToastDisplay className="bottom-[100px] mb-safe" /> 

      {/* Header Bar */}
      <div className="flex-none flex items-center justify-between px-4 py-4 md:px-8 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm z-10">
        <div className="flex items-center gap-4">
            <button 
                onClick={onClose}
                className="flex text-md items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 font-medium text-lg"
                aria-label="Back to Projects"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Projects</span>
            </button>
            <div className="hidden sm:block h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                        {editedProject?.general?.name || `Project #${editedProject?.id || 'New'}`}
                    </h2>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                {editedProject?.status || 'New'} {productName ? `• ${productName}` : ''}
                </div>
            </div>
        </div>
        {lastAutoSaved && (
            <div className="text-lg text-gray-300 dark:text-gray-600 font-normal flex items-center gap-2 animate-fade-in select-none">
                <svg className="w-8 h-8 text-green-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Last saved {new Date(lastAutoSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain bg-gray-100 dark:bg-gray-900">
        <div className="max-w-[1800px] mx-auto p-2 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
            
            {/* Left: Form */}
            <CollapsibleCard 
              title="Project Specification" 
              className="lg:col-span-7 xl:col-span-8"
              defaultOpen={true}
            >
              {productName ? (
                <Suspense fallback={<div className="p-12 text-center text-lg text-gray-500">Loading form components...</div>}>
                  <div className="p-1">
                    <ProjectForm
                        product={productName}
                        formRef={formRef}
                        rehydrate={editedProject}
                    />
                  </div>
                  {/* Action Bar Moved to Page Footer */}
                </Suspense>
              ) : (
                <div className="p-16 text-center text-gray-500 italic text-lg">Form definition not found for this product type.</div>
              )}
            </CollapsibleCard>

            {/* Right: Viz (Sticky Sidebar and Overlay Wrapper) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto custom-scrollbar">
              
              {/* Estimate Section (Visible in sidebar mode) */}
              {!overlayMode && isStaff && schema && (
                <CollapsibleCard 
                  title="Project Estimate" 
                  defaultOpen={false} // Collapsed by default on mobile (implied logic, though defaultOpen=true is default prop, I set explicit if desired. User asked 'could be collapsable'. I set false for compactness?)
                  // Actually usually spec is main, estimates secondary.
                  icon={
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 36-3 3-3-3m3 3V10m0 20a9 9 0 110-18 9 9 0 010 18z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                  }
                >
                   <div className="p-5">
                      <SimpleEstimateTable schema={schema} onTotalChange={setCurrentEstimateTotal} />
                   </div>
                </CollapsibleCard>
              )}

              {/* Documents Section (Visible in sidebar mode) */}
              {!overlayMode && isStaff && (
                 <ProjectDocuments project={editedProject} showToast={showToast} />
              )}

              <CollapsibleCard 
                  title="Visualisation" 
                  forceOpen={!!overlayMode}
                  className={overlayMode ? "!border-0 !shadow-none !bg-transparent !rounded-none !overflow-visible" : ""} // Reset card styles when overlay active
                  defaultOpen={true}
              >
                <ProjectOverlay
                  mode={overlayMode}
                  isClosing={isClosing}
                  onClose={closeOverlay}
                  canvasRef={canvasRef}
                  project={editedProject}
                  productName={productName}
                  devMode={devMode}
                  toggleData={toggleData}
                  setToggleData={setToggleData}
                />
              </CollapsibleCard>
            </div>

          </div>
        </div>
      </div>

      {/* Footer Action Bar */}
      {productName && (
        <StickyActionBar 
          mode="static"
          className="!mt-0 px-4 py-4 md:px-8 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-50">
            {overlayMode === 'confirm' ? (
            <>
                <Button 
                    onClick={closeOverlay} 
                    className="bg-gray-500 hover:bg-gray-600 text-white border-transparent flex-1 justify-center py-3 text-lg"
                    variant="custom"
                >
                Back
                </Button>
                <Button 
                    onClick={handleSave} 
                    className="flex-[2] justify-center py-3 text-lg bg-green-600 hover:bg-green-700 text-white border-transparent"
                    variant="custom"
                >
                Confirm & {isNew ? 'Create' : 'Save'}
                </Button>
            </>
            ) : (
            <>
                <Button 
                    onClick={overlayMode === 'preview' ? closeOverlay : handleCheck} 
                    className="flex-1 justify-center py-3 text-md"
                    variant={overlayMode === 'preview' ? 'danger' : 'primary'}
                >
                {overlayMode === 'preview' ? 'Close Preview' : 'Check / Calculate'}
                </Button>
                <Button onClick={handleSave} variant="submit">
                {isNew ? 'Submit Project' : 'Submit Changes'}
                </Button>
            </>
            )}
        </StickyActionBar>
      )}
      
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.25s ease-out forwards;
        }
        @keyframes slide-up-card {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up-card {
          animation: slide-up-card 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slide-down-card {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        .animate-slide-down-card {
          animation: slide-down-card 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

export default ProjectInline;

