import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { useLocation } from 'react-router-dom';

import EstimateTable from '../components/products/EstimateTable';
import SchemaEditor from '../components/products/SchemaEditor';

import ProjectForm from "../components/ProjectForm";

import { apiFetch } from '../services/auth';

import { useParams } from 'react-router-dom';

import { ProcessStepper } from '../components/products/ProcessStepper';

import { useSelector } from 'react-redux';



/* ============================================================================
 *  MODULE LOADER (per-project-type)
 *  - [Extract] into services/typeLoader.js later
 * ==========================================================================*/
async function loadTypeResources(type) {
  const [FormModule, StepsModule, SchemaModule] = await Promise.all([
    import(`../components/products/${type}/Form.jsx`),
    import(`../components/products/${type}/Steps.js`),
    import(`../components/products/${type}/Schema.js`),
  ]);

  return {
    Form: FormModule.default,
    // tolerate either a named export `Steps` or a const `steps`
    Steps: StepsModule.Steps ?? StepsModule.steps ?? [],
    Schema: SchemaModule.Schema ?? null,
  };
}

export default function ProjectDetailsPage() {
  // Get devMode from Redux
const devMode = useSelector(state => state.toggles.devMode);
  /* ==========================================================================
   *  ROUTING / PARAMS
   *  - [Extract] into a helper like useProjectIdFromLocation()
   * ========================================================================*/
  const location = useLocation();
  const { id: projectId } = useParams();

  /* ==========================================================================
   *  ROLE / GLOBAL OPTIONS (lightweight globals)
   * ========================================================================*/
  const role = localStorage.getItem('role');
  const options = useMemo(() => ({ scaleFactor: 1 }), []);

  /* ==========================================================================
   *  STATE: project snapshots (saved vs. edited)
   *  - attributes/calculated reflect SAVED server data
   *  - editedAttributes/editedCalculated reflect working copy
   *  - [Extract] snapshot reducer (useReducer) if this grows
   * ========================================================================*/
  const [project, setProject] = useState(null);
  const [editedProject, setEditedProject] = useState(null);
  const [error, setError] = useState(null); // error state for fetch failures
  // Legacy type id/name states retained for possible future use but not required with unified payload
  const [productID, setProductID] = useState(0);
  const [productName, setProductName] = useState('');

  /* ==========================================================================
   *  DYNAMIC TYPE RESOURCES
   *  - Form / Steps / Schema are type-dependent
   * ========================================================================*/
  const [Schema, setSchema] = useState(null);
  const [editedSchema, setEditedSchema] = useState(null);

  const [Steps, setSteps] = useState([]);
  const [Form, setForm] = useState(null);

  const [estimateVersion, setEstimateVersion] = useState(0);

  const [toggleData, setToggleData] = useState(false);

  /* ==========================================================================
   *  CANVAS / STEPPER
   *  - keep `stepper` instance stable-ish; reflect via a ref to avoid effect loops
   *  - [Extract] a custom hook useStepperRunner(canvasRef, Steps, options)
   * ========================================================================*/
  const formRef = useRef(null);

  const stepperRef = useRef(null);
  const canvasRef = useRef(null);
  const lastAutoRunKeyRef = useRef(null);

  //const stepper = useProcessStepper({ canvasRef, steps: Steps, options });

  // Minimal stepper setup – we defer heavy calculations until needed.
  useEffect(() => {
    if (!editedProject) return;
    if (!stepperRef.current) stepperRef.current = new ProcessStepper(800);
    if (canvasRef.current) stepperRef.current.addCanvas(canvasRef.current);
    if (Steps && Steps.length) {
      stepperRef.current.steps = [];
      Steps.forEach((s) => stepperRef.current.addStep(s));
    }
  }, [editedProject, Steps]);
  
  useEffect(() => {
    if (!stepperRef.current) stepperRef.current = new ProcessStepper(800);
    if (canvasRef.current) stepperRef.current.addCanvas(canvasRef.current);
    if (Steps && Steps.length) {
      stepperRef.current.steps = [];
      Steps.forEach((step) => stepperRef.current.addStep(step));
    }
  }, [Steps, canvasRef.current]);

  // Auto-run the stepper once everything is ready (project, steps, canvas, stepper)
  useEffect(() => {
    const ready = editedProject && stepperRef.current && canvasRef.current && Steps && Steps.length;
    if (!ready) return;
    const key = `${editedProject?.id ?? 'new'}:${Steps.length}`;
    if (lastAutoRunKeyRef.current === key) return; // prevent duplicate runs for same state
    lastAutoRunKeyRef.current = key;
    (async () => {
      try {
        console.groupCollapsed('[AUTO-RUN] Stepper starting');
        console.log('Input (editedProject):', JSON.parse(JSON.stringify(editedProject)));
        // Auto-run for visuals only; do not mutate editedProject to avoid loops
        const result = await stepperRef.current.runAll(editedProject);
        console.log('Output (enriched, visual-only):', JSON.parse(JSON.stringify(result)));
        console.groupEnd();
      } catch (e) {
        console.error('Auto stepper run failed:', e);
      }
    })();
  }, [editedProject, Steps, canvasRef.current]);

  /* ==========================================================================
   *  DATA FETCHING: loadProjectFromServer
   *  - populates both saved and edited snapshots
   *  - loads type modules after project fetched
   *  - [Extract] into services/projects.getProject(projectId)
   * ========================================================================*/
  
/* Then modify the loadProjectFromServer function to ensure proper ordering */
const loadProjectFromServer = async () => {
  try {
    const res = await apiFetch(`/project/${projectId}`);
    if (!res.ok) throw new Error('Failed to fetch project');

    const data = await res.json();
    console.log("Loaded project data:", data);

    // Initialize stepper first if needed
    if (!stepperRef.current) {
      stepperRef.current = new ProcessStepper(800);
      stepperRef.current.addCanvas(canvasRef.current);
    }

    // Load type modules first
    if (data?.type) {
      const modules = await loadTypeResources(data.type.name);
      
      // Set Steps first so they're available for calculations
      setSteps(modules.Steps || []);
      
      // Register steps with stepper immediately
      if (stepperRef.current && modules.Steps) {
        stepperRef.current.steps = [];
        modules.Steps.forEach(step => stepperRef.current.addStep(step));
      }

      // Set other module resources
      setForm(() => modules.Form);
      setSchema(modules.Schema);
      setEditedSchema(modules.Schema);
      
  // Now set project data and initialize edited copy for experimentation
  setProject(data);
  setEditedProject(data);

      //handleRunStepper(); // Run stepper after setting project

    } else {
      setForm(null);
      setSteps([]);
      setSchema(null);
      setEditedSchema(null);
      setProject(data);
    }
  } catch (err) {
    console.error('Failed to fetch project:', err);
    setError('Unable to load project. Please try again later.');
  }
};

/* Add an effect to monitor calculated values */
/*
useEffect(() => {
  console.log("editedCalculated changed:", editedCalculated);
}, [editedCalculated]);
*/
  // initial fetch / refetch when projectId changes
  useEffect(() => {
    loadProjectFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps

    //handleRunStepper(); // Run stepper after setting project
  }, [projectId]);

  /* ==========================================================================
   *  ACTIONS: UI event handlers
   *  - [Extract] into a small controller object if desired
   * ========================================================================*/
  const handleReturn = () => {
    // Placeholder for future diff/undo features
    setEditedProject(project);
  };

  /*
  const handleCheck = () => {
    console.log("handleCheck called");
    console.log("formRef current:", formRef.current);
    
    if (formRef.current?.getValues) {
      const values = formRef.current.getValues();
      console.log("Form values:", values);
      setEditedAttributes(values.attributes);
    } else {
      console.log("No getValues method found on formRef");
    }
  };
  */
  // Helper: sync edited project from the form's current values
  const syncEditedFromForm = () => {
    const values = formRef.current?.getValues?.();
    if (values) setEditedProject(values);
    return values;
  };

  // Unified submit: run stepper once (manual style), update editedProject, then send editedProject
  const handleSubmit = async () => {
    try {
      const base = syncEditedFromForm() || editedProject || project;
      if (!base) {
        alert('No edited values to submit.');
        return;
      }
      console.groupCollapsed('[SUBMIT] Pre-submit stepper run');
      console.log('Input (base):', JSON.parse(JSON.stringify(base)));
      const enriched = await stepperRef.current.runAll(base);
      console.log('Output (enriched to submit):', JSON.parse(JSON.stringify(enriched)));
      setEditedProject(enriched);
      console.groupEnd();
      const payload = enriched;
      console.groupCollapsed('[SUBMIT] Sending editedProject payload');
      console.log('editedProject:', JSON.parse(JSON.stringify(editedProject)));
      console.log('payload used:', JSON.parse(JSON.stringify(payload)));
      console.groupEnd();
      const res = await apiFetch(`/products/edit/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        alert(`Update failed: ${json?.error || res.statusText}`);
        return;
      }
      // Merge returned data if server sends authoritative project, else fall back to local form values
      const updatedProject = json?.project || {
        ...project,
        ...payload,
        products: (payload && payload.products) || project.products
      };
      console.groupCollapsed('[SUBMIT] Response / updated state');
      console.log('server json:', json);
      console.log('updatedProject:', JSON.parse(JSON.stringify(updatedProject)));
      console.groupEnd();
      setProject(updatedProject);
      // Keep editedProject as the enriched payload we submitted; avoid triggering auto-run cascades
      //alert('Project updated & stepper recalculated.');
      window.location.reload();
    } catch (e) {
      console.error('Submit error:', e);
      alert('Error submitting project.');
    }
  };

  const handleCheck = () => {
    const v = syncEditedFromForm();
    console.log('Form values (synced to editedProject):', v);
    handleRunStepper();
    if (v) alert(JSON.stringify(v, null, 2));
  };

  // Run stepper calculations and redraw canvas with unified project data
  const handleRunStepper = async () => {
    if (!stepperRef.current) {
      console.warn('Stepper not initialized');
      return;
    }
    const values = syncEditedFromForm() || editedProject || project;
    if (!values) {
      console.warn('No values available to run stepper');
      return;
    }
    console.groupCollapsed('[RUN] Manual stepper run');
    console.log('Input:', JSON.parse(JSON.stringify(values)));
    try {
      const result = await stepperRef.current.runAll(values);
      console.log('Output (enriched):', JSON.parse(JSON.stringify(result)));
      setEditedProject(result);
      console.groupEnd();
    } catch (e) {
      console.error('Stepper error:', e);
    }
  };

  const handleMaterials = () => {
    const working = editedProject || project;
    const primary = working?.products?.[0];
    const mats = primary?.calculated?.materials;
    alert(mats ? JSON.stringify(mats, null, 2) : 'No materials data available.');
  };

  // handlers
  const handleSchemaCheck = (next) => setEditedSchema(next);
  const handleSchemaReturn = () => setEditedSchema(Schema);
  const handleSchemaSubmit = (next) => {
    // stub — persist later
    console.log('[Schema submit] (stub):', next);
    alert('Schema submit not implemented yet; preview uses the edited schema.');
  };

  // bump estimate version if you want a hard reset on schema change
  useEffect(() => {
    setEstimateVersion(v => v + 1);
  }, [editedSchema]);
  // Removed attributes/calculated version bumps – unified model now.

  /* ==========================================================================
   *  RENDER: layout (left: Form, right: canvas + (future) estimate/schema)
   *  - [Extract] presentational layout components later
   * ========================================================================*/
  if (error) return <div>{error}</div>;   // show error
  if (!project) return <div>Loading...</div>; // previous fallback

  // Derive product type & primary product for EstimateTable
  const productType = project?.type?.name; // e.g. 'COVER'
  const primaryProduct = project?.products?.[0] || {};
  const primaryAttributes = primaryProduct?.attributes || {};
  const primaryCalculated = primaryProduct?.calculated || {};

  return (
    <>
      <div
        className="layout"
        style={{
          display: 'flex',
          // flexDirection controlled by CSS below
          alignItems: 'stretch',
          gap: '24px',
          marginTop: '24px',
          marginLeft: '16px',
          marginRight: '16px',
          width: 'calc(100% - 32px)',
          boxSizing: 'border-box',
        }}
      >
        {/* LEFT */}
        <div className="pane left" style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div className="scroll-x">
            <div style={{ maxWidth: '800px' }}>
              {Form ? (
                <Suspense fallback={<div>Loading form…</div>}>
                  <ProjectForm
                    productType={productType}
                    formRef={formRef}
                    rehydrate={editedProject || project}
                  />
                

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button
                      onClick={handleCheck}
                      className="buttonStyle"
                    >
                      Check Values
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="buttonStyle"
                    >
                      Submit changes
                    </button>
                    <button
                      onClick={handleMaterials}
                      className="buttonStyle" 
                    >
                      Check Materials
                    </button>
                    
                    <>
                    
                    {devMode && <button
                      onClick={handleRunStepper}
                      className="buttonStyle"
                    >
                      Run Stepper
                    </button>
}
                    </>
                    
                    {devMode && (
                      <button
                        onClick={() => setToggleData(!toggleData)}
                        className="buttonStyle"
                      >
                        {toggleData ? 'Hide' : 'Show'} JSON
                      </button>
                    )}
                  </div>
                  
                  {toggleData && (
                    <div style={{ marginTop: '16px', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', background: '#f9f9f9', maxHeight: '500px', overflow: 'auto' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                        Project JSON
                      </div>
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.5' }}>
                        <JsonViewer data={editedProject || project} />
                      </div>
                    </div>
                  )}
                </Suspense>
              ) : (
                <div style={{ color: '#888' }}>Form not available for this project type.</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div
          className="pane right"
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Buttons: only for staff, and only when it's a cover */}
          {(role === 'estimator'|| role === 'designer' || role === 'admin') && project?.type?.name === 'COVER' && (
            <div>
              <button onClick={() => fetchDXF(project.id)} className="buttonStyle">
                Download DXF
              </button>
              <button onClick={() => fetchPDF(project.id)} className="buttonStyle">
                Download PDF
              </button>
              <button onClick={() => fetchPDF(project.id, true)} className="buttonStyle">
                Download PDF with BOM
              </button>
            </div>
          )}

          {/* Estimate table: only admin + estimator */}
              
          
          {(role === 'estimator'|| role === 'admin') ? (
            Schema ? (
              <div className="scroll-x">
                <EstimateTable
                  key={estimateVersion}
                  schema={editedSchema}
                  editedSchema={editedSchema}
                  onCheck={handleSchemaCheck}
                  onReturn={handleSchemaReturn}
                  onSubmit={handleSchemaSubmit}
                  products={(editedProject?.products ?? project.products)}
                />
              </div>
            ) : (
              <div style={{ color: '#888' }}>No estimate schema for this project type.</div>
            )
          ) : null}
          

          {/* Canvas: all staff (designer, admin, estimator) */}
          {(role === 'estimator'|| role === 'designer' || role === 'admin' || role === 'client') && (
            <div className="scroll-x" style={{ marginTop: 24 }}>
              <canvas
                ref={canvasRef}
                width={1000}
                height={4000}
                style={{
                  border: '1px solid #ccc',
                  marginTop: '20px',
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

      <style>
        {`
          /* Mobile-first: stacked */
          .layout { 
            flex-direction: column;
            padding-bottom: 48px; /* gives users an easy thumb area to scroll */
          }

          /* Stop the PAGE from scrolling sideways on mobile, but keep vertical scroll smooth */
          @media (max-width: 799px) {
            html, body { 
              overflow-x: hidden; 
              overflow-y: auto;
              height: 100%;
            }
            .layout { 
              overflow-x: hidden; 
              overflow-y: visible; 
              touch-action: auto; /* allow natural vertical scroll on the page */
            }
            /* Each section can scroll horizontally without hijacking vertical swipes */
            .scroll-x {
              overflow-x: auto;
              overflow-y: visible;              /* don't trap vertical scrolling */
              -webkit-overflow-scrolling: touch;
              overscroll-behavior-x: contain;   /* don't bubble horizontal to page */
              touch-action: pan-x pan-y;        /* allow both directions inside */
              scrollbar-gutter: stable both-edges;
            }
          }

          /* Desktop: two columns */
          @media (min-width: 800px) {
            .layout {
              flex-direction: row;
              gap: 32px;
              margin-left: 20px;
              margin-right: 20px;
              width: calc(100% - 40px);
            }
            .pane {
              flex: 1 1 50%;
              max-width: 50%;
              min-width: 0;
            }
            .scroll-x {
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              overscroll-behavior-x: contain;
            }
          }
        `}
      </style>
    </>
  );

}







// cover dxf

async function fetchDXF(projectId) {
  try {
    const response = await apiFetch('/project/get_dxf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
    });

    if (!response.ok) {
      let msg = `Request failed with status ${response.status}`;
      try {
        const errData = await response.json();
        if (errData.error) msg = errData.error;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    // Get the file blob
    const blob = await response.blob();

    // Try to extract filename from headers
    let filename = `project_${projectId}.dxf`;
    const cd = response.headers.get('Content-Disposition');
    if (cd) {
      const match = cd.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error fetching DXF:', error);
    alert(error.message || 'Failed to download DXF');
  }
}


async function fetchPDF(projectId, include_bom) {
  try {
    const response = await apiFetch('/project/get_pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, include_bom: include_bom }),
    });

    if (!response.ok) {
      let msg = `Request failed with status ${response.status}`;
      try {
        const errData = await response.json();
        if (errData?.error) msg = errData.error;
      } catch {
        // ignore JSON parse issues
      }
      throw new Error(msg);
    }

    const blob = await response.blob();

    // Default filename
    let filename = `project_${projectId}.pdf`;

    // Try to extract filename from Content-Disposition
    const cd = response.headers.get('Content-Disposition');
    if (cd) {
      // Prefer RFC 5987 filename* first
      // e.g., Content-Disposition: attachment; filename*=UTF-8''project_123_sheet.pdf
      let matchStar = cd.match(/filename\*\s*=\s*([^']*)'[^']*'([^;]+)\s*;?/i);
      if (matchStar && matchStar[2]) {
        try {
          filename = decodeURIComponent(matchStar[2]);
        } catch {
          filename = matchStar[2];
        }
      } else {
        // Fallback to basic filename="..."
        const match = cd.match(/filename\s*=\s*"?([^"]+)"?/i);
        if (match && match[1]) filename = match[1];
      }
    }

    // Trigger browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `project_${projectId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error fetching PDF:', error);
    alert(error.message || 'Failed to download PDF');
  }
}


/* ============================================================================
 *  LEAN JSON VIEWER - Recursive collapsible viewer
 * ==========================================================================*/
function JsonViewer({ data, level = 0 }) {
  if (data === null) return <span style={{ color: '#999' }}>null</span>;
  if (data === undefined) return <span style={{ color: '#999' }}>undefined</span>;
  
  const type = typeof data;
  if (type === 'string') return <span style={{ color: '#a31515' }}>"{data}"</span>;
  if (type === 'number') return <span style={{ color: '#098658' }}>{data}</span>;
  if (type === 'boolean') return <span style={{ color: '#0000ff' }}>{String(data)}</span>;
  
  if (Array.isArray(data)) {
    if (data.length === 0) return <span>[]</span>;
    return (
      <details style={{ marginLeft: level > 0 ? '16px' : 0 }}>
        <summary style={{ cursor: 'pointer', color: '#666' }}>
          Array[{data.length}]
        </summary>
        <div>
          {data.map((item, i) => (
            <div key={i} style={{ marginLeft: '12px' }}>
              <span style={{ color: '#999' }}>[{i}]:</span> <JsonViewer data={item} level={level + 1} />
            </div>
          ))}
        </div>
      </details>
    );
  }
  
  if (type === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span>{'{}'}</span>;
    return (
      <details style={{ marginLeft: level > 0 ? '16px' : 0 }}>
        <summary style={{ cursor: 'pointer', color: '#666' }}>
          Object {'{'}...{'}'}
        </summary>
        <div>
          {keys.map(key => (
            <div key={key} style={{ marginLeft: '12px' }}>
              <span style={{ color: '#001080', fontWeight: '500' }}>{key}:</span>{' '}
              <JsonViewer data={data[key]} level={level + 1} />
            </div>
          ))}
        </div>
      </details>
    );
  }
  
  return <span>{String(data)}</span>;
}