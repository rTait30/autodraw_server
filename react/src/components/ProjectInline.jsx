import React, { useRef, useEffect, useState, Suspense, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProducts } from '../store/productsSlice'; // Added redux action
import ProjectForm from './ProjectForm'; // Use ProjectForm wrapper
import StickyActionBar from './StickyActionBar';
import ProjectOverlay from './ProjectOverlay';
import SimpleEstimateTable from './SimpleEstimateTable';
import ProjectDocuments from './ProjectDocuments';
import Toast from './Toast';
import { apiFetch } from '../services/auth';
import { TOAST_TAGS } from "../config/toastRegistry";
import { Button } from './UI';
import { useNavigate } from 'react-router-dom';
import CollapsibleCard from './CollapsibleCard';
import PageHeader from './PageHeader';
import ConfirmOverlay from './ConfirmOverlay';
import { discardDraftAndCloseInline } from '../utils/draft';

// Helper to load dynamic form components (used internally by ProjectForm now)
// async function loadTypeResources(type) { ... } REMOVED

const ProjectInline = ({
  project = null,
  isNew = false,
  onClose = () => {},
  onSaved = () => {},
  requestSaveToken = 0,
  onDraftMeta = null,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const productsList = useSelector(state => state.products.list);
  const productsStatus = useSelector(state => state.products.status);
  
  // Local state for the "working copy"
  const [editedProject, setEditedProject] = useState(project);
  const [hasCalculatedOrSaved, setHasCalculatedOrSaved] = useState(!isNew);
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
  const [savedIndicatorVisible, setSavedIndicatorVisible] = useState(false);
  // With the editor kept mounted in-memory, we can write to localStorage less frequently.
  const [saveInterval, setSaveInterval] = useState(30000);

  const [replaceConfirm, setReplaceConfirm] = useState({ show: false });

  // Reduce autosave frequency after 1 minute
  useEffect(() => {
    const timer = setTimeout(() => {
        setSaveInterval(60000);
    }, 60000);
    return () => clearTimeout(timer);
  }, []);

  // Handle autosave indicator visibility
  useEffect(() => {
    if (lastAutoSaved) {
      setSavedIndicatorVisible(true);
      const timer = setTimeout(() => {
        setSavedIndicatorVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastAutoSaved]);

  // Toast State
  const [toast, setToast] = useState(null);
  
  // Dev mode toggle
  const devMode = useSelector(state => state.toggles.devMode);

  // User Role
  const role = localStorage.getItem('role');
  const isAdminOrEstimator = ['estimator', 'admin'].includes(role);
  const isStaff = ['estimator', 'admin', 'designer'].includes(role);

  // Load type-specific form & schema when project changes
  useEffect(() => {
    setEditedProject(project);
    setHasCalculatedOrSaved(!isNew);
    if (!project) return;
    // loadFormForProject(project); // Legacy loader removed
    
    // Load schema
    // Use the source of truth (formulas) for editing
    // The evaluated schema is passed separately for display
    const formulaSchema = project?.estimate_schema || null;
    setSchema(formulaSchema);
    setEditedSchema(formulaSchema);
    
    // Initial Viz Render
    if (project) renderPreview(project);

    // Reset overlay mode when project prop changes (e.g. switching projects)
    setOverlayMode(null);
    setIsClosing(false);
  }, [project]);

  // Ensure visualization updates when project data or visibility changes
  useEffect(() => {
    // Only render in inline mode (null) or preview mode. 
    // Confirm/Success modes don't use the canvas.
    const shouldRender = !overlayMode || overlayMode === 'preview';
    
    if (hasCalculatedOrSaved && editedProject && canvasRef.current && shouldRender) {
        // Small timeout to ensure DOM is settled if switching modes (rendering into overlay)
        // Especially important since CollapsibleCard reparents the canvas
        requestAnimationFrame(() => {
             renderPreview(editedProject);
        });
    }
  }, [hasCalculatedOrSaved, editedProject, overlayMode]);

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
  const syncEditedFromForm = useCallback(() => {
    const values = formRef.current?.getValues?.();
    if (!values) return editedProject;

    return {
      ...editedProject,
      general: values.general || editedProject?.general || {},
      project_attributes: values.project_attributes || editedProject?.project_attributes || {},
      products: values.products || editedProject?.products || [],
      submitToWG: values.submitToWG,
    };
  }, [editedProject]);

  const resolveDraftName = (data) => {
    const name = data?.general?.name;
    return (typeof name === 'string' && name.trim()) ? name.trim() : 'Untitled';
  };

  const saveDraftNow = useCallback(() => {
    // Don't save if in overlay mode (confirming/previewing) or closing
    if (overlayMode === 'confirm' || isClosing) return;

    // Check if user is still logged in (since logout clears localStorage)
    if (!localStorage.getItem('username')) return;

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
        timestamp: Date.now(),
        username: localStorage.getItem('username')
      };
      localStorage.setItem('autodraw_draft', JSON.stringify(draft));
      setLastAutoSaved(Date.now());

      if (onDraftMeta) {
        onDraftMeta({ name: resolveDraftName(currentData) });
      }
    } catch (e) {
      console.warn("Autosave failed", e);
    }
  }, [overlayMode, isClosing, isNew, syncEditedFromForm, onDraftMeta]);

  // Autosave Draft
  useEffect(() => {
    // Save periodically based on current interval
    const intervalId = setInterval(saveDraftNow, saveInterval); 
    return () => clearInterval(intervalId);
  }, [saveDraftNow, saveInterval]);

  // Allow parent (bottom bar) to request an immediate save on hide/close/navigation.
  useEffect(() => {
    if (!requestSaveToken) return;
    saveDraftNow();
  }, [requestSaveToken, saveDraftNow]);

  const handleCheck = async () => {
    // Ensure form is accessible before checking

    setOverlayMode('preview');

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
        estimate_schema: editedSchema, // Send current schema state for immediate recosting with edits
      };

      const res = await apiFetch('/projects/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Calculation failed');
      
      const result = await res.json();
      
      // Merge result but preserve product/type objects if backend returns incomplete data
      setHasCalculatedOrSaved(true);
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
      
      // Trigger overlay only on mobile/tablet (below lg breakpoint) to show results without scrolling
      if (window.innerWidth < 1024) {
          setOverlayMode('preview');
          setIsClosing(false);
      }

    } catch (e) {
      console.error(e);
      
      //showToast(TOAST_TAGS.GENERIC_ERROR, { args: [`checking project: ${e.message}`] })
      
      setToast({
        message: `checking project: ${e.message}`,
        type: "error",
        duration: 4000,
      });
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
          setToast({
            message: `Please resolve discrepancies in: ${problems.join(", ")}`,
            type: "error",
            duration: 4000,
          });
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
        //showToast('No edited values to submit.');

        setToast({
          message: 'No edited values to submit.',
          type: "error",
          duration: 4000,
        });

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
        setToast({
          message: `Please resolve discrepancies in: ${problems.join(", ")}`,
          type: "error",
          duration: 4000,
        });
        return;
      }
      
      const effectiveId = base.id || editedProject?.id;
      const isCreating = isNew && !effectiveId;

      const payload = {
        // If updating, include ID
        ...(isCreating ? {} : { id: effectiveId }),
        product_id: base.product_id || base.product?.id,
        general: base.general || {},
        project_attributes: base.project_attributes || {},
        products: base.products || [],
        estimate_total: currentEstimateTotal,
        submitToWG: base.submitToWG,
      };
      
      console.log('Submitting payload:', JSON.parse(JSON.stringify(payload)));

      let url = isCreating ? "/projects/create" : `/products/edit/${effectiveId}`;
      let method = isCreating ? "POST" : "PUT";

      const res = await apiFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res) return;

      const json = await res.json();
      if (!res.ok || json?.error) {
        setToast({
          message: `Update failed: ${json?.error || res.statusText}`,
          type: "error",
          duration: 4000,
        });
        return;
      }

      // If new, json is the full object. If edit, json might have { project: ... } or just be the project
      // Standardize response handling
      // Ensure we preserve the product/type info from existing state if missing in response (to prevent unmount)
      const serverData = json?.project || json || {};
      setHasCalculatedOrSaved(true);
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
      
      // Ensure schemas are updated so estimate table remains visible/current
      if (updatedProject.estimate_schema_evaluated) {
        setSchema(updatedProject.estimate_schema_evaluated);
      }
      if (updatedProject.estimate_schema) {
         setEditedSchema(updatedProject.estimate_schema);
         // If evaluated is missing (e.g. strict save), ensure 'schema' is not stale 
         // if it was previously undefined or we want to reset to formula.
         // This ensures the Estimate component remains visible (it checks 'schema').
         if (!updatedProject.estimate_schema_evaluated) {
             setSchema(updatedProject.estimate_schema);
         }
      }

      //showToast(isNew ? "Project Created!" : "Project Updated!");

      setToast({
        message: (isNew ? "Project Created!" : "Project Updated!"),
        duration: 4000,
      });
      
      // Clear draft on success
      localStorage.removeItem('autodraw_draft');
      
      onSaved();
      
      // Improve UX: Show success message in overlay instead of abrupt close/navigate
      setOverlayMode('success');
      
      // If this was a NEW project, we technically need to switch the URL context to Edit check
      // so if they choose "Continue Editing", they are on the edit page, not "create new" page.
      // However, navigating might unmount this component.
      // If we are in "NewProject" component, this ProjectInline is child.
      // If we navigate, we lose state.
      // For now, let's keep them here. If they refresh, they lose it, but "Continue Editing" just closes overlay.
      // The local state `editedProject` is updated with ID, so subsequent saves should be updates.
      // Ideally we'd replace the URL history without reloading.
      if (isNew && updatedProject?.id) {
          window.history.replaceState(null, '', `/copelands/projects?open=${updatedProject.id}`);
      }
      
    } catch (e) {
      console.error('Submit error:', e);
      setToast({
        message: `Error submitting project: ${e.message}`,
        type: "error",
        duration: 4000,
      });
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
    //showToast(TOAST_TAGS.SCHEMA_SUBMIT_NOT_IMPLEMENTED);
    setToast({
        message: 'Schema submit not implemented yet; preview uses the edited schema.',
        type: "error",
        duration: 4000,
      });
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
  
  const handleReturnToProjects = () => {
      navigate('/copelands/projects');
  };

  const handleStartNewProject = () => {
    setReplaceConfirm({ show: true });
  };

  const cancelReplaceConfirm = () => setReplaceConfirm({ show: false });
  const confirmReplaceConfirm = () => {
    setReplaceConfirm({ show: false });

    // Ensure draft is discarded and any bottom-bar inline editor is shut down.
    discardDraftAndCloseInline();

    // Close this editor (GeneralBottomBar portal or Projects page inline).
    onClose({ discardDraft: true });

    // Use the existing Projects new flow.
    navigate('/copelands/projects?new=true');
  };

  // Fetch products if missing when needing to select one
  useEffect(() => {
    if (isNew && !project?.product?.name && productsStatus === 'idle') {
        dispatch(fetchProducts()); 
    }
  }, [isNew, project, productsStatus, dispatch]);
  
  const productName = editedProject?.product?.name || editedProject?.type?.name;

  const onCloseSelect = () => {
    // If we have no product selected yet, treat close as "cancel project creation" and return to projects list.
    if (!productName) {
        handleReturnToProjects();
    } else {
        // Otherwise, just close the overlay and return to editing (e.g. if they want to change product)
        setOverlayMode(null);
    }
  };


  // New logic: Simple overlay for product selection
  if (!productName && isNew) {
      return (
          <div 
            className="fixed inset-0 z-[200] flex justify-center items-start pt-32 bg-white/5"
          >
            <div 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 w-full max-w-sm flex flex-col gap-4"
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
                        onClick={() => setEditedProject({
                          product: p,
                          general: { name: 'New Project' },
                          status: 'New'
                        })}
                        className="w-full text-center text-lg py-3 shadow-sm"
                      >
                          {p.name}
                      </Button>
                    )) : (
                        <div className="text-center text-gray-500 py-4">Loading products...</div>
                    )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close project overlay"
                  className = "underline hover:text-gray-700 dark:hover:text-gray-300 mt-4"
                >
                  Cancel
                </button>
            </div>
            {/* Animations removed: fade-in-down keyframes and related class removed */}
          </div>
      );
  }

  if (!productName) return null;

  return (


    <div className="fixed top-0 left-0 right-0 z-[40] flex flex-col bg-white dark:bg-gray-900 transition-opacity overflow-hidden pb-4" style={{ bottom: 'var(--bottom-nav-height, 85px)' }}>

      <ConfirmOverlay
        show={replaceConfirm.show}
        title="Start New Project?"
        message="Start a new project? This will discard any unsaved changes and replace your saved draft."
        confirmLabel="Start New"
        confirmVariant="danger"
        onCancel={cancelReplaceConfirm}
        onConfirm={confirmReplaceConfirm}
      />

      {/* Header Bar - includeNav={false} because parent layout already has Nav */}
      <PageHeader
        title={editedProject?.general?.name || `Project #${editedProject?.id || 'New'}`}
        subtitle={`${editedProject?.status || 'New'} ${productName ? `• ${productName}` : ''}`}
        fixed={false}
        hideBackButton={true}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      )}


        {lastAutoSaved && savedIndicatorVisible && (
        <div 
          className="absolute right-4 top-24 flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm pointer-events-none select-none z-[70] opacity-100 translate-y-0"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Saved {new Date(lastAutoSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        )}

      {/* Scrollable Content */}
      <div className={`flex-1 overflow-y-auto overscroll-y-contain bg-gray-100 dark:bg-gray-900 ${(productName && overlayMode !== 'success') ? '!pb-24' : ''}`}>
        <div className="max-w-[1800px] mx-auto p-2 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
            
            {/* Left: Form */}
            <CollapsibleCard 
              title="Project Specifications" 
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
            <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto custom-scrollbar z-40">
              
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
                      <SimpleEstimateTable 
                        schema={editedSchema} 
                        evaluatedSchema={editedProject?.estimate_schema_evaluated}
                        onTotalChange={setCurrentEstimateTotal} 
                        onChange={handleSchemaCheck}
                        onRecost={handleCheck}
                        projectId={editedProject?.id}
                        productId={editedProject?.product?.id || editedProject?.product_id || editedProject?.type?.id}
                        canSaveTemplate={isAdminOrEstimator}
                        devMode={devMode}
                      />
                   </div>
                </CollapsibleCard>
              )}

              {/* Documents Section - Show for staff always, show for clients if they have visible documents */}
              {!overlayMode && (isStaff || editedProject?.product?.capabilities?.documents?.length > 0) && (
                <CollapsibleCard 
                    title="Downloads" 
                    defaultOpen={true}
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    }
                >
                     <div className="p-5">
                        <ProjectDocuments project={editedProject} isStaff={isStaff} />
                     </div>
                </CollapsibleCard>
              )}

              {hasCalculatedOrSaved && (
              <CollapsibleCard 
                  title={overlayMode === 'confirm' ? "Confirm Details" : overlayMode === 'success' ? "Success" : "Visualisation"}
                  isOverlay={!!overlayMode}
                  onClose={overlayMode ? closeOverlay : null}
                  defaultOpen={true}
                  className="!top-4 !bottom-32 md:!top-32 md:!bottom-32"
                  contentClassName={(!overlayMode || overlayMode === 'preview') ? "!p-0 bg-gray-50 dark:bg-gray-900 relative" : ""}
              >
                <ProjectOverlay
                  mode={overlayMode}
                  isClosing={isClosing}
                  onClose={closeOverlay}
                  onReturn={handleReturnToProjects}
                  canvasRef={canvasRef}
                  project={editedProject}
                  productName={productName}
                  devMode={devMode}
                  toggleData={toggleData}
                  setToggleData={setToggleData}
                />
              </CollapsibleCard>
              )}
            </div>

          </div>
        </div>
      </div>

      {productName && overlayMode !== 'success' && (
      <StickyActionBar mode="fixed">
        {(overlayMode === 'preview' || overlayMode === 'confirm') ? (
          <>
            <Button onClick={closeOverlay} variant="danger" className="flex-1">
              Continue Editing
            </Button>
            <Button onClick={handleSave} variant="submit" className="flex-1">
              Submit {isNew ? 'Project' : 'Changes'}
            </Button>
          </>
        ) : (
          <Button onClick={handleCheck} variant="submit" className="flex-1">
            View / Submit
          </Button>
        )}
      </StickyActionBar>
    )}
    </div>
  );
}

export default ProjectInline;

