import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProcessStepper } from '../components/projects/useProcessStepper';
import GeneralFields from '../components/projects/GeneralFields';
import ProjectSidebar from '../components/ProjectSidebar';

import { getBaseUrl } from "../utils/baseUrl";

const projectTypes = [
  { name: 'Covers', id: 'covers' },
  { name: 'Shade Sail', id: 'shadesails' },
  { name: 'Simple Box', id: 'simplebox' },
  { name: 'Calculator', id: 'calculator' },
];

export default function NewProjectGeneral() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [loadedConfig, setLoadedConfig] = useState(null);
  const [result, setResult] = useState({});
  const lastSubmittedRef = useRef(null);
  const canvasRef = useRef(null);
  const formRef = useRef(null);
  const generalFormRef = useRef(null);

  const role = localStorage.getItem('role') || 'guest';
  const userId = localStorage.getItem('user_id') || '';

  const options = useMemo(() => ({
    showData: false,
    scaleFactor: 1,
    stepOffsetY: 1000,
  }), []);

  const { runAll, getData } = useProcessStepper({
    canvasRef,
    steps: loadedConfig?.steps || [],
    options,
  });

  useEffect(() => {
    if (!selectedType) return;

    const load = async () => {
      try {
        const [FormModule, StepsModule] = await Promise.all([
          import(`../components/projects/${selectedType}/Form.jsx`),
          import(`../components/projects/${selectedType}/Steps.js`),
        ]);

        setLoadedConfig({
          FormComponent: FormModule.default,
          steps: StepsModule.steps,
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

  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (!formData || !loadedConfig) return;

    const timeout = setTimeout(() => {
      const stringified = JSON.stringify(formData);
      if (stringified !== lastSubmittedRef.current) {
        runAll(formData);
        setResult(formData.result || {});
        lastSubmittedRef.current = stringified;
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [formData, loadedConfig, runAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (formRef.current?.getData) {
        const data = formRef.current.getData();
        setFormData(data);
      }
    }, 200);

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

    let selectedType2;
    if (selectedType === 'shadesails') {
      selectedType2 = 'sail'; // Ensure correct type for shadesails
    } else {
      selectedType2 = selectedType;
    }

    const payload = {
      type: selectedType2,
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
                <GeneralFields ref={generalFormRef} role={role} userId={userId} />
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
                  height={1000}
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
