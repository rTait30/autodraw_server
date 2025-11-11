import React, { useRef, useEffect, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProcessStepper } from "../components/products/ProcessStepper";

const RectanglesForm = React.lazy(() =>
  import("../components/products/RECTANGLES/Form.jsx").then((module) => ({
    default: module.ProjectForm,
  }))
);

export default function Rectangles() {
  const navigate = useNavigate();

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const stepperRef = useRef(null);
  const stepsLoadedRef = useRef(false);
  const [nestStatus, setNestStatus] = useState({ text: "", ok: null });

  // Init stepper once and attach canvas when available
  useEffect(() => {
    stepperRef.current = new ProcessStepper(800);

    // if canvas already mounted, attach immediately
    if (canvasRef.current) {
      stepperRef.current.addCanvas(canvasRef.current);
    }

    return () => {
      stepperRef.current = null;
    };
  }, []);

  // Attach canvas whenever it mounts/changes
  useEffect(() => {
    if (canvasRef.current && stepperRef.current) {
      stepperRef.current.addCanvas(canvasRef.current);
    }
  }, [canvasRef.current]);

  // Lazy-load Steps only once and register them on the stepper
  useEffect(() => {
    let alive = true;
    if (stepsLoadedRef.current) return;

    import("../components/products/RECTANGLES/Steps.js")
      .then((mod) => {
        if (!alive || !stepperRef.current) return;
        const loaded = mod.Steps ?? mod.steps ?? [];
        // Clear just in case, then add
        stepperRef.current.clear?.();
        loaded.forEach((s) => stepperRef.current.addStep(s));
        stepsLoadedRef.current = true;
      })
      .catch((e) => console.error("[Rectangles] Failed to load steps:", e));

    return () => {
      alive = false;
    };
  }, []);

  const onNest = async () => {
    // clear status while processing
    setNestStatus({ text: "", ok: null });
    const all = formRef.current?.getValues?.();
    if (!all || !all.project) return;

    // Clear canvas first
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    try {
      const result = await stepperRef.current?.runAll({
        project_attributes: all.project,
      });

      console.log("Nesting result:", result);
      if (result?.calculated?.error) {
        setNestStatus({ text: `Error: ${result.calculated.error}`, ok: false });
      } else {
        const totalWidth = result?.calculated?.totalWidth || 0;
        setNestStatus({ 
          text: `Nested successfully! Total width: ${totalWidth}mm`, 
          ok: true 
        });
      }
    } catch (error) {
      console.error("Nesting error:", error);
      setNestStatus({ text: `Error: ${error.message}`, ok: false });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Rectangle Nesting Tool</h2>
          <button
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            onClick={() => navigate("/copelands")}
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
            <button onClick={onNest} className="buttonStyle">
              Nest Rectangles
            </button>
            <span className="text-sm" aria-live="polite">
              {nestStatus.ok === null ? (
                ""
              ) : (
                <span className={nestStatus.ok ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
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
            width={1800}
            height={1000}
            style={{
              border: "1px solid #ccc",
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
