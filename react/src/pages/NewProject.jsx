import React, { useState, useRef, Suspense, useEffect } from "react";
import { useSelector } from 'react-redux';
import ProjectSidebar from "../components/ProjectSidebar";
import { apiFetch } from "../services/auth";
import ProjectForm from "../components/ProjectForm";
import StickyActionBar from "../components/StickyActionBar";
import { TOAST_TAGS, resolveToastMessage } from "../config/toastRegistry";

export default function NewProject() {

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [createdProject, setCreatedProject] = useState(null);
  const productsList = useSelector(state => state.products.list);
  
  // Confirmation Modal State
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [canvasImage, setCanvasImage] = useState(null);

  const role = localStorage.getItem("role") || "guest";
  const isStaff = ['estimator', 'admin', 'designer'].includes(role);

  // Favorites logic
  const [favorites, setFavorites] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
      // Only fetch if logged in (role exists)
      if (role && role !== 'guest') {
        apiFetch('/me')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data.favorites)) {
                    setFavorites(data.favorites);
                    // If exactly one favorite exists, auto-select it if nothing selected
                    if (data.favorites.length === 1 && !product) {
                        setProduct(data.favorites[0]);
                    }
                }
            })
            .catch(e => console.warn("Failed to load favorites", e));
      }
  }, []);

  const toggleFavorite = async (id) => {
      const isFav = favorites.includes(id);
      const method = isFav ? 'DELETE' : 'POST';
      const newFavs = isFav ? favorites.filter(f => f !== id) : [...favorites, id];
      setFavorites(newFavs);

      try {
          await apiFetch(`/favorites/${id}`, { method });
      } catch (e) {
          console.error("Failed to toggle favorite", e);
          // Revert on error
          setFavorites(favorites);
      }
  };

  const hasFavorites = favorites.length > 0;
  
  // Robust filter: Ensure favorites actually exist in the current product list
  // This prevents empty lists if a favorite product was deleted
  const validFavoritesFromList = productsList.filter(p => favorites.includes(p.id));
  const hasValidFavorites = validFavoritesFromList.length > 0;

  // Filter products:
  // 1. If user has VALID favorites AND not showing all -> show only those favorites
  // 2. Otherwise (no valid favorites OR showing all) -> show all products
  const visibleProducts = (hasValidFavorites && !showAll)
      ? validFavoritesFromList
      : productsList;



  // No longer needed: ProductFormComponent

  // Mobile-friendly toast (replaces alert)
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef();
  const showToast = (tagOrMsg, opts = {}) => {
    const { args = [], ...restOpts } = opts;
    const msg = resolveToastMessage(tagOrMsg, ...args);
    setToast({ msg: String(msg), ...restOpts });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), restOpts.duration || 30000);
  };

  const devMode = useSelector(state => state.toggles.devMode);

  const handleCheck = async () => {
    if (!product) {
      showToast(TOAST_TAGS.PROJECT_TYPE_REQUIRED);
      return;
    }
    try {
      const formData = formRef.current?.getValues?.() ?? {};
      
      // Send new unified raw format directly (no nested attributes wrapper)
      const payload = {
        product_id: product,
        general: formData.general || {},
        project_attributes: formData.project_attributes || {},
        products: formData.products || []
      };

      const response = await apiFetch("/projects/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      // Find the product name for the display component
      const selectedProduct = productsList.find(p => p.id === product);
      const productName = selectedProduct ? selectedProduct.name : "";

      // Display calculated preview without saving (response shape: products + project_attributes)
      setCreatedProject({
        product: { name: productName },
        products: result.products || [],
        project_attributes: result.project_attributes || {},
      });
      
      showToast(TOAST_TAGS.CHECK_COMPLETE);
      console.log("Calculation result:", result);
    } catch (err) {
      console.error("Check error:", err);
      showToast(TOAST_TAGS.GENERIC_ERROR, { args: [err.message], duration: 8000 });
    }
  };

  // Helper helper for recursive rendering
  const RecursiveDataView = ({ data, level = 0 }) => {
    if (data === null || data === undefined || data === '') 
      return <span className="text-gray-400 italic text-sm">N/A</span>;
    
    if (typeof data === 'boolean') 
      return <span className={data ? "text-green-600 font-bold" : "text-gray-500"}>{data ? "Yes" : "No"}</span>;

    if (Array.isArray(data)) {
        if (data.length === 0) return <span className="text-gray-400 italic text-sm">None</span>;
        return (
            <div className="flex flex-col gap-2 mt-1">
                {data.map((item, i) => (
                    <div key={i} className="pl-3 border-l-2 border-gray-200 py-1">
                        <RecursiveDataView data={item} level={level + 1} />
                    </div>
                ))}
            </div>
        );
    }

    if (typeof data === 'object') {
        const entries = Object.entries(data);
        if (entries.length === 0) return <span className="text-gray-400 italic text-sm">Empty</span>;
        
        return (
            <div className={`flex flex-col gap-1 ${level > 0 ? "mt-1" : ""}`}>
                {entries.map(([key, value]) => (
                    <div key={key} className="flex flex-col border-b border-gray-100 last:border-0 pb-1 mb-1">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-0.5">
                            {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
                        </span>
                        <div className="text-sm text-gray-800 break-words font-medium pl-1">
                            <RecursiveDataView data={value} level={level + 1} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return <span>{String(data)}</span>;
  };

  // All previous local stepper/canvas effects removed.

  


  const printValues = () => {
    console.log("Printing form values...");
    const all = formRef.current?.getValues?.() ?? {};
    console.log("Form values:", all);
    showToast(TOAST_TAGS.DEBUG_INFO, { args: [all] });
  };

  // NEW: expose a button handler that calls runAll with current form values
  // Check button removed – server now handles calculation.


  const handleSubmit = async () => {
    if (!product) {
      showToast(TOAST_TAGS.PROJECT_TYPE_REQUIRED);
      return;
    }
    const formData = formRef.current?.getValues?.() ?? {};
    
    // Capture canvas image if available
    let imageSrc = null;
    if (canvasRef.current) {
        try {
            imageSrc = canvasRef.current.toDataURL();
        } catch (e) {
            console.warn("Canvas capture failed", e);
        }
    }
    setCanvasImage(imageSrc);

    const payload = {
      product_id: product,
      general: formData.general || {},
      project_attributes: formData.project_attributes || {},
      products: formData.products || [],
      submitToWG: formData.submitToWG || false,
    };

    setPendingPayload(payload);
    setConfirmationModalOpen(true);
  };

  const confirmSubmission = async () => {
    setConfirmationModalOpen(false);
    if (!pendingPayload) return;
    
    try {
      const response = await apiFetch("/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingPayload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const res = await response.json();
      showToast(TOAST_TAGS.PROJECT_SUBMITTED);
      console.log("Submitted:", res);
      setCreatedProject(res);
      setPendingPayload(null);
    } catch (err) {
      console.error("Submission error:", err);
      showToast(TOAST_TAGS.GENERIC_ERROR, { args: [err.message], duration: 8000 });
    }
  };

  useEffect(() => {
    if (!createdProject || !canvasRef.current) return;
    
    const productName = (createdProject.product?.name || '');
    if (!productName) return;

    // Dynamically import Display module for the product type
    import(`../components/products/${productName}/Display.js`)
      .then((module) => {
        const data = {
          products: createdProject.products || [],
          project_attributes: createdProject.project_attributes || {},
        };
        // Call generic render() function from Display module
        if (typeof module.render === 'function') {
          module.render(canvasRef.current, data);
        }
      })
      .catch(e => {
        console.warn(`No Display module for ${productName}, trying DXF fallback...`);
        // Fallback: Try to use the generic DxfDisplay if the product has a plot_file generator
        // We check capabilities first to avoid unnecessary network calls if we know it's not there
        const selectedProduct = productsList.find(p => p.name === productName);
        const capabilities = selectedProduct?.capabilities || {};
        const docs = capabilities.documents || [];
        const hasPlotFile = docs.some(d => d.id === 'plot_file');

        if (hasPlotFile) {
          // Fetch DXF content first
          const payload = {
            product_id: selectedProduct?.id,
            doc_id: 'plot_file',
            general: createdProject.general || {},
            project_attributes: createdProject.project_attributes || {},
            products: createdProject.products || []
          };

          apiFetch("/projects/preview_document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch preview');
            return res.text();
          })
          .then(dxfContent => {
            import('../components/products/shared/DxfDisplay.js')
              .then(module => {
                module.render(canvasRef.current, { dxfContent });
              });
          })
          .catch(err => console.error("Failed to load plot_file preview", err));
        } else {
          console.warn(`No plot_file generator for ${productName}, cannot render preview.`);
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.fillText('No preview available', 20, 30);
        }
      })
      .catch(e => {
        console.warn(`No Display module for ${productName}:`, e.message);
      });
  }, [createdProject]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 dark:bg-gray-900">
      <ProjectSidebar
        selectedProduct={product}
        setSelectedProduct={setProduct}
        products={visibleProducts}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        showAll={showAll}
        setShowAll={setShowAll}
        hasFavorites={hasValidFavorites}
      />

      {toast && (
        <div
          role="status"
          className="fixed left-1/2 bottom-30 z-[60] w-[90%] max-w-lg -translate-x-1/2 rounded border bg-white text-black p-3 shadow-lg text-sm break-words whitespace-pre-wrap"
        >
          <div className="flex justify-between items-start gap-2">
            <div className="text-left font-medium">Message</div>
            <button
              className="text-xs opacity-70"
              onClick={() => setToast(null)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <pre className="mt-2 text-xs overflow-auto max-h-60">{toast.msg}</pre>
        </div>
      )}

      <main className="flex-1 p-6">
        {product ? (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="w-full lg:w-1/2 lg:max-w-3xl flex-shrink-0">
              <Suspense fallback={<div className="p-3"></div>}>
                <ProjectForm
                  key={product}
                  product={productsList.find(p => p.id === product)?.name}
                  formRef={formRef}
                />
              </Suspense>
              <StickyActionBar>
                <button onClick={handleCheck} className="buttonStyle">
                  Check
                </button>
                <button onClick={handleSubmit} className="buttonStyle">
                  {['estimator', 'admin', 'designer'].includes(role)
                    ? 'Make Lead'
                    : 'Get Quote'}
                </button>
                {devMode && <button onClick={printValues} className="buttonStyle">Print values</button>}
              </StickyActionBar>
            </div>
            {/* Canvas visualization rendered by Display.js after project creation */}
              <div ref={containerRef} className="flex-1">
                <canvas 
                  ref={canvasRef} 
                  width={800}
                  height={200} 
                  className="border shadow bg-white max-w-full"
                />
              </div>
          </div>
        ) : (
          <p className="text-gray-500">Select a project type to begin.</p>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmationModalOpen && pendingPayload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Confirm Project Submission</h2>
              <button 
                onClick={() => setConfirmationModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Canvas Preview */}
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-200 flex flex-col items-center justify-center min-h-[200px]">
                {canvasImage ? (
                  <img src={canvasImage} alt="Project Preview" className="max-w-full h-auto max-h-[300px] object-contain shadow-sm bg-white" />
                ) : (
                  <div className="text-gray-400 text-center">
                    <p className="font-medium">No preview image captured</p>
                    <p className="text-xs mt-1">Run "Check" to see visualization first</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-8 max-w-2xl mx-auto">
                
                {/* General Information */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 border-b pb-2">General Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase font-bold text-gray-500 mb-1">Project Name</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{pendingPayload.general?.name || "Untitled"}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-xs uppercase font-bold text-gray-500 mb-1">Client ID</span>
                       <span className="font-semibold text-gray-900 dark:text-white">{pendingPayload.general?.client_id || "N/A"}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-xs uppercase font-bold text-gray-500 mb-1">Due Date</span>
                       <span className="font-semibold text-gray-900 dark:text-white">{pendingPayload.general?.due_date || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Global Project Attributes - MOVED UP */}
                {pendingPayload.project_attributes && Object.keys(pendingPayload.project_attributes).length > 0 && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 border-b pb-2">Project Attributes</h3>
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                            <RecursiveDataView data={pendingPayload.project_attributes} />
                        </div>
                    </div>
                )}

                {/* Products Configuration */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 border-b pb-2">Products & Features</h3>
                    <div className="space-y-6">
                    {pendingPayload.products && pendingPayload.products.length > 0 ? (
                        pendingPayload.products.map((p, idx) => {
                            const attrs = p.attributes || {};
                            
                            // 1. Sail Tracks (Explicit handling)
                            const sailTracks = attrs.sailTracks;
                            const hasSailTracks = Array.isArray(sailTracks) && sailTracks.length > 0;
                            
                            // 2. UFCs (Explicit handling)
                            const ufcs = attrs.ufcs;
                            const hasUfc = Array.isArray(ufcs) && ufcs.length > 0;

                            // 3. Other attributes (Dynamic)
                            const ignoredKeys = ['sailTracks', 'ufcs', 'pointCount']; 
                            const genericEntries = Object.entries(attrs).filter(([k]) => !ignoredKeys.includes(k));
                            const dynamicData = Object.fromEntries(genericEntries);
                            
                            return (
                                <div key={idx} className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-600 pb-2 flex justify-between">
                                        {p.name || `Product ${idx+1}`}
                                        <span className="text-xs font-normal text-gray-500 self-center">#{idx + 1}</span>
                                    </h4>
                                    
                                    <div className="flex flex-col gap-4">
                                        {/* Explicit: Sail Tracks */}
                                        <div className="flex flex-col">
                                            <span className="text-xs uppercase font-bold text-gray-500 mb-1">Sail Tracks</span>
                                            {hasSailTracks ? (
                                                <div className="p-2 bg-green-50 text-green-800 rounded border border-green-100 font-medium text-sm">
                                                    ✓ {sailTracks.length} Edges: {sailTracks.join(", ")}
                                                </div>
                                            ) : (
                                                <div className="text-gray-400 italic text-sm pl-1">None</div>
                                            )}
                                        </div>

                                        {/* Explicit: UFC */}
                                        <div className="flex flex-col">
                                            <span className="text-xs uppercase font-bold text-gray-500 mb-1">UFC</span>
                                            {hasUfc ? (
                                                <div className="flex flex-col gap-2 p-2 bg-blue-50 text-blue-800 rounded border border-blue-100">
                                                    {ufcs.map((u, i) => (
                                                        <div key={i} className="text-sm font-medium border-b border-blue-200 last:border-0 pb-1 last:pb-0">
                                                            {u.diagonal || '?'} <span className="opacity-75">({u.size ? `${u.size}mm` : 'std'})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-gray-400 italic text-sm pl-1">None</div>
                                            )}
                                        </div>

                                        {/* Separator if other data exists */}
                                        {Object.keys(dynamicData).length > 0 && <hr className="border-gray-200 dark:border-gray-600" />}

                                        {/* Dynamic Attributes */}
                                        <RecursiveDataView data={dynamicData} />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-gray-500 italic">No products added.</p>
                    )}
                    </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
              <button 
                onClick={() => setConfirmationModalOpen(false)}
                className="px-5 py-2.5 rounded-md border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
              >
                Go Back
              </button>
              <button 
                onClick={confirmSubmission}
                className="px-6 py-2.5 rounded-md bg-green-600 text-white font-bold hover:bg-green-700 shadow transition-colors flex items-center gap-2 transform active:scale-95"
              >
                Confirm & Submit
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          /* Stop the PAGE from scrolling sideways on mobile, but keep vertical scroll smooth */
          @media (max-width: 799px) {
            html, body { 
              overflow-x: hidden;
              /* Allow the document to scroll naturally */
              height: auto;
              min-height: 100%;
            }

          }
        `}
      </style>
    </div>
  );
}
