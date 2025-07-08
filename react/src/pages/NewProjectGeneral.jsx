import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Menu } from 'lucide-react';
import { useProcessStepper } from '../components/projects/useProcessStepper';

const projectTypes = [
  { name: 'Covers', id: 'covers' },
  { name: 'Shade Sails', id: 'shadesails' },
  { name: 'Simple Box', id: 'simplebox' },
];

export default function NewProjectGeneral() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [loadedConfig, setLoadedConfig] = useState(null);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    if (!selectedType) return;

    const load = async () => {
      try {
        const [FormModule, StepsModule, InfoModule] = await Promise.all([
          import(`../components/projects/${selectedType}/Form.jsx`),
          import(`../components/projects/${selectedType}/Steps.js`),
          import(`../components/projects/${selectedType}/info.js`),
        ]);

        setLoadedConfig({
          FormComponent: FormModule.default,
          steps: StepsModule.steps,
          title: InfoModule.title || 'New Project',
          getInitialFormData: InfoModule.getInitialFormData || (() => ({})),
        });
      } catch (err) {
        console.error(`Error loading type "${selectedType}":`, err);
        setLoadedConfig(null);
      }
    };

    load();
  }, [selectedType]);

  const canvasRef = useRef(null);
  const [formData, setFormData] = useState({});
  const [result, setResult] = useState({});
  const lastSubmittedRef = useRef(null);

  const options = useMemo(() => ({
    showData: false,
    scaleFactor: 1,
    virtualWidth: 1000,
    virtualHeight: 1000,
    stepOffsetY: 1000,
  }), []);

  const { runAll } = useProcessStepper({
    canvasRef,
    steps: loadedConfig?.steps || [],
    options,
  });

  useEffect(() => {
    if (!loadedConfig) return;
    setFormData(loadedConfig.getInitialFormData());
  }, [loadedConfig]);

  // Auto-run on form change
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!loadedConfig || !formData) return;

      const runData = { ...formData };
      const stringified = JSON.stringify(runData);
      if (stringified !== lastSubmittedRef.current) {
        runAll(runData);
        setResult(runData.result || {});
        lastSubmittedRef.current = stringified;
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [formData, loadedConfig, runAll]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Top bar for mobile */}
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
                <loadedConfig.FormComponent formData={formData} onChange={setFormData} />
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
