import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  const [stepperKey, setStepperKey] = useState(0);

  const canvasRef = useRef(null);
  const formRef = useRef(null);
  const lastStringifiedRef = useRef('');

  const role = localStorage.getItem('role') || 'guest';

  const options = useMemo(() => ({
    showData: false,
    scaleFactor: 1,
    stepOffsetY: 800,
  }), []);

  // Single place to "fully reset" transient state
  const hardReset = useCallback(() => {
    // reset diff detector so first scan runs
    lastStringifiedRef.current = '';
    setResult({});

    const c = canvasRef.current;
    if (c) {
      // Reset transform + bitmap
      const w = c.width, h = c.height;
      c.width = w; // resetting width clears canvas+state
      c.height = h;
      const ctx = c.getContext('2d');
      ctx?.setTransform(1, 0, 0, 1, 0, 0);
      ctx?.clearRect(0, 0, c.width, c.height);
    }
  }, []);

  // Token that guarantees new stepper instance + new components when type changes
  const resetToken = useMemo(
    () => `${selectedType ?? 'none'}::${stepperKey}`,
    [selectedType, stepperKey]
  );

  const { runAll, getData } = useProcessStepper(
    {
      canvasRef,
      steps: loadedConfig?.steps || [],
      options,
    },
    // This token controls when the hook should throw away internal state
    resetToken
  );

  // Lazy-load Form + Steps for the selected type
  useEffect(() => {
    if (!selectedType) return;

    let active = true;
    // Force full teardown of previous form/stepper/canvas
    setLoadedConfig(null);
    setStepperKey(k => k + 1);
    hardReset();

    (async () => {
      try {
        const [FormModule, StepsModule] = await Promise.all([
          import(`../components/projects/${selectedType}/Form.jsx`),
          import(`../components/projects/${selectedType}/Steps.js`),
        ]);

        if (!active) return;

        const steps = StepsModule.Steps ?? StepsModule.steps ?? [];

        setLoadedConfig({
          FormComponent: FormModule.default,
          steps,
          title: projectTypes.find(pt => pt.id === selectedType)?.name || 'Project',
        });

        // Fresh result/view
        setResult({});
        lastStringifiedRef.current = '';
      } catch (err) {
        if (active) {
          console.error(`Error loading type "${selectedType}":`, err);
          setLoadedConfig(null);
        }
      }
    })();

    return () => { active = false; };
  }, [selectedType, hardReset]);

  // Extra safety: clear canvas any time steps set changes
  useEffect(() => {
    hardReset();
  }, [loadedConfig?.steps, hardReset]);

  // Auto-run steps whenever form data changes
  useEffect(() => {
    if (!loadedConfig) return;

    const interval = setInterval(() => {
      const api = formRef.current;
      if (!api?.getData) return;

      try {
        const formData = api.getData(); // includes General + type-specific fields
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
    if (!formRef.current?.getData) return;

    if (!selectedType) {
      alert('Please select a project type before submitting.');
      return;
    }

    try {
      // 1) Gather form data (General + Attributes)
      const all = formRef.current.getData();

      if (!all.name) {
        alert('Please enter a project name.');
        return;
      }

      if (role !== 'client' && !all.client_id) {
        alert('Please select a client.');
        return;
      }

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
        ...general,
        type: selectedType, // keep id
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
        setSelectedType={(t) => {
          setSelectedType(t);
          // any extra per-switch cleanup can go here
        }}
        projectTypes={projectTypes}
      />

      <main className="flex-1 p-6">
        {loadedConfig ? (
          <>
            <div className="flex flex-wrap gap-10">
              <div className="flex-1 min-w-[400px]">
                {/* Force remount on type/stepper changes */}
                <loadedConfig.FormComponent
                  key={`form:${resetToken}`}
                  ref={formRef}
                  role={role}
                  project={{}}
                  general={{ enabled: true, clientsEndpoint: '/clients' }}
                />

                <button onClick={handleSubmit} className="buttonStyle mt-6">
                  Submit Project
                </button>
              </div>

              <div className="flex-1 min-w-[400px] flex flex-col items-center">
                <canvas
                  key={`canvas:${resetToken}`}
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
