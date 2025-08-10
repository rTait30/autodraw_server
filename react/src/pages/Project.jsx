import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { useLocation } from 'react-router-dom';


import EstimateTable from '../components/projects/EstimateTable';
import SchemaEditor from '../components/projects/SchemaEditor';

import { getBaseUrl } from '../utils/baseUrl.js';
import { useProcessStepper } from '../components/projects/useProcessStepper';



// --- minimal dynamic loader: assumes folder == type ---
async function loadTypeResources(type) {
  
  const [FormModule, StepsModule, SchemaModule] = await Promise.all([
    import(`../components/projects/${type}/Form.jsx`),
    import(`../components/projects/${type}/Steps.js`),
    import(`../components/projects/${type}/Schema.js`),
  ]);

  return {
    Form: FormModule.default,
    Steps: StepsModule.Steps || [],
    Schema: SchemaModule.Schema || null,
  };
}

export default function ProjectDetailsPage() {

  const [project, setProject] = useState(null);

  const [attributes, setAttributes] = useState({});
  const [editedAttributes, setEditedAttributes] = useState({});

  const [calculated, setCalculated] = useState({});
  const [editedCalculated, setEditedCalculated] = useState({});

  const [Schema, setSchema] = useState(null);
  const [Steps, setSteps] = useState([]);
  const [Form, setForm] = useState(null);

  const location = useLocation();
  const projectId = useMemo(() => {
    const parts = location.pathname.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2];
  }, [location.pathname]);

  const canvasRef = useRef(null);
  const options = useMemo(() => ({ scaleFactor: 1 }), []);

  const role = localStorage.getItem('role');

  const loadProjectFromServer = async () => {
    try {
      const res = await fetch(getBaseUrl(`/api/project/${projectId}`));
      if (!res.ok) throw new Error('Failed to fetch project');
      const data = await res.json();

      console.log('Fetched project:', data);

      setProject(data);

      setAttributes(data.attributes || {});
      setEditedAttributes(data.attributes || {});

      setCalculated(data.calculated || {});
      setEditedCalculated(data.calculated || {});

      console.log('Project type:', data.type);

      if (data?.type) {
        const modules = await loadTypeResources(data.type);

        setForm(() => modules.Form);
        setSteps(modules.Steps);
        setSchema(modules.Schema);

        

      } else {
        console.warn('Project missing type');
        setForm(null);
        setSteps([]);
        setSchema(null);
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
    }
  };

  const stepper = useProcessStepper({ canvasRef, steps: Steps, options });

  useEffect(() => {
    loadProjectFromServer();
  }, [projectId]);

    // keep stepper up-to-date in a ref without retriggering compute by identity changes
  const stepperRef = useRef(stepper);
  useEffect(() => {
    stepperRef.current = stepper;
  }, [stepper]);

  useEffect(() => {
    if (!Steps.length || !Object.keys(editedAttributes || {}).length) return;

    let cancelled = false;
    (async () => {
      const result = await stepperRef.current.runAll({ ...editedAttributes });
      if (!cancelled && result) setEditedCalculated(result);
    })();

    return () => { cancelled = true; };
  }, [editedAttributes, Steps]); // <- no 'stepper' here

  const handleReturn = () => {
    setEditedAttributes(attributes);   // restore from original saved snapshot
    setEditedCalculated(calculated);   // restore from original saved snapshot
  };

  const handleCheck = async (nextAttributes) => {
    setEditedAttributes(nextAttributes);

    try {
      const result = await stepper.current.runAll({ ...nextAttributes });
      setEditedCalculated(result);
    } catch (e) {
      console.error('Check failed:', e);
    }
  };

  const handleSubmit = () => {
    const payload = {
      ...project,
      attributes: attributes,
      calculated,
    };

    fetch(getBaseUrl(`/api/projects/create`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to submit');
        return res.json();
      })
      .then(() => {
        loadProjectFromServer();
        alert('Project updated!');
      })
      .catch(err => {
        console.error(err);
        alert('Submit failed');
      });
  };

  const handleReset = () => {
    loadProjectFromServer();
  };

  if (!project ) return <div>Loading...</div>;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '32px',
        marginTop: '24px',
        width: '100%',
      }}
    >
      {/* LEFT: Project Data Form, max half screen */}
      <div style={{ flex: '1 1 50%', maxWidth: '50%', minWidth: '320px' }}>
        <div style={{ maxWidth: '800px' }}>
          {Form ? (
            <Suspense fallback={<div>Loading form…</div>}>
              <Form
                attributes={editedAttributes}
                calculated={editedCalculated}
                showFabricWidth
                onReturn={handleReturn}
                onCheck={handleCheck}
                onSubmit={handleSubmit}
              />
            </Suspense>
          ) : (
            <>
              {console.warn('[ProjectDetailsPage] Form component is null — not rendering')}
              <div style={{ color: '#888' }}>Form not available for this project type.</div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT: */}
      <div
        style={{
          flex: '1 1 50%',
          maxWidth: '50%',
          minWidth: '320px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          marginRight: '20px',
        }}
      >
        {(role === 'estimator' || role === 'admin') ? (
          <>
            
            
            {/* ProcessStepper canvas under EstimateTable/SchemaEditor */}
            <div style={{ marginTop: 24 }}>
              <canvas
                ref={canvasRef}
                width={500}
                height={2000}
                style={{
                  border: '1px solid #ccc',
                  width: '100%',
                  maxWidth: '500px',
                  display: 'block',
                  background: '#fff',
                }}
              />
            </div>
          </>
        ) : (
          // For other roles, show canvas at the top right
          <div style={{ alignSelf: 'flex-end', width: '100%', maxWidth: 500 }}>
            <canvas
              ref={canvasRef}
              width={500}
              height={1000}
              style={{
                border: '1px solid #ccc',
                width: '100%',
                maxWidth: '500px',
                display: 'block',
                background: '#fff',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
