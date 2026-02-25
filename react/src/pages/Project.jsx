import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import EstimateTable from '../components/products/EstimateTable';
import SchemaEditor from '../components/products/SchemaEditor';

import ProjectForm from "../components/ProjectForm";
import StickyActionBar from "../components/StickyActionBar";
import { Button } from '../components/UI';

import { apiFetch } from '../services/auth';

import { useParams } from 'react-router-dom';
import { TOAST_TAGS, resolveToastMessage } from "../config/toastRegistry";





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

  const containerRef = useRef(null);

  // Get devMode from Redux
  const devMode = useSelector(state => state.toggles.devMode);

  // New: force canvas rerender after data changes
  const [displayVersion, setDisplayVersion] = useState(0);
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
  const [currentEstimateTotal, setCurrentEstimateTotal] = useState(0);

  // Toast state
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef();
  const showToast = (tagOrMsg, opts = {}) => {
    const { args = [], ...restOpts } = opts;
    const msg = resolveToastMessage(tagOrMsg, ...args);
    setToast({ msg: String(msg), ...restOpts });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), restOpts.duration || 30000);
  };

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

  // Render canvas using Display module when project data changes or displayVersion bumps
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
        console.warn(`No Display module for ${productName}, trying DXF fallback...`);
        // Fallback: Try to use the generic DxfDisplay if the product has a plot_file generator
        // We check capabilities first to avoid unnecessary network calls if we know it's not there
        const capabilities = editedProject.product?.capabilities || {};
        const docs = capabilities.documents || [];
        const hasPlotFile = docs.some(d => d.id === 'plot_file');

        if (hasPlotFile) {
          // Fetch DXF content first
          const payload = {
            product_id: editedProject.product?.id,
            doc_id: 'plot_file',
            general: editedProject.general || {},
            project_attributes: editedProject.project_attributes || {},
            products: editedProject.products || []
          };

          apiFetch("/projects/preview_document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch preview');
            return res.text();
          })
          .then(dxfContent => {
            import('../components/products/shared/DxfDisplay.js')
              .then(module => {
                module.render(canvasRef.current, { dxfContent });
              });
          })
          .catch(err => console.error("Failed to load plot_file preview", err));
        } else {
          console.warn(`No plot_file generator for ${productName}, cannot render preview.`);
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.fillText('No preview available', 20, 30);
        }
      });
  }, [editedProject, displayVersion]);

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
  const handleCheck = async () => {
    try {
      const base = syncEditedFromForm() || editedProject || project;
      if (!base) {
        showToast("No values to check.");
        return;
      }

      const payload = {
        product_id: base.product_id || base.product?.id,
        general: base.general || {},
        project_attributes: base.project_attributes || {},
        products: base.products || [],
      };

      console.log('Check payload:', payload);

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

      // Bump displayVersion to force canvas rerender
      setDisplayVersion(v => v + 1);

      console.log("Recalculation result:", result);
      showToast(TOAST_TAGS.CALCULATION_COMPLETE);
    } catch (err) {
      console.error("Check error:", err);
      showToast(TOAST_TAGS.GENERIC_ERROR, { args: [err.message] });
    }
  };

  // Submit changes to server
  const handleSubmit = async () => {
    try {
      const base = syncEditedFromForm() || editedProject || project;
      if (!base) {
        showToast('No edited values to submit.');
        return;
      }

      const payload = {
        id: project.id,
        product_id: base.product_id || base.product?.id,
        general: base.general || {},
        project_attributes: base.project_attributes || {},
        products: base.products || [],
        estimate_total: currentEstimateTotal,
      };
      
      console.log('Submitting payload:', JSON.parse(JSON.stringify(payload)));

      const res = await apiFetch(`/products/edit/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json?.error) {
        showToast(`Update failed: ${json?.error || res.statusText}`);
        return;
      }

      const updatedProject = json?.project || {
        ...project,
        general: payload.general,
        project_attributes: payload.project_attributes,
        products: payload.products,
      };

      console.log('Updated project:', updatedProject);
      showToast('Project updated successfully.');
      
      // Refresh the page to ensure clean state
      window.location.reload();
    } catch (e) {
      console.error('Submit error:', e);
      showToast(TOAST_TAGS.GENERIC_ERROR, { args: [`submitting project: ${e.message}`] });
    }
  };



  const handleMaterials = () => {
    const working = editedProject || project;
    const primary = working?.products?.[0];
    const mats = primary?.calculated?.materials;
    showToast(mats ? TOAST_TAGS.MATERIALS_DATA : TOAST_TAGS.NO_MATERIALS_DATA, { args: [mats] });
  };

  // handlers
  const handleSchemaCheck = (next) => setEditedSchema(next);
  const handleSchemaReturn = () => setEditedSchema(Schema);
  const handleSchemaSubmit = (next) => {
    // stub — persist later
    console.log('[Schema submit] (stub):', next);
    showToast(TOAST_TAGS.SCHEMA_SUBMIT_NOT_IMPLEMENTED);
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

  // New: detect if nesting data exists (required for DXF on COVER products)
  const working = editedProject || project;
  const hasNestData = Boolean(
    working?.project_attributes?.nest &&
    (working?.project_attributes?.nested_panels || working?.project_attributes?.all_meta_map)
  );
  
  // Shade sails don't need nesting data for DXF
  const canGenerateDXF = project?.product?.name !== 'COVER' || hasNestData;

  return (
    <>
      <div
        className="layout page"
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
        {/* LEFT - Form */}
        <div className="pane left" style={{ flex: '1 1 auto', minWidth: 0, paddingBottom: '96px' }}>
          <div>
            <div>
              {Form ? (
                <Suspense fallback={<div>Loading form…</div>}>
                  <ProjectForm
                    product={productName}
                    formRef={formRef}
                    rehydrate={editedProject || project}
                  />
                

                  <StickyActionBar>
                    <Button
                      onClick={handleCheck}
                    >
                      Check
                    </Button>
                    <Button
                      onClick={handleSubmit}
                    >
                      Submit changes
                    </Button>
                    {/*
                    <Button
                      onClick={handleMaterials}
                    >
                      Check Materials
                    </Button>
                    */}
                    
                    {devMode && (
                      <Button
                        onClick={() => setToggleData(!toggleData)}
                      >
                        {toggleData ? 'Hide' : 'Show'} JSON
                      </Button>
                    )}
                  </StickyActionBar>
                  
                  {toggleData && (
                    <div className="mt-4 p-3 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 max-h-[500px] overflow-auto">
                      <div className="font-bold mb-2 text-sm dark:text-white">
                        Project JSON
                      </div>
                      <div className="text-xs font-mono leading-relaxed dark:text-gray-300">
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

        {/* RIGHT - Canvas & Estimate */}
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
          {toast && (
            <div
              role="status"
              className="fixed left-1/2 bottom-24 md:bottom-8 z-[60] w-[90%] max-w-lg -translate-x-1/2 rounded border bg-white text-black p-3 shadow-lg text-sm break-words whitespace-pre-wrap"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="text-left font-medium">Message</div>
                <button
                  className="text-xs opacity-70"
                  onClick={() => setToast(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <pre className="mt-2 text-xs overflow-auto max-h-60">{toast.msg}</pre>
            </div>
          )}

          {/* Status Badge Removed */}

          {/* Buttons: only for staff, and only if capabilities exist */}
          {(role === 'estimator'|| role === 'designer' || role === 'admin') && (
            <div className="space-y-2">
              {/* Legacy Buttons (Fallback) */}
              {(!project?.product?.capabilities?.documents || project.product.capabilities.documents.length === 0) && (
                <div className="space-x-2">
                  {project?.product?.capabilities?.has_dxf && (
                    <Button 
                      onClick={() => fetchDXF(project.id)} 
                      disabled={!canGenerateDXF}
                      title={!canGenerateDXF ? 'Run Quick Check to generate nesting before downloading DXF.' : ''}
                    >
                      Download DXF
                    </Button>
                  )}
                  
                  {project?.product?.capabilities?.has_pdf && (
                    <>
                      <Button onClick={() => fetchPDF(project.id)}>
                        Download PDF
                      </Button>
                      <Button onClick={() => fetchPDF(project.id, true)}>
                        Download PDF with BOM
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* New Document Dropdown System */}
              {project?.product?.capabilities?.documents && project.product.capabilities.documents.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium dark:text-gray-300">Generate File:</span>
                  <select 
                    className="p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        fetchDocument(project.id, e.target.value);
                        e.target.value = ""; // Reset
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select a document...</option>
                    {project.product.capabilities.documents.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!canGenerateDXF && project?.product?.name === 'COVER' && project?.product?.capabilities?.has_dxf && (
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
                  onTotalChange={setCurrentEstimateTotal}
                  products={(editedProject?.products ?? project.products)}
                />
              </div>
            ) : (
              <div style={{ color: '#888' }}>No estimate schema for this project type.</div>
            )
          ) : null}
          

          {/* Canvas: all staff (designer, admin, estimator) */}
          {(role === 'estimator'|| role === 'designer' || role === 'admin' || role === 'client') && (
            
            <div ref={containerRef} className="flex-1">
              <canvas 
                ref={canvasRef} 
                width={800}
                height={200} 
                className="border shadow bg-white max-w-full"
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
              /* Allow the document to scroll naturally */
              height: auto;
              min-height: 100%;
            }
            .layout { 
              overflow-x: hidden; 
              overflow-y: visible; 
              padding-bottom: 100px; /* Space for sticky action bar */
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

// cover dxf
const fetchDXF = async (projectId) => {
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
    showToast(TOAST_TAGS.DXF_DOWNLOAD_FAILED, { args: [error.message] });
  }
};

const fetchPDF = async (projectId, include_bom) => {
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
    showToast(TOAST_TAGS.PDF_DOWNLOAD_FAILED, { args: [error.message] });
  }
};

const fetchDocument = async (projectId, docId) => {
  try {
    const response = await apiFetch('/project/generate_document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, doc_id: docId }),
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
    let filename = `document_${projectId}`;
    const cd = response.headers.get('Content-Disposition');
    if (cd) {
      let matchStar = cd.match(/filename\*\s*=\s*([^']*)'[^']*'([^;]+)\s*;?/i);
      if (matchStar && matchStar[2]) {
        try { filename = decodeURIComponent(matchStar[2]); } catch { filename = matchStar[2]; }
      } else {
        const match = cd.match(/filename\s*=\s*"?([^"]+)"?/i);
        if (match && match[1]) filename = match[1];
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error fetching document:', error);
    alert(`Failed to download document: ${error.message}`);
  }
};
