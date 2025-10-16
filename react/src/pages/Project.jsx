import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { useLocation } from 'react-router-dom';

import EstimateTable from '../components/products/EstimateTable';
import SchemaEditor from '../components/products/SchemaEditor';

import { apiFetch } from '../services/auth';

import { useParams } from 'react-router-dom';

import { ProcessStepper } from '../components/products/ProcessStepper';

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
  
  const [error, setError] = useState(null); // new state

  const [projectTypeID, setProjectTypeID] = useState(0);
  const [projectTypeName, setProjectTypeName] = useState('');

  const [attributes, setAttributes] = useState({});
  const [editedAttributes, setEditedAttributes] = useState({});

  const [calculated, setCalculated] = useState({});
  const [editedCalculated, setEditedCalculated] = useState({});

  /* ==========================================================================
   *  DYNAMIC TYPE RESOURCES
   *  - Form / Steps / Schema are type-dependent
   * ========================================================================*/
  const [Schema, setSchema] = useState(null);
  const [editedSchema, setEditedSchema] = useState(null);

  const [Steps, setSteps] = useState([]);
  const [Form, setForm] = useState(null);

  const [estimateVersion, setEstimateVersion] = useState(0);

  /* ==========================================================================
   *  CANVAS / STEPPER
   *  - keep `stepper` instance stable-ish; reflect via a ref to avoid effect loops
   *  - [Extract] a custom hook useStepperRunner(canvasRef, Steps, options)
   * ========================================================================*/
  const canvasRef = useRef(null);
  //const stepper = useProcessStepper({ canvasRef, steps: Steps, options });

  // keep latest stepper in a ref, without retriggering consumers by identity change

  /*
  const stepperRef = useRef(stepper);
  useEffect(() => {
    stepperRef.current = stepper;
  }, [stepper]);
  */

  useEffect(() => {
    if (!Steps.length || !Object.keys(editedAttributes || {}).length) return;

    let cancelled = false;
    (async () => {
      const result = await stepperRef.current.runAll({ ...editedAttributes });
      const filtered = Object.fromEntries(
        Object.entries(result || {}).filter(([k]) => !(k in editedAttributes))
      );
      if (!cancelled) setEditedCalculated(filtered);
    })();

    return () => { cancelled = true; };
  }, [editedAttributes, Steps]);

  /* ==========================================================================
   *  DATA FETCHING: loadProjectFromServer
   *  - populates both saved and edited snapshots
   *  - loads type modules after project fetched
   *  - [Extract] into services/projects.getProject(projectId)
   * ========================================================================*/
  const loadProjectFromServer = async () => {
    try {
      const res = await apiFetch(`/project/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');

      const data = await res.json();

      setProject(data);

      // Saved snapshots
      setAttributes(data.attributes || {});
      setCalculated(data.calculated || {});

      // Working snapshots start from saved
      setEditedAttributes(data.attributes || {});
      setEditedCalculated(data.calculated || {});

      // Load type modules
      if (data?.type) {
        const modules = await loadTypeResources(data.type);
        setForm(() => modules.Form);
        setSteps(modules.Steps || []);
        setSchema(modules.Schema);
        setEditedSchema(modules.Schema); // working copy starts as saved
      } else {
        setForm(null);
        setSteps([]);
        setSchema(null);
        setEditedSchema(null);
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
      setError('Unable to load project. Please try again later.'); // store error
    }
  };

  // initial fetch / refetch when projectId changes
  useEffect(() => {
    loadProjectFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /* ==========================================================================
   *  ACTIONS: UI event handlers
   *  - [Extract] into a small controller object if desired
   * ========================================================================*/
  const handleReturn = () => {
    // restore working copy from saved snapshot
    setEditedAttributes(attributes);
    setEditedCalculated(calculated);
  };

  const handleCheck = async (nextAttributes) => {
    // trigger recompute via effect by updating editedAttributes
    setEditedAttributes(nextAttributes);
  };

  // small helper to compute calcs from attrs using your stepper
  const recalcCalculated = async (attrs) => {
    if (!Steps.length) return {};
    const result = await stepperRef.current.runAll({ ...attrs });
    return Object.fromEntries(
      Object.entries(result || {}).filter(([k]) => !(k in attrs))
    );
  };

  const handleSubmit = async (nextAttributes) => {
    // keep UI state in sync
    setEditedAttributes(nextAttributes);

    // decide which calculated to send
    let calcs;
    // staff: recompute synchronously here so payload is fresh
    calcs = await recalcCalculated(nextAttributes);
    setEditedCalculated(calcs);


    // now submit the exact snapshot you want
    await apiFetch(`/projects/edit/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          general:{
            name: project.name,
            client_id: project.client_id,
            due_date: project.due_date,
            info: project.info,
          },
        editedAttributes: nextAttributes, // use the param, not (possibly stale) state
        editedCalculated: calcs,
      }),
    });

    alert('Project updated successfully.');
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

  useEffect(() => {
    setEstimateVersion((v) => v + 1);
  }, [Schema, editedAttributes, editedCalculated]);

  /* ==========================================================================
   *  RENDER: layout (left: Form, right: canvas + (future) estimate/schema)
   *  - [Extract] presentational layout components later
   * ========================================================================*/
  if (error) return <div>{error}</div>;   // show error
  if (!project) return <div>Loading...</div>; // previous fallback

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
                  <Form
                    general={{
                      enabled: true,
                      name: project.name,
                      client_id: project.client_id,
                      due_date: project.due_date,
                      info: project.info,
                    }}
                    attributes={editedAttributes}
                    calculated={editedCalculated}
                    showFabricWidth
                    onReturn={handleReturn}
                    onCheck={handleCheck}
                    onSubmit={handleSubmit}
                  />
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
          {(project.type == "cover") ? (
            <div>
              <button onClick={() => fetchDXF(project.id) } className = "buttonStyle" >
                Download DXF
              </button>
              <button onClick={() => fetchPDF(project.id) } className = "buttonStyle" >
                Download PDF
              </button>
              <button onClick={() => fetchPDF(project.id, true) } className = "buttonStyle" >
                Download PDF with BOM
              </button>
            </div>
          ) : null}
          
          {(role === 'estimator' || role === 'admin') ? (
            <>
              {Schema ? (
                <div className="scroll-x">
                  <EstimateTable
                    key={estimateVersion}
                    schema={editedSchema}
                    editedSchema={editedSchema}
                    onCheck={handleSchemaCheck}
                    onReturn={handleSchemaReturn}
                    onSubmit={handleSchemaSubmit}
                    attributes={editedAttributes}
                    calculated={editedCalculated}
                  />
                </div>
              ) : (
                <div style={{ color: '#888' }}>No estimate schema for this project type.</div>
              )}

              <div className="scroll-x" style={{ marginTop: 24 }}>
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
            <div className="scroll-x" style={{ alignSelf: 'flex-end', width: '100%', maxWidth: 500 }}>
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
