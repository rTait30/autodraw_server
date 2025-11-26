import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { useLocation } from 'react-router-dom';

import EstimateTable from '../components/products/EstimateTable';
import SchemaEditor from '../components/products/SchemaEditor';

import ProjectForm from "../components/ProjectForm";

import { apiFetch } from '../services/auth';

import { useParams } from 'react-router-dom';

import { useSelector } from 'react-redux';



/* ============================================================================
 *  MODULE LOADER (per-project-type)
 *  - Loads Form component for the product type
 * ==========================================================================*/
async function loadTypeResources(type) {
  const FormModule = await import(`../components/products/${type}/Form.jsx`);
  return {
    Form: FormModule.default,
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
   * ========================================================================*/
  const [project, setProject] = useState(null);
  const [editedProject, setEditedProject] = useState(null);
  const [error, setError] = useState(null); // error state for fetch failures
  const [productID, setProductID] = useState(0);

  /* ==========================================================================
   *  DYNAMIC TYPE RESOURCES
   *  - Form / Schema are type-dependent
   * ========================================================================*/
  const [Schema, setSchema] = useState(null);
  const [editedSchema, setEditedSchema] = useState(null);
  const [Form, setForm] = useState(null);

  const [estimateVersion, setEstimateVersion] = useState(0);
  const [toggleData, setToggleData] = useState(false);

  /* ==========================================================================
   *  CANVAS
   * ========================================================================*/
  const formRef = useRef(null);
  const canvasRef = useRef(null);

  /* ==========================================================================
   *  DATA FETCHING: loadProjectFromServer
   *  - populates both saved and edited snapshots
   *  - loads type modules after project fetched
   * ========================================================================*/
  const loadProjectFromServer = async () => {
    try {
      const res = await apiFetch(`/project/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');

      const data = await res.json();
      console.log("Loaded project data:", data);

      // Load product modules (Form only)
      const productName = data?.type?.name || data?.product?.name;
      if (productName) {
        const modules = await loadTypeResources(productName);
        setForm(() => modules.Form);
        // Backend supplies estimate schema under estimate_schema
        const backendSchema = data?.estimate_schema ?? null;
        setSchema(backendSchema);
        setEditedSchema(backendSchema);
        setProject(data);
        setEditedProject(data);
      } else {
        setForm(null);
        setSchema(null);
        setEditedSchema(null);
        setProject(data);
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
      setError('Unable to load project. Please try again later.');
    }
  };

  // initial fetch / refetch when projectId changes
  useEffect(() => {
    loadProjectFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Render canvas using Display module when project data changes
  useEffect(() => {
    if (!editedProject || !canvasRef.current) return;
    
    const productName = (editedProject.product?.name || editedProject.type?.name || '').toUpperCase();
    if (!productName) return;

    // Dynamically import Display module for the product type
    import(`../components/products/${productName}/Display.js`)
      .then((module) => {
        const data = {
          products: editedProject.products || [],
          project_attributes: editedProject.project_attributes || {},
        };
        // Call generic render() function from Display module
        if (typeof module.render === 'function') {
          module.render(canvasRef.current, data);
        }
      })
      .catch(e => {
        console.warn(`No Display module for ${productName}:`, e.message);
      });
  }, [editedProject]);

  /* ==========================================================================
   *  ACTIONS: UI event handlers
   * ========================================================================*/
  const handleReturn = () => {
    // Placeholder for future diff/undo features
    setEditedProject(project);
  };

  // Helper: sync edited project from the form's current values
  const syncEditedFromForm = () => {
    const values = formRef.current?.getValues?.();
    if (!values) return null;
    
    // Merge form values into the edited project structure
    const updated = {
      ...editedProject,
      general: values.general || editedProject?.general || {},
      project_attributes: values.project_attributes || editedProject?.project_attributes || {},
      products: values.products || editedProject?.products || [],
    };
    
    setEditedProject(updated);
    return updated;
  };

  // Recalculate project on server
  const handleQuickCheck = async () => {
    try {
      const base = syncEditedFromForm() || editedProject || project;
      if (!base) {
        alert('No values to check.');
        return;
      }

      const payload = {
        product_id: base.product_id || base.product?.id,
        general: base.general || {},
        project_attributes: base.project_attributes || {},
        products: base.products || [],
      };

      console.log('Quick check payload:', payload);

      const response = await apiFetch("/projects/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();

      // Update editedProject with recalculated data, preserving structure
      setEditedProject({
        ...base,
        general: result.general || base.general,
        project_attributes: result.project_attributes || {},
        products: result.products || [],
      });

      console.log("Recalculation result:", result);
      alert('Calculation complete!');
    } catch (err) {
      console.error("Quick check error:", err);
      alert(`Error: ${err.message}`);
    }
  };

  // Submit changes to server
  const handleSubmit = async () => {
    try {
      const base = syncEditedFromForm() || editedProject || project;
      if (!base) {
        alert('No edited values to submit.');
        return;
      }

      const payload = {
        id: project.id,
        product_id: base.product_id || base.product?.id,
        general: base.general || {},
        project_attributes: base.project_attributes || {},
        products: base.products || [],
      };
      
      console.log('Submitting payload:', JSON.parse(JSON.stringify(payload)));

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

      const updatedProject = json?.project || {
        ...project,
        general: payload.general,
        project_attributes: payload.project_attributes,
        products: payload.products,
      };

      console.log('Updated project:', updatedProject);
      setProject(updatedProject);
      setEditedProject(updatedProject);
      alert('Project updated successfully.');
    } catch (e) {
      console.error('Submit error:', e);
      alert(`Error submitting project: ${e.message}`);
    }
  };

  const handleCheck = () => {
    const v = syncEditedFromForm();
    console.log('Form values (synced to editedProject):', v);
    if (v) alert(JSON.stringify(v, null, 2));
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

  // Derive product name & primary product for EstimateTable
  const productName = project?.product?.name || project?.type?.name; // e.g. 'COVER'
  const primaryProduct = project?.products?.[0] || {};
  const primaryAttributes = primaryProduct?.attributes || {};
  const primaryCalculated = primaryProduct?.calculated || {};

  // New: detect if nesting data exists (required for DXF)
  const working = editedProject || project;
  const hasNestData = Boolean(
    working?.project_attributes?.nest &&
    (working?.project_attributes?.nested_panels || working?.project_attributes?.all_meta_map)
  );

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
                    product={productName}
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
                      onClick={handleQuickCheck}
                      className="buttonStyle bg-blue-600 hover:bg-blue-700"
                    >
                      Quick Check
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
          {(role === 'estimator'|| role === 'designer' || role === 'admin') && project?.product?.name === 'COVER' && (
            <div>
              <button 
                onClick={() => fetchDXF(project.id)} 
                className="buttonStyle"
                disabled={!hasNestData}
                title={!hasNestData ? 'Run Quick Check to generate nesting before downloading DXF.' : ''}
              >
                Download DXF
              </button>
              <button onClick={() => fetchPDF(project.id)} className="buttonStyle">
                Download PDF
              </button>
              <button onClick={() => fetchPDF(project.id, true)} className="buttonStyle">
                Download PDF with BOM
              </button>
              {!hasNestData && (
                <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                  DXF requires nesting data. Click "Quick Check" first.
                </div>
              )}
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
                height={2000}
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
