import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useProcessStepper } from '../components/projects/useProcessStepper';
import ProjectSidebar from '../components/ProjectSidebar';
import { apiFetch } from '../services/auth';

import FormBase from '../components/projects/FormBase';

//import Form from '../components/projects/cover/Form.jsx';



const projectTypes = [
  { name: 'Covers', id: 'cover' },
  { name: 'Shade Sail', id: 'shadesail' },
];

// General keys integrated in FormBase
const GENERAL_KEYS = ['name', 'client_id', 'due_date', 'info'];

export default function NewProject() {

  const formRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [projectType, setProjectType] = useState(null);
  //const [loadedConfig, setLoadedConfig] = useState(null);

  const [ActiveForm, setActiveForm] = useState(null);

  const [generalData, setGeneralData] = useState({
    name: 'test project',
    client_id: '',
    due_date: '',
    info: '',
  });


  const [Steps, setSteps] = useState([]);
  const [Schema, setSchema] = useState([]);

  const [result, setResult] = useState({});
  const [stepperKey, setStepperKey] = useState(0);

  const canvasRef = useRef(null);
  const lastStringifiedRef = useRef('');

  const role = localStorage.getItem('role') || 'guest';

  const options = useMemo(() => ({
    showData: false,
    scaleFactor: 1,
    stepOffsetY: 800,
  }), []);

  /*
  const { runAll, getData } = useProcessStepper(
    {
      canvasRef,
      steps: steps || [],
      options,
    }
  );
  */

  // Lazy-load Form + Steps for the selected type
  useEffect(() => {
    if (!projectType) return;

    console.log(`[NewProject] Loading form "${projectType}"...`);

    setActiveForm(null);

      
    import(`../components/projects/${projectType}/Form.json`)
      .then((json) => {
        console.log("Loaded form config:", json);   // ✅ raw object
        setActiveForm(json);
      })
      .catch((err) => {
        console.error("Failed to load form config:", err);
        setActiveForm(null);
      });

    //console.log(`Form: ${ActiveForm}`)

    //setActiveForm(() => LazyForm)

    //console.log(`form fields: ${ActiveForm.fields}`)
    

  }, [projectType]);

  // Extra safety: clear canvas any time steps set changes
  /*
  useEffect(() => {
    hardReset();
  }, [loadedConfig?.steps, hardReset]);
  */

  // Auto-run steps whenever form data changes
  /*
  useEffect(() => {
    //if (!loadedConfig) return;

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
  }, projectType);
  */
 

  const handleSubmit = async () => {
    if (Form.getData) return;

    if (!projectType) {
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
        type: projectType, // keep id
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

  console.log("generalData (NewProject):", generalData);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <ProjectSidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        projectType={projectType}
        setSelectedType={(t) => {
          setProjectType(t);
          // any extra per-switch cleanup can go here
        }}
        projectTypes={projectTypes}
      />

      <main className="flex-1 p-6">
        {ActiveForm ? (
          <>
            <div className="flex flex-wrap gap-10">
              
              <div className="flex-1 min-w-[400px]">
                {/* Force remount on type/stepper changes */}

                <FormBase
                  ref={formRef}
                  generalDataHydrate={generalData}
                  formConfig={ActiveForm}
                />

                <button onClick={() => console.log("Values:", formRef.current?.getValues())} className="buttonStyle mt-6">
                  Print values
                </button>

                <button onClick={handleSubmit} className="buttonStyle mt-6">
                  {["estimator", "admin", "designer"].includes(role)
                    ? "Make Lead"
                    : "Get Quote"}
                </button>
              </div>
              

              <div className="flex-1 min-w-[400px] flex flex-col items-center">
                <canvas
                  //key={`canvas:${resetToken}`}
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
