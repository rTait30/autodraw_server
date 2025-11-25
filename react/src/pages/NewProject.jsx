
import React, { useState, useRef, Suspense, useEffect } from "react";
import { useSelector } from 'react-redux';
import ProjectSidebar from "../components/ProjectSidebar";
import { apiFetch } from "../services/auth";
import ProjectForm from "../components/ProjectForm";
import { PRODUCTS } from "../config/productRegistry";

export default function NewProject() {

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const [createdProject, setCreatedProject] = useState(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1000, height: 1000 });

  const role = localStorage.getItem("role") || "guest";

  // No longer needed: ProductFormComponent

  // Mobile-friendly toast (replaces alert)
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef();
  const showToast = (msg, opts = {}) => {
    setToast({ msg: String(msg), ...opts });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), opts.duration || 30000);
  };

  const devMode = useSelector(state => state.toggles.devMode);

  const handleQuickCheck = async () => {
    if (!product) {
      showToast("Please select a project type first.");
      return;
    }
    try {
      const formData = formRef.current?.getValues?.() ?? {};
      // Find selected product's meta to retrieve numeric dbId
      const productMeta = PRODUCTS.find(p => p.id === product);
      if (!productMeta || productMeta.dbId == null) {
        showToast("Quick Check unsupported: product has no product_id (dbId).");
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
      
      showToast("Quick check complete! See visualization.");
      console.log("Calculation result:", result);
    } catch (err) {
      console.error("Quick check error:", err);
      showToast(`Error: ${err.message}`, { duration: 8000 });
    }
  };

  // All previous local stepper/canvas effects removed.

  


  const printValues = () => {
    console.log("Printing form values...");
    const all = formRef.current?.getValues?.() ?? {};
    console.log("Form values:", all);
    showToast(
        JSON.stringify(all ?? {}, null, 2)
    );
  };

  // NEW: expose a button handler that calls runAll with current form values
  // Check button removed – server now handles calculation.


  const handleSubmit = async () => {
    if (!product) {
      showToast("Please select a project type first.");
      return;
    }
    try {
      const formData = formRef.current?.getValues?.() ?? {};
      const productMeta = PRODUCTS.find(p => p.id === product);
      if (!productMeta || productMeta.dbId == null) {
        showToast("This product cannot be created yet (missing product_id).");
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
      showToast("Project submitted successfully!");
      console.log("Submitted:", res);
      setCreatedProject(res);
    } catch (err) {
      console.error("Submission error:", err);
      showToast(`Error submitting project: ${err.message}`, { duration: 8000 });
    }
  };

  // Responsive canvas sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!containerRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const containerWidth = containerRef.current.offsetWidth;
      const isMobile = window.innerWidth < 768;
      // On desktop, use full container width; on mobile, use viewport-based sizing
      const displayWidth = isMobile ? Math.min(window.innerWidth - 60, 600) : Math.min(containerWidth, 1000);
      const displayHeight = displayWidth * 2;
      // Scale by device pixel ratio for crisp rendering
      setCanvasDimensions({ 
        width: Math.round(displayWidth * dpr), 
        height: Math.round(displayHeight * dpr),
        displayWidth,
        displayHeight
      });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

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
  }, [createdProject, canvasDimensions]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <ProjectSidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        selectedProduct={product}
        setSelectedProduct={setProduct}
        products={PRODUCTS}
      />

      {toast && (
        <div
          role="status"
          className="fixed left-1/2 bottom-6 z-50 w-[90%] max-w-lg -translate-x-1/2 rounded border bg-white p-3 shadow-lg text-sm break-words whitespace-pre-wrap"
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
              {devMode && <button onClick={printValues} className="devStyle">Print values</button>}
              <div className="flex gap-3 mt-6">
                <button onClick={handleQuickCheck} className="buttonStyle bg-blue-600 hover:bg-blue-700">
                  Quick Check
                </button>
                <button onClick={handleSubmit} className="buttonStyle">
                  {['estimator', 'admin', 'designer'].includes(role)
                    ? 'Make Lead'
                    : 'Get Quote'}
                </button>
              </div>
            </div>
            {/* Canvas visualization rendered by Display.js after project creation */}
              <div ref={containerRef} className="flex-1">
                <canvas 
                  ref={canvasRef} 
                  width={canvasDimensions.width} 
                  height={canvasDimensions.height} 
                  className="border shadow bg-white max-w-full" 
                  style={{ 
                    display: 'block', 
                    width: canvasDimensions.displayWidth ? `${canvasDimensions.displayWidth}px` : '100%', 
                    height: canvasDimensions.displayHeight ? `${canvasDimensions.displayHeight}px` : 'auto',
                    imageRendering: 'crisp-edges'
                  }}
                />
              </div>
          </div>
        ) : (
          <p className="text-gray-500">Select a project type to begin.</p>
        )}
      </main>
    </div>
  );
}
