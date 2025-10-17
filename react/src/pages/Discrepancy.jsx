import React, { useRef, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { ProcessStepper } from "../components/products/ProcessStepper";

const ShadesailForm = React.lazy(() =>
  import("../components/products/shadesail/Form.jsx")
);

export default function Discrepancy() {
  const navigate = useNavigate();

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const stepperRef = useRef(null);
  const stepsLoadedRef = useRef(false);

  // Init stepper once and attach canvas when available
  useEffect(() => {
    // fresh stepper (800px vertical spacing like your NewProject page)
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

    import("../components/products/shadesail/Steps.js")
      .then((mod) => {
        if (!alive || !stepperRef.current) return;
        const loaded = mod.Steps ?? mod.steps ?? [];
        // Clear just in case, then add
        stepperRef.current.clear?.();
        loaded.forEach((s) => stepperRef.current.addStep(s));
        stepsLoadedRef.current = true;
      })
      .catch((e) => console.error("[Discrepancy] Failed to load steps:", e));

    return () => {
      alive = false;
    };
  }, []);

  const onCheck = async () => {
    const all = formRef.current?.getValues?.();
    if (!all || !all.attributes) return;

    // Clear canvas first (keeps visuals clean)
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    await stepperRef.current?.runAll(all.attributes);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Sail Discrepancy Checker</h2>
          <button
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            onClick={() => navigate("/copelands")}
          >
            ← Back
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-10">
          {/* Left: compact form + action */}
          <div className="flex-1 min-w-[360px]">
            <Suspense fallback={<div className="p-3">Loading form…</div>}>
              <ShadesailForm formRef={formRef} discrepancyChecker = {true} />
            </Suspense>

            <button onClick={onCheck} className="buttonStyle mt-4">
              Check Discrepancy
            </button>
          </div>

          {/* Right: canvas */}
          <div className="flex-1 min-w-[360px] flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={1050}
              height={2000}
              style={{
                border: "1px solid #ccc",
                marginTop: "20px",
                width: "100%",
                maxWidth: "500px",
                display: "block",
                background: "#fff",
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
