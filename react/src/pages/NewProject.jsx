import React, { useState, useMemo, useRef, useEffect, Suspense } from "react";
import ProjectSidebar from "../components/ProjectSidebar";
import { apiFetch } from "../services/auth";

import { useProcessStepper } from '../components/products/useProcessStepper';
import { ProcessStepper } from '../components/products/ProcessStepper';

// Lazy-load each full form
const FORM_LOADERS = {
  cover:     () => import("../components/products/cover/FormAlone.jsx"),
  shadesail: () => import("../components/products/shadesail/FormAlone.jsx"),
};

const STEPS_LOADERS = {

  cover:      () => import("../components/products/cover/Steps.js"),

}

const projectTypes = [
  { name: "Covers",     id: "cover" },
  { name: "Shade Sail", id: "shadesail" },
];

export default function NewProject() {
  const formRef = useRef(null);
  const canvasRef = useRef(null);

  const stepperRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectType, setProjectType] = useState(null);

  const [steps, setSteps] = useState([]);

  const [result, setResult] = useState({});
  const [generalData, setGeneralData] = useState({
    name: "test project",
    client_id: "",
    due_date: "",
    info: "",
  });

  // Load steps dynamically so they can be split into their own chunk
  useEffect(() => {
    let alive = true;
    import('../components/products/cover/Steps.js')
      .then((mod) => {
        const loaded = mod.Steps ?? mod.steps ?? [];
        if (alive) setSteps(loaded);
      })
      .catch((e) => console.error('[Discrepancy] Failed to load steps:', e));
    return () => {
      alive = false;
    };
  }, []);

  const role = localStorage.getItem("role") || "guest";

  // Pick the current form lazily
  const SelectedForm = useMemo(() => {
    if (!projectType) return null;
    const loader = FORM_LOADERS[projectType];
    return loader ? React.lazy(loader) : null;
  }, [projectType]);

// Reset formRef when switching types (unchanged)
  useEffect(() => { formRef.current = null; }, [projectType]);

  // NEW: Build a new ProcessStepper and load Steps whenever projectType changes
  useEffect(() => {
    let cancelled = false;

    // if no type or canvas missing, reset
    if (!projectType || !canvasRef.current) {
      stepperRef.current = null;
      setSteps([]);
      return;
    }

    // 1) create a fresh instance bound to the canvas
    stepperRef.current = new ProcessStepper(canvasRef.current, {
      showData: false,
      stepOffsetY: 800,
      draw: true,
    });

    // 2) lazy-load & register step configs
    (async () => {
      const loader = STEPS_LOADERS[projectType];
      if (!loader) { setSteps([]); return; }

      const mod = await loader();
      const factory = mod?.default;
      const configs = typeof factory === "function"
        ? factory({ canvasRef, formRef })
        : (mod?.steps ?? []);

      if (cancelled) return;

      stepperRef.current.steps = []; // clear any previous
      configs.forEach(cfg => stepperRef.current.addStep(cfg));
      setSteps(configs);
    })();

    return () => { cancelled = true; };
  }, [projectType]);

  // NEW: expose a button handler that calls runAll with current form values
  const runAllNow = async () => {
    const all = formRef.current?.getValues?.() ?? {};
    await stepperRef.current?.runAll(all);
  };


  const handleSubmit = async () => {
    if (!projectType) {
      alert("Please select a project type first.");
      return;
    }

    const api = formRef.current;
    if (!api || typeof api.getValues !== "function") {
      alert("Form not ready yet.");
      return;
    }

    try {
      const all = api.getValues();
      if (!all?.general?.name) {
        alert("Please enter a project name.");
        return;
      }

      const payload = {
        general: all.general ?? {},
        type: projectType,
        attributes: all.attributes ?? {},
        calculated: all.calculated ?? {},
      };

      const response = await apiFetch("/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const res = await response.json();
      alert("Project submitted successfully!");
      console.log("Submitted:", res);
    } catch (err) {
      console.error("Submission error:", err);
      alert(`Error submitting project: ${err.message}`);
    }
  };

  const printValues = () => {
    const all = formRef.current?.getValues?.() ?? {};
    console.log("Form values:", all);
    alert(
      "General:\n" +
      JSON.stringify(all.general ?? {}, null, 2) +
      "\n\nAttributes:\n" +
      JSON.stringify(all.attributes ?? {}, null, 2) +
      "\n\nCalculated:\n" +
      JSON.stringify(all.calculated ?? {}, null, 2)
    );
  };

  const options = useMemo(
    () => ({
      showData: false,
      scaleFactor: 1,
      stepOffsetY: 800,
    }),
    []
  );

  /*
  const { runAll, getData } = useProcessStepper(
    {
      canvasRef,
      steps,
      options,
    },
    String(steps.length)
  );

  const runStepper = () => {
    const all = formRef.current?.getValues?.() ?? {};
    // you can pass form data into steps if you like:
    runAll(all);
  };
  */

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <ProjectSidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        projectType={projectType}
        setSelectedType={setProjectType}
        projectTypes={projectTypes}
      />

      <main className="flex-1 p-6">
        {projectType ? (
          <div className="flex flex-wrap gap-10">
            <div className="flex-1 min-w-[400px]">
              <Suspense fallback={<div className="p-3"></div>}>
                {SelectedForm ? (
                  <SelectedForm
                    key={projectType}
                    formRef={formRef}                 // ✅ form exposes getValues()
                    onGeneralChange={setGeneralData}
                  />
                ) : (
                  <div className="text-red-600">Unknown form type.</div>
                )}
              </Suspense>

              <div className="flex gap-3 mt-6">
                <button onClick={printValues} className="buttonStyle">Print values</button>
                <button onClick={runAllNow} className="buttonStyle">Run All</button>
                <button onClick={handleSubmit} className="buttonStyle">
                  {["estimator", "admin", "designer"].includes(role)
                    ? "Make Lead"
                    : "Get Quote"}
                </button>
              </div>
            </div>

            <div className="flex-1 min-w-[400px] flex flex-col items-center">
              <canvas
                ref={canvasRef}
                width={500}
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
              <div className="mt-6 text-center">
                <p className="font-semibold text-lg">{result.discrepancy}</p>
                <p className="text-gray-600">{result.errorBD}</p>
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
