import React, { useState, useRef, Suspense, useEffect } from "react";
import { useSelector } from 'react-redux';
import ProjectSidebar from "../components/ProjectSidebar";
import { apiFetch } from "../services/auth";
import ProjectForm from "../components/ProjectForm";
import StickyActionBar from "../components/StickyActionBar";
import { PRODUCTS } from "../config/productRegistry";
import { TOAST_TAGS, resolveToastMessage } from "../config/toastRegistry";

export default function NewProject() {

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [createdProject, setCreatedProject] = useState(null);

  const role = localStorage.getItem("role") || "guest";
  const isStaff = ['estimator', 'admin', 'designer'].includes(role);

  // Filter products based on user role
  const visibleProducts = PRODUCTS.filter(p => !p.staffOnly || isStaff);

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
      // Find selected product's meta to retrieve numeric dbId
      const productMeta = PRODUCTS.find(p => p.id === product);
      if (!productMeta || productMeta.dbId == null) {
        showToast(TOAST_TAGS.CHECK_UNSUPPORTED);
        return;
      }

      // Send new unified raw format directly (no nested attributes wrapper)
      const payload = {
        product_id: productMeta.dbId,
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

      // Display calculated preview without saving (response shape: products + project_attributes)
      setCreatedProject({
        product: { name: product?.toUpperCase?.() || product },
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
    try {
      const formData = formRef.current?.getValues?.() ?? {};
      const productMeta = PRODUCTS.find(p => p.id === product);
      if (!productMeta || productMeta.dbId == null) {
        showToast(TOAST_TAGS.PRODUCT_MISSING_ID);
        return;
      }
      const payload = {
        product_id: productMeta.dbId,
        general: formData.general || {},
        project_attributes: formData.project_attributes || {},
        products: formData.products || [],
        submitToWG: formData.submitToWG || false,
      };

      const response = await apiFetch("/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const res = await response.json();
      showToast(TOAST_TAGS.PROJECT_SUBMITTED);
      console.log("Submitted:", res);
      setCreatedProject(res);
    } catch (err) {
      console.error("Submission error:", err);
      showToast(TOAST_TAGS.GENERIC_ERROR, { args: [err.message], duration: 8000 });
    }
  };

  useEffect(() => {
    if (!createdProject || !canvasRef.current) return;
    
    const productName = (createdProject.product?.name || '').toUpperCase();
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
        console.warn(`No Display module for ${productName}:`, e.message);
      });
  }, [createdProject]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 dark:bg-gray-900">
      <ProjectSidebar
        selectedProduct={product}
        setSelectedProduct={setProduct}
        products={visibleProducts}
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
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-1 lg:max-w-xl">
              <Suspense fallback={<div className="p-3"></div>}>
                <ProjectForm
                  key={product}
                  product={product}
                  formRef={formRef}
                />
              </Suspense>
              <StickyActionBar>
                <button onClick={handleCheck} className="buttonStyle bg-blue-600 hover:bg-blue-700">
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
                  height={500} 
                  className="border shadow bg-white max-w-full"
                />
              </div>
          </div>
        ) : (
          <p className="text-gray-500">Select a project type to begin.</p>
        )}
      </main>

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
