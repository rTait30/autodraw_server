import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Menu } from 'lucide-react';
import { useProcessStepper } from '../components/projects/useProcessStepper';
import GeneralFields from '../components/projects/GeneralFields';

const projectTypes = [
  { name: 'Covers', id: 'covers' },
  { name: 'Shade Sail', id: 'shadesails' },
  { name: 'Simple Box', id: 'simplebox' },
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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const options = useMemo(() => ({
    showData: false,
    scaleFactor: 1,
    virtualWidth: 1000,
    virtualHeight: 1000,
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
          title: selectedType,
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
    const timeout = setTimeout(() => {
      if (!loadedConfig || !formRef.current?.getData) return;

      const data = formRef.current.getData();
      const stringified = JSON.stringify(data);
      if (stringified !== lastSubmittedRef.current) {
        runAll(data);
        setResult(data.result || {});
        lastSubmittedRef.current = stringified;
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [loadedConfig, runAll]);

  const handleSubmit = async () => {
    if (!formRef.current?.getData || !generalFormRef.current?.getData || !selectedType) return;

    const payload = {
      type: selectedType,
      ...generalFormRef.current.getData(),
      attributes: formRef.current.getData(),
      calculated: getData()
    };

    try {
      const response = await fetch('/copelands/api/project/new', {
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
      <div className="flex items-center justify-between p-4 bg-white shadow-md md:hidden">
        <h3 className="text-lg font-bold">Products</h3>
        <button onClick={toggleSidebar}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <aside
        className={`bg-white shadow-md p-6 w-56 transform transition-transform duration-300 ease-in-out z-50
          md:translate-x-0 md:relative md:block
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full fixed top-0 left-0 h-full'}`}
      >
        <h3 className="text-lg font-bold mb-4">List of Products</h3>
        <ul className="list-none p-0">
          {projectTypes.map(({ name, id }) => (
            <li key={id} className="mb-2">
              <button
                onClick={() => {
                  setSelectedType(id);
                  setSidebarOpen(false);
                }}
                className={`block w-full text-left py-1 px-2 rounded transition ${
                  selectedType === id
                    ? 'bg-blue-100 text-blue-800 font-semibold underline'
                    : 'hover:bg-gray-100'
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

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
                <button
                  onClick={handleSubmit}
                  className="buttonStyle"
                >
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
