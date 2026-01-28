import React, { useRef, useEffect, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setAccessToken } from "../services/auth";
import ProjectForm from "../components/ProjectForm";
import ProjectOverlay from "../components/ProjectOverlay";
import StickyActionBar from "../components/StickyActionBar";
import CollapsibleCard from "../components/CollapsibleCard";
import TopBar from "../components/TopBar";
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
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Toast / Result State
  const [toast, setToast] = useState(null);

  // Simple check for active account (token/user existence)
  const isLoggedIn = !!localStorage.getItem('username');

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Login failed');

      setAccessToken(data.access_token || null);
      localStorage.setItem('role', data.role || 'client');
      localStorage.setItem('username', data.username || 'Guest');
      
      setShowLoginModal(false);
      onSave(); // Retry save
    } catch (err) {
      setLoginError(err.message || 'Login failed.');
    }
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
        const projectId = data.id || (data.project && data.project.id);

        if (projectId) {
             showToast("Draft saved! You can find it in the Projects list.", "success");
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
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      
      {/* Toast Overlay */}
      {toast && (
        <Toast
          message={toast.msg}
          onClose={() => setToast(null)}
          duration={5000}
          type={toast.type}
          className="bottom-24 md:bottom-28"
        />
      )}

      {/* Header Bar */}
      {isLoggedIn ? (
        <div className="flex-none z-10 flex flex-col">
          <TopBar />
          <div className="flex items-center justify-between px-4 py-4 md:px-8 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                  onClick={() => navigate("/copelands/projects")}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 font-medium text-lg"
              >
                  <span>← Back to Projects</span>
              </button>
              <div className="hidden sm:block h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
              <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  Sail Discrepancy Checker
                  </h2>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-none flex items-center justify-between px-4 py-4 md:px-8 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm z-10">
          <div className="flex items-center gap-4">
              <button 
                  onClick={() => navigate("/copelands/")}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 font-medium text-lg"
              >
                  <span>← Back</span>
              </button>
              <div className="hidden sm:block h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
              <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  Sail Discrepancy Checker
                  </h2>
              </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110]">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-96 relative">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Login to Save Draft</h3>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="border p-2 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                autoFocus
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="border p-2 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Login & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain bg-gray-100 dark:bg-gray-900">
        <div className="max-w-[1800px] mx-auto p-2 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
            
            {/* Left: Form */}
            <CollapsibleCard 
              title="Requirements" 
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
                  title="Visualisation" 
                  forceOpen={!!overlayMode}
                  className={overlayMode ? "!border-0 !shadow-none !bg-transparent !rounded-none !overflow-visible" : ""} 
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
            {isLoggedIn && (
              <Button 
                  onClick={onSave} 
                  className="flex-1 justify-center py-3 text-lg bg-green-600 hover:bg-green-700 text-white border-transparent"
                  variant="custom"
              >
                  Save as Draft
              </Button>
            )}
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
