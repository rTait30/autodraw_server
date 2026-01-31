import React, { useRef, useEffect, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from '../services/auth';
import { Button } from '../components/UI';

const RectanglesForm = React.lazy(() =>
  import("../components/products/RECTANGLES/Form.jsx").then((module) => ({
    default: module.ProjectForm,
  }))
);

export default function Rectangles() {
  const navigate = useNavigate();

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const [nestStatus, setNestStatus] = useState({ text: "", ok: null });
  const [projectData, setProjectData] = useState(null);

  // Render canvas using Display module when project data changes
  useEffect(() => {
    if (!projectData || !canvasRef.current) return;

    console.log("[Rectangles] Rendering with projectData:", projectData);

    // Dynamically import Display module for RECTANGLES
    import("../components/products/RECTANGLES/Display.js")
      .then((module) => {
        const data = {
          products: projectData.products || [],
          project_attributes: projectData.project_attributes || {},
        };
        console.log("[Rectangles] Passing to Display.render:", data);
        // Call generic render() function from Display module
        if (typeof module.render === 'function') {
          module.render(canvasRef.current, data);
        }
      })
      .catch(e => {
        console.warn(`No Display module for RECTANGLES:`, e.message);
      });
  }, [projectData]);

  const onNest = async () => {
    // clear status while processing
    setNestStatus({ text: "", ok: null });
    const all = formRef.current?.getValues?.();
    console.log("Form values:", all);
    
    if (!all || !all.project) {
      setNestStatus({ text: "No form data available", ok: false });
      return;
    }

    // Clear canvas first
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    try {
      // Call server-side API to calculate rectangles nesting
      const payload = {
        product_id: 3, // RECTANGLES product ID (from productsConfig.js)
        general: {},
        project_attributes: all.project,
        products: []
      };

      console.log("Sending payload:", payload);

      const response = await apiFetch("/projects/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      console.log("Nesting result:", result);

      // Update project data for canvas rendering
      setProjectData({
        products: result.products || [],
        project_attributes: result.project_attributes || {},
      });

      if (result?.project_attributes?.nest?.error) {
        setNestStatus({ text: `Error: ${result.project_attributes.nest.error}`, ok: false });
      } else {
        const nest = result?.project_attributes?.nest || {};
        const rolls = nest.rolls || [];
        const totalRolls = rolls.length;
        const fullRolls = totalRolls > 0 ? totalRolls - 1 : 0;
        const lastRollWidth = rolls.length > 0 ? (rolls[rolls.length - 1].width || 0) : 0;
        const lastRollMeters = (lastRollWidth / 1000).toFixed(1);
        
        setNestStatus({ 
          text: `Nested successfully! Total rolls: ${totalRolls} (${fullRolls} full + ${lastRollMeters}m)`, 
          ok: true 
        });
      }
    } catch (error) {
      console.error("Nesting error:", error);
      setNestStatus({ text: `Error: ${error.message}`, ok: false });
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Rectangle Nesting Tool</h2>
          <button
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
            onClick={() => navigate("/copelands/")}
          >
            ← Back
          </button>
        </div>

        {/* Form section */}
        <div className="mb-6 max-w-2xl">
          <Suspense fallback={<div className="p-3">Loading form…</div>}>
            <RectanglesForm formRef={formRef} />
          </Suspense>

          <div className="flex items-center gap-3 mt-4">
            <Button onClick={onNest}>
              Nest Rectangles
            </Button>
            <span className="text-sm" aria-live="polite">
              {nestStatus.ok === null ? (
                ""
              ) : (
                <span className={nestStatus.ok ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                  {nestStatus.text}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Full width canvas section */}
        <div className="w-full">
          <canvas
            ref={canvasRef}
            data-dynamic-rectangles="true"
            width={2000}
            height={2000}
            className="border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm"
            style={{
              width: "100%",
              display: "block",
              background: "#fff",
            }}
          />
        </div>
      </main>
    </div>
  );
}
