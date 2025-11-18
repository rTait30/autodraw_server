
import React, { useState, useMemo, useRef, useEffect, Suspense } from "react";

import { useSelector } from 'react-redux';


import ProjectSidebar from "../components/ProjectSidebar";
import { apiFetch } from "../services/auth";
import { ProcessStepper } from '../components/products/ProcessStepper';
import ProjectForm from "../components/ProjectForm";
import { PRODUCTS } from "../config/productRegistry";

export default function NewProject() {

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const stepperRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [product, setProduct] = useState(null);

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

  useEffect(() => {
  if (!product || !canvasRef.current) {
      return;
    }
    let alive = true;

    // Dynamically import steps only
  import(`../components/products/${product}/Steps.js`)
      .then((stepsMod) => {
        const loadedSteps = stepsMod.Steps ?? stepsMod.steps ?? [];
        if (alive && stepperRef.current) {
          stepperRef.current.addCanvas(canvasRef.current);
          loadedSteps.forEach((step) => stepperRef.current.addStep(step));
        }
      })
      .catch((e) => {
  console.error(`[Discrepancy] Failed to load steps for ${product}:`, e);
      });

    return () => {
      alive = false;
    };
  }, [product, canvasRef.current]);

  // Reset formRef when switching types
  // Do not reset formRef here; let ProjectForm manage the ref lifecycle

  // NEW: Build a new ProcessStepper and load Steps whenever product changes
  useEffect(() => {

    canvasRef.current?.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    let cancelled = false;

    // if no type or canvas missing, reset
  if (!product || !canvasRef.current) {
      stepperRef.current = null;
      return;
    }

    // 1) create a fresh instance bound to the canvas
    stepperRef.current =
    
      new ProcessStepper(800);

    return () => { cancelled = true; };
  }, [product]);

  


  const printValues = () => {
    console.log("Printing form values...");
    const all = formRef.current?.getValues?.() ?? {};
    console.log("Form values:", all);
    showToast(
        JSON.stringify(all ?? {}, null, 2)
    );
  };

  // NEW: expose a button handler that calls runAll with current form values
  const runAllNow = async () => {
    const all = formRef.current?.getValues?.() ?? {};
    console.log("Running all steps with data:", all);
    let data = await stepperRef.current?.runAll(all);

    //let calculated = data?.calculated ?? {};

    console.log("Stepper data:", data);

    //showToast("stepper data:\n" + JSON.stringify(data, null, 2), { duration: 8000 });
  };


  const handleSubmit = async () => {
  if (!product) {
      showToast("Please select a project type first.")
      return;
    }

    try {

      const formData = formRef.current?.getValues?.() ?? {};

      //const all = formRef.current?.getValues?.() ?? {};
      //console.log("Running all steps with data:", all.attributes);
      let stepperData = await stepperRef.current?.runAll(formData ?? {});

      const payload = {
        ...stepperData ?? {},
  product: product
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
    } catch (err) {
      console.error("Submission error:", err);
      showToast(`Error submitting project: ${err.message}`, { duration: 8000 });
    }
  };

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
          <div className="flex flex-wrap gap-10">
            <div className="flex-1 min-w-[400px]">
              <Suspense fallback={<div className="p-3"></div>}>
                <ProjectForm
                  key={product}
                  product={product}
                  formRef={formRef}
                />
              </Suspense>
              {devMode && <button onClick={printValues} className="devStyle">Print values</button>}
              <div className="flex gap-3 mt-6">
                <button onClick={runAllNow} className="buttonStyle">Check</button>
                <button onClick={handleSubmit} className="buttonStyle">
                  {['estimator', 'admin', 'designer'].includes(role)
                    ? 'Make Lead'
                    : 'Get Quote'}
                </button>
              </div>
            </div>
            <div className="flex-1 min-w-[400px] flex flex-col items-center">
              <canvas
                ref={canvasRef}
                width={1000}
                height={5000}
                style={{
                  border: "1px solid #d1d5db",
                  marginTop: "20px",
                  width: "100%",
                  maxWidth: "500px",
                  display: "block",
                  background: "#f8f9fa",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              />
              <div className="mt-6 text-center">
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Select a project type to begin.</p>
        )}
      </main>
    </div>
  );
}
