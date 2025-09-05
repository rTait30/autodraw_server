import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProcessStepper } from '../components/projects/useProcessStepper';
import ProjectSidebar from '../components/ProjectSidebar';
import { apiFetch } from '../services/auth';

const projectTypes = [
  { name: 'Covers', id: 'cover' },
  { name: 'Shade Sail', id: 'shadesail' },
];

// General keys integrated in FormBase
const GENERAL_KEYS = ['name', 'client_id', 'due_date', 'info'];

export default function NewProject() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [loadedConfig, setLoadedConfig] = useState(null);
  const [result, setResult] = useState({});
  const canvasRef = useRef(null);
  const formRef = useRef(null);

  const role = localStorage.getItem('role') || 'guest';

  const options = useMemo(() => ({
    showData: false,
    scaleFactor: 1,
    stepOffsetY: 800,
  }), []);

  const { runAll, getData } = useProcessStepper(
    {
      canvasRef,
      steps: loadedConfig?.steps || [],
      options,
    },
    // reset when steps change
    JSON.stringify(loadedConfig?.steps || [])
  );

  // Lazy-load Form + Steps for the selected type
  useEffect(() => {
    if (!selectedType) return;

    (async () => {
      try {
        const [FormModule, StepsModule] = await Promise.all([
          import(`../components/projects/${selectedType}/Form.jsx`),
          import(`../components/projects/${selectedType}/Steps.js`),
        ]);

        const steps = StepsModule.Steps ?? StepsModule.steps ?? [];
        console.log(`[Loader] Loaded steps for "${selectedType}":`, steps);

        setLoadedConfig({
          FormComponent: FormModule.default,
          steps,
          title: projectTypes.find(pt => pt.id === selectedType)?.name || 'Project',
        });
        setResult({});
      } catch (err) {
        console.error(`Error loading type "${selectedType}":`, err);
        setLoadedConfig(null);
      }
    })();
  }, [selectedType]);

  // Clear canvas on type change
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [selectedType]);

  // Auto-run steps whenever form data changes
  const lastStringifiedRef = useRef('');
  useEffect(() => {
    const interval = setInterval(() => {
      const api = formRef.current;
      if (!api?.getData) return;

      try {
        const formData = api.getData();            // includes General + type-specific fields
        const stringified = JSON.stringify(formData);

        if (stringified !== lastStringifiedRef.current) {
          lastStringifiedRef.current = stringified;

          const cleanData = { ...formData };
          delete cleanData.result; // safety

          runAll(cleanData);
          setResult(cleanData.result || {});
        }
      } catch (err) {
        console.error('[NewProject] getData failed:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loadedConfig, runAll]);

  const handleSubmit = async () => {
    if (!selectedType || !formRef.current?.getData) return;

    try {
      // 1) Gather form data (General + Attributes)
      const all = formRef.current.getData();

      const general = GENERAL_KEYS.reduce((acc, k) => {
        if (k in all) acc[k] = all[k];
        return acc;
      }, {});

      const attributes = Object.fromEntries(
        Object.entries(all).filter(([k]) => !GENERAL_KEYS.includes(k))
      );

      // 2) Gather calculated data from the stepper, excluding anything that’s in the form
      const stepOut = getData() || {};
      const calculated = Object.fromEntries(
        Object.entries(stepOut).filter(([k]) => !(k in all))
      );

      // 3) Build payload
      const payload = {
        // Project (general) fields go top-level
        ...general,
        type: selectedType,     // use the id; change here if your API expects another mapping
        attributes,
        calculated,
      };

      const response = await apiFetch('/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const res = await response.json();
      alert('Project submitted successfully!');
      console.log('Submitted:', res);
    } catch (err) {
      console.error('Submission error:', err);
      alert(`Error submitting project: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <ProjectSidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        projectTypes={projectTypes}
      />

      <main className="flex-1 p-6">
        {loadedConfig ? (
          <>
            <div className="flex flex-wrap gap-10">
              <div className="flex-1 min-w-[400px]">
                {/* The loaded FormComponent uses FormBase with built-in General section */}
                <loadedConfig.FormComponent
                  ref={formRef}
                  role={role}
                  // optional hydration for General (name/client/due_date/info)
                  project={{}}                 // pass server-provided project data here if available
                  // optional General config (can omit and rely on defaults)
                  general={{ enabled: true, clientsEndpoint: '/clients' }}
                />

                <button onClick={handleSubmit} className="buttonStyle mt-6">
                  Submit Project
                </button>
              </div>

              <div className="flex-1 min-w-[400px] flex flex-col items-center">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={2000}
                  style={{
                    border: '1px solid #ccc',
                    marginTop: '20px',
                    width: '100%',
                    maxWidth: '500px',
                    display: 'block',
                    background: '#fff',
                  }}
                />
                <div className="mt-6 text-center">
                  <p className="font-semibold text-lg">{result.discrepancy}</p>
                  <p className="text-gray-600">{result.errorBD}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-500">Select a project type to begin.</p>
        )}
      </main>
    </div>
  );
}
