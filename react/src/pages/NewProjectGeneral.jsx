import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProcessStepper } from '../components/projects/useProcessStepper';
import GeneralFields from '../components/projects/GeneralFields';
import ProjectSidebar from '../components/ProjectSidebar';
import { getBaseUrl } from "../utils/baseUrl";

const projectTypes = [
  { name: 'Covers', id: 'cover' },
  { name: 'Shade Sail', id: 'shadesail' },
  { name: 'Simple Box', id: 'simplebox' },
  { name: 'Calculator', id: 'calculator' },
];
//Eventually get this from the server

export default function NewProjectGeneral() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [loadedConfig, setLoadedConfig] = useState(null);
  const [result, setResult] = useState({});
  const lastSubmittedRef = useRef(null);
  const canvasRef = useRef(null);
  const formRef = useRef(null);
  const generalFormRef = useRef(null);
  const [formData, setFormData] = useState(null);
  const [Steps, setSteps] = useState([]);
  const [Form, setForm] = useState(null);

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
    JSON.stringify(loadedConfig?.steps || [])
  );

  useEffect(() => {
    if (!selectedType) return;

    const load = async () => {
      try {
        const [FormModule, StepsModule] = await Promise.all([
          import(`../components/projects/${selectedType}/Form.jsx`),
          import(`../components/projects/${selectedType}/Steps.js`),
        ]);

        console.log(`[Loader] Loaded steps for "${selectedType}":`, StepsModule.steps);

        setLoadedConfig({
          FormComponent: FormModule.default,
          steps: StepsModule.Steps,
          title: projectTypes.find(pt => pt.id === selectedType)?.name || 'Project',
        });
        setResult({});
      } catch (err) {
        console.error(`Error loading type "${selectedType}":`, err);
        setLoadedConfig(null);
      }
    };

    load();
  }, [selectedType]);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [selectedType]);


  const lastStringifiedRef = useRef('');

  useEffect(() => {
    const interval = setInterval(() => {
      if (formRef.current?.getData) {
        try {
          const data = formRef.current.getData();
          const stringified = JSON.stringify(data);

          if (stringified !== lastStringifiedRef.current) {
            console.log('[NewProject] Detected formData change:', data);

            lastStringifiedRef.current = stringified;
            setFormData(data);
            const cleanData = { ...data };
            delete cleanData.result; // Clear old results
            runAll(cleanData);
            setResult(cleanData.result || {});
          } else {
            console.log('[NewProject] formData unchanged');
          }

        } catch (err) {
          console.error('[NewProject] getData failed:', err);
        }
      } else {
        console.warn('[NewProject] formRef.getData is not available');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loadedConfig]);


  const handleSubmit = async () => {
    if (!formRef.current?.getData || !generalFormRef.current?.getData || !selectedType) return;

    const general = generalFormRef.current.getData();
    const attributes = formRef.current.getData();
    const calculatedRaw = getData();

    const excludeKeys = new Set([
      ...Object.keys(general),
      ...Object.keys(attributes),
    ]);

    const calculated = Object.fromEntries(
      Object.entries(calculatedRaw).filter(([key]) => !excludeKeys.has(key))
    );

    const payload = {
      type: selectedType === 'shadesails' ? 'sail' : selectedType === 'covers' ? 'cover' : selectedType,
      ...general,
      attributes,
      calculated,
    };

    try {
      const response = await fetch(getBaseUrl("/api/projects/create"), {
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
      alert('Failed to submit project.');
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
            <h2 className="text-xl font-bold mb-4">{loadedConfig.title}</h2>
            <div className="flex flex-col md:flex-row gap-10">
              <div className="flex-1">
                <GeneralFields ref={generalFormRef} role={role} />
                <div className="my-6 border-t pt-6">
                  <loadedConfig.FormComponent ref={formRef} role={role} />
                </div>
                <button onClick={handleSubmit} className="buttonStyle">
                  Submit Project
                </button>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={5000}
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
