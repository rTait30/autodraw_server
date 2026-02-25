import React, { useRef, useEffect, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setAccessToken } from "../services/auth";
import ProjectForm from "../components/ProjectForm";
import Authentication from "../components/Authentication";
import ProjectConfirmation from "../components/ProjectConfirmation";
import ProjectOverlay from "../components/ProjectOverlay";
import StickyActionBar from "../components/StickyActionBar";
import CollapsibleCard from "../components/CollapsibleCard";
import PageHeader from "../components/PageHeader";
import Toast from '../components/Toast';
import { Button } from '../components/UI';

export default function Discrepancy() {
  const navigate = useNavigate();

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [editedProject, setEditedProject] = useState({});
  const [overlayMode, setOverlayMode] = useState(null); // 'preview' | null
  const [isClosing, setIsClosing] = useState(false);
  const [toggleData, setToggleData] = useState(false);
  
  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [savedProject, setSavedProject] = useState(null);

  // Toast / Result State
  const [toast, setToast] = useState(null);

  // Simple check for active account (token/user existence)
  const isLoggedIn = !!localStorage.getItem('username');

  // Check for saved draft on mount
  useEffect(() => {
    const draftStr = localStorage.getItem('autodraw_draft');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.from === 'discrepancy' && draft.project) {
          setEditedProject(draft.project);
          setToast({ msg: "Restored draft project.", type: "info" });
        }
      } catch (e) {
        console.error("Failed to restore draft", e);
      }
    }
  }, []);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
  };

  // Render canvas using Display module when project data changes
  useEffect(() => {
    if (!editedProject || !canvasRef.current) return;

    // Dynamically import Display module for SHADE_SAIL
    import("../components/products/SHADE_SAIL/Display.js")
      .then((module) => {
        const data = {
          products: editedProject.products || [],
          project_attributes: editedProject.project_attributes || {},
          discrepancyChecker: true, 
        };
        if (typeof module.render === "function") {
          module.render(canvasRef.current, data);
        }
      })
      .catch((e) => {
        console.warn("No Display module for SHADE_SAIL:", e.message);
      });
  }, [editedProject]);

  const syncEditedFromForm = () => {
    const values = formRef.current?.getValues?.();
    if (!values) return editedProject || {};
    
    return {
      ...(editedProject || {}),
      general: values.general || editedProject?.general || {},
      project_attributes: values.project_attributes || editedProject?.project_attributes || {},
      products: values.products || editedProject?.products || [],
    };
  };

  const onCheck = async () => {
    const currentData = syncEditedFromForm();
    const products = currentData.products || [];
    
    if (products.length === 0) {
      showToast("Please add at least one sail", "error");
      return;
    }

    // Clear canvas first
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    try {
      const payload = {
        product_id: 2, // SHADE_SAIL
        general: currentData.general || {},
        project_attributes: currentData.project_attributes || {},
        products: products,
      };

      const response = await apiFetch("/projects/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      // Update state with result
      const updated = {
        ...currentData,
        products: result.products || [], // Server returns products with analyzed attributes
        project_attributes: result.project_attributes || {},
      };
      setEditedProject(updated);

      // Check for discrepancies
      let anyProblem = false;
      let maxDisc = 0;
      (result.products || []).forEach(p => {
        const attrs = p.attributes || {};
        if (attrs.discrepancyProblem) anyProblem = true;
        if ((attrs.maxDiscrepancy || 0) > maxDisc) maxDisc = attrs.maxDiscrepancy || 0;
      });

      if (anyProblem) {
        showToast(`Discrepancies found (max: ${maxDisc.toFixed(0)}mm)`, "error");
      } else {
        showToast(`Within tolerance (max: ${maxDisc.toFixed(0)}mm)`, "success");
      }

      // Automatically show overlay on mobile/tablet like ProjectInline
      if (window.innerWidth < 1024) {
        setOverlayMode('preview');
      }

    } catch (error) {
      console.error("Discrepancy check error:", error);
      showToast(`Error: ${error.message}`, "error");
    }
  };

  const onSave = async () => {
    const currentData = syncEditedFromForm();
    const products = currentData.products || [];
    
    if (products.length === 0) {
      showToast("Please add at least one sail before saving", "error");
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').split('.')[0];
    
    // Naming logic: User provided Name > Location > Check {time}
    let finalName = currentData.general?.name;
    if (!finalName && currentData.project_attributes?.location) {
       finalName = currentData.project_attributes.location;
    }
    if (!finalName) {
       finalName = `Check ${dateStr}`;
    }

    // Check login status dynamically as this might be called from a callback
    const userIsLoggedIn = !!localStorage.getItem('username');

    if (!userIsLoggedIn) {
      const draft = {
        isNew: true,
        from: 'discrepancy',
        project: {
          general: { ...(currentData.general || {}), name: finalName },
          product_id: 2,
          project_attributes: currentData.project_attributes || {},
          products: products,
        }
      };
      localStorage.setItem('autodraw_draft', JSON.stringify(draft));
      setShowLoginModal(true);
      return;
    }

    const payload = {
      general: {
        ...(currentData.general || {}),
        name: finalName,
      },
      product_id: 2, // SHADE_SAIL
      project_attributes: currentData.project_attributes || {},
      products: products,
    };

    try {
      const response = await apiFetch("/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const project = data.project || data;

        if (project && project.id) {
             setSavedProject(project);
        } else {
             showToast("Saved draft successfully.", "success");
        }
      } else {
        const err = await response.json();
        throw new Error(err.error || "Unknown error");
      }

    } catch (error) {
      if (error.status === 401) {
        setShowLoginModal(true);
        return;
      }
      console.error("Save error:", error);
      showToast(`Save Error: ${error.message}`, "error");
    }
  };

  const closeOverlay = () => {
    setIsClosing(true);
    setTimeout(() => {
      setOverlayMode(null);
      setIsClosing(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden" style={{ paddingBottom: 'var(--bottom-nav-height, 0px)' }}>
      
      {/* Toast Overlay */}
      {toast && (
        <Toast
          message={toast.msg}
          onClose={() => setToast(null)}
          duration={5000}
          type={toast.type}
          className="bottom-[100px] mb-safe"
        />
      )}

      {/* Header Bar */}
      <PageHeader 
        title="Sail Discrepancy Checker" 
        backPath={isLoggedIn ? "/copelands/projects" : "/copelands/"} 
        backLabel={isLoggedIn ? "Back to Projects" : "Back"}
      />

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in">
          <div className="w-full max-w-md">
               <CollapsibleCard 
                    title="Save Project" 
                    defaultOpen={true}
                    className="w-full !rounded-2xl !shadow-2xl border-opacity-50"
                    contentClassName="bg-white dark:bg-gray-800"
               > 
                    <Authentication 
                        onAuthSuccess={() => {
                            setShowLoginModal(false);
                            onSave();
                        }} 
                        onCancel={() => setShowLoginModal(false)}
                    />
               </CollapsibleCard>
          </div>
          <style>{`
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
          `}</style>
        </div>
      )}

      {/* Success Modal */}
      {savedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in">
          <div className="w-full max-w-md">
               <CollapsibleCard 
                    title="Project Saved Successfully" 
                    defaultOpen={true}
                    className="w-full !rounded-2xl !shadow-2xl border-opacity-50"
                    contentClassName="bg-white dark:bg-gray-800"
               > 
                    <div className="p-4 space-y-4">
                        <ProjectConfirmation 
                            project={savedProject} 
                            productName="SHADE_SAIL" 
                        />
                        <div className="flex flex-col gap-3 pt-2">
                             <Button 
                                variant="primary"
                                onClick={() => navigate(`/copelands/projects?open=${savedProject.id}`)}
                                className="w-full justify-center text-lg"
                             >
                                Edit Project
                             </Button>
                             <Button 
                                variant="secondary"
                                onClick={() => navigate('/copelands/projects')}
                                className="w-full justify-center"
                             >
                                Go to Projects List
                             </Button>
                        </div>
                    </div>
               </CollapsibleCard>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain bg-gray-100 dark:bg-gray-900">
        <div className="max-w-[1800px] mx-auto p-2 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
            
            {/* Left: Form */}
            <CollapsibleCard 
              title="Specifications" 
              className="lg:col-span-7 xl:col-span-8"
              defaultOpen={true}
            >
              <div className="p-1">
                <ProjectForm 
                  formRef={formRef} 
                  product="SHADE_SAIL" 
                  hideGeneralSection={false} 
                  generalSectionProps={{ onlyName: true }}
                  productProps={{ discrepancyChecker: true }}
                />
              </div>
            </CollapsibleCard>

            {/* Right: Viz */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto custom-scrollbar">
              <CollapsibleCard 
                  title={overlayMode ? "Check Visualisation" : "Visualisation"}
                  isOverlay={!!overlayMode}
                  onClose={overlayMode ? closeOverlay : null}
                  defaultOpen={true}
              >
                  {/* Container for render. ProjectOverlay handles modes. */}
                  <ProjectOverlay
                    mode={overlayMode}
                    isClosing={isClosing}
                    onClose={closeOverlay}
                    canvasRef={canvasRef}
                    project={editedProject}
                    productName="SHADE_SAIL"
                    devMode={false}
                    toggleData={toggleData}
                    setToggleData={setToggleData}
                  />
              </CollapsibleCard>
            </div>

          </div>
        </div>
      </div>

       {/* Footer Action Bar */}
       <StickyActionBar 
          mode="static"
          className="!mt-0 px-4 py-4 md:px-8 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-50">
            <Button 
                onClick={overlayMode === 'preview' ? closeOverlay : onCheck} 
                className="flex-1 justify-center py-3 text-md"
                variant={overlayMode === 'preview' ? 'danger' : 'primary'}
            >
                {overlayMode === 'preview' ? 'Close Preview' : 'Check Discrepancy'}
            </Button>
            
            <Button 
                onClick={onSave} 
                className="flex-1 justify-center py-3 text-lg bg-green-600 hover:bg-green-700 text-white border-transparent"
                variant="custom"
            >
                Save as Draft
            </Button>
      </StickyActionBar>

      <style>{`
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
