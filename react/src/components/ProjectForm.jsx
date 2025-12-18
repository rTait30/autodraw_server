
import { Suspense } from "react";

// Default general values
const DEFAULT_GENERAL = {
  name: "",
  client_id: 0,
  due_date: "",
  info: "",
  // Add other default fields as needed
};
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from 'react-redux';

import { GeneralSection } from "./GeneralSection";
import { TOAST_TAGS, resolveToastMessage } from "../config/toastRegistry";


// normalizeAttributes supports:
// - productsHydrate = [ { name, id, attributes: {...} }, ... ]
// - productsHydrate = { products: [ {...}, {...} ] }
// - productsHydrate = { ... } (single object)
function normalizeAttributes(productsHydrate) {
  if (!productsHydrate) return [];
  if (typeof productsHydrate === "object" && Array.isArray(productsHydrate.products)) {
    return productsHydrate.products;
  }
  if (Array.isArray(productsHydrate)) return productsHydrate;
  if (typeof productsHydrate === "object" && Object.keys(productsHydrate).length > 0)
    return [productsHydrate];
  return [];
}



export default function ProjectForm({
  formRef,
  product,
  hideGeneralSection = false,
  rehydrate: initialRehydrate = null,
  productProps = {},
}) {
  // Top-level WG submit state
  const [submitToWG, setSubmitToWG] = useState(false);
  // Dynamically import the correct product and project forms
  const [ProductForm, setProductForm] = useState(null);
  const [ProjectFormComponent, setProjectFormComponent] = useState(null);
  useEffect(() => {
    if (!product) {
      setProductForm(null);
      setProjectFormComponent(null);
      return;
    }
    let alive = true;
    import(`../components/products/${product}/Form.jsx`)
      .then((mod) => {
        if (alive) {
          // Only set ProductForm if it exists in the module
          if (mod.ProductForm) {
            setProductForm(() => React.lazy(() => Promise.resolve({ default: mod.ProductForm })));
          } else {
            setProductForm(null);
          }
          // Only set ProjectForm if it exists in the module
          if (mod.ProjectForm) {
            setProjectFormComponent(() => React.lazy(() => Promise.resolve({ default: mod.ProjectForm })));
          } else {
            setProjectFormComponent(null);
          }
        }
      })
      .catch((e) => {
        if (alive) {
          console.error("Error loading product form:", e);
          setProductForm(null);
          setProjectFormComponent(null);
        }
      });
    return () => { alive = false; };
  }, [product]);
  // Ref and state for global project attributes
  const projectFormRef = useRef();
  const [projectData, setProjectData] = useState({});
  // Rehydrate logic
  const [rehydrate, setRehydrate] = useState(initialRehydrate);
  // Used to force remount on rehydrate
  const [instanceKey, setInstanceKey] = useState(0);

  // Use rehydrate for all initial data, default to empty object if missing or empty
  const [generalData, setGeneralData] = useState(() => (
    rehydrate && typeof rehydrate.general === 'object' && Object.keys(rehydrate.general).length > 0
      ? { ...rehydrate.general }
      : {}
  ));

  // WorkGuru data state with rehydration (nested in project_attributes)
  const [wgData, setWgData] = useState(() => {
    const wg = rehydrate?.project_attributes?.wg_data;
    return (wg && typeof wg === 'object' && Object.keys(wg).length > 0)
      ? { ...wg }
      : { tenant: 'Copelands', project_number: '' };
  });

  // WorkGuru lookup result state
  const [wgLookupResult, setWgLookupResult] = useState(null);

  // WorkGuru lookup stub function
  const handleWorkguruLookup = async () => {
    const tenantCode = wgData.tenant === 'Copelands' ? 'CP' : 'DR';
    const projectNum = wgData.project_number;
    console.log('[WorkGuru Lookup] Tenant:', tenantCode, 'Project Number:', projectNum);
    
      //TODO: Replace with actual API call
      //Example structure - the API should return data like this:
    const response = await apiFetch('/api/workguru/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant: tenantCode, project_number: projectNum }),
    });
    const data = await response.json();
    
    // Stub response for testing - replace with actual API response
    /*
    const data = {
      client_name: 'Example Client',
      project_name: 'Example Project',
      address: '123 Example St',
      // Add other fields you want from the API
    };
    */
    
    // Extract only the fields you want to save
    const fieldsToSave = {
      client_name: data.client_name,
      project_name: data.project_name,
      address: data.address,
      // Add more fields as needed
    };
    
    // Merge into wgData (preserving tenant and project_number)
    setWgData(prev => ({
      ...prev,
      ...fieldsToSave,
    }));
    
    // Store result for display
    setWgLookupResult(fieldsToSave);
    
    showToast(`WorkGuru lookup complete for ${tenantCode}-${projectNum}`);
  };
  const normalizedProducts = useMemo(
    () => normalizeAttributes(rehydrate?.products),
    [rehydrate]
  );
  const [showRehydrateBox, setShowRehydrateBox] = useState(false);
  const [rehydrateText, setRehydrateText] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef();
  const showToast = (tagOrMsg, opts = {}) => {
    const { args = [], ...restOpts } = opts;
    const msg = resolveToastMessage(tagOrMsg, ...args);
    setToast({ msg: String(msg), ...restOpts });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), restOpts.duration || 30000);
  };

  // Get devMode from Redux
  const devMode = useSelector(state => state.toggles.devMode);

  const makeEntry = useCallback((attrs, productIndex) => {
    return { productIndex, attributesHydrate: attrs ?? undefined };
  }, []);

  const initialRef = useRef(null);
  if (initialRef.current === null) {
    const base = normalizedProducts.length > 0 ? normalizedProducts : [undefined];
    initialRef.current = base.map((prod, idx) => {
      if (prod && typeof prod === "object" && prod.attributes) {
        return { ...makeEntry(prod.attributes, idx), name: prod.name ?? `Item ${idx + 1}` };
      } else {
        return { ...makeEntry(prod, idx), name: `Item ${idx + 1}` };
      }
    });
  }

  const [items, setItems] = useState(() => initialRef.current);
  const [activeIndex, setActiveIndex] = useState(() => initialRef.current?.[0]?.productIndex ?? 0);

  const itemRefs = useRef(new Map());
  const getItemRef = useCallback((productIndex) => {
    if (!itemRefs.current.has(productIndex)) itemRefs.current.set(productIndex, React.createRef());
    return itemRefs.current.get(productIndex);
  }, []);

  const addItem = useCallback(() => {
    const newIndex = items.length;
    const newItem = { ...makeEntry(undefined, newIndex), name: `Item ${newIndex + 1}` };
    setItems((prev) => [...prev, newItem]);
    setActiveIndex(newIndex);
  }, [makeEntry, items.length]);

  const removeItem = useCallback((productIndex) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((it) => it.productIndex !== productIndex);
      itemRefs.current.delete(productIndex);
      setActiveIndex((current) => (current === productIndex ? next[next.length - 1]?.productIndex ?? 0 : current));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!formRef) return;
    formRef.current = {
      getValues: () => {
        // Get global project attributes
        let projectAttrs = {};
        if (projectFormRef.current?.getValues) {
          const val = projectFormRef.current.getValues();
          projectAttrs = val?.project ?? {};
        }
        const products = Array.isArray(items) && items.length > 0
          ? items
              .map((it) => {
                const ref = itemRefs.current.get(it.productIndex);
                if (!ref?.current?.getValues) return null;
                const values = ref.current.getValues();
                return {
                  name: it.name ?? `Item ${it.productIndex + 1}`,
                  productIndex: it.productIndex,
                  attributes: values.attributes ?? {},
                  // Optionally include calculated if needed:
                  // calculated: values.calculated ?? {}
                };
              })
              .filter(Boolean)
          : [];

        // Always return a general object with all default fields
        return {
          general: { ...DEFAULT_GENERAL, ...(generalData && typeof generalData === 'object' ? generalData : {}) },
          project_attributes: { ...projectAttrs, wg_data: wgData },
          products,
          submitToWG,
        };
      },
    };

    return () => {
      if (formRef) formRef.current = undefined;
    };
  }, [formRef, items, generalData, wgData, submitToWG]);

  // When rehydrate changes, update generalData and items
  useEffect(() => {
    if (!rehydrate) return;
    // General data
    if (rehydrate.general && typeof rehydrate.general === 'object' && Object.keys(rehydrate.general).length > 0) {
      setGeneralData({ ...rehydrate.general });
    } else {
      setGeneralData({});
    }
    // WorkGuru data (nested in project_attributes)
    const wg = rehydrate.project_attributes?.wg_data;
    if (wg && typeof wg === 'object' && Object.keys(wg).length > 0) {
      setWgData({ ...wg });
    } else {
      setWgData({ tenant: 'Copelands', project_number: '' });
    }
    // Project-level attributes
    if (rehydrate.project_attributes && typeof rehydrate.project_attributes === 'object' && Object.keys(rehydrate.project_attributes).length > 0) {
      setProjectData({ ...rehydrate.project_attributes });
    } else {
      setProjectData({});
    }
    // Items
    const base = normalizeAttributes(rehydrate.products);
    const newItems = base.length > 0
      ? base.map((prod, idx) => {
          if (prod && typeof prod === "object" && prod.attributes) {
            return { ...makeEntry(prod.attributes, idx), name: prod.name ?? `Item ${idx + 1}` };
          } else {
            return { ...makeEntry(prod, idx), name: `Item ${idx + 1}` };
          }
        })
      : [undefined];
    setItems(newItems);
    setActiveIndex(newItems?.[0]?.productIndex ?? 0);
  }, [rehydrate]);

  const handleTabNameChange = (productIndex, value) => {
    setItems((prev) => prev.map((it) => it.productIndex === productIndex ? { ...it, name: value } : it));
  };

  // Do not overwrite blank tab names; just show default visually
  const handleTabNameBlur = () => {};

  let role = localStorage.getItem("role");

  return (
  <div key={instanceKey} className="p-3 space-y-4">

      {toast && (
        <div
          role="status"
          className="fixed left-1/2 bottom-6 z-50 w-[90%] max-w-lg -translate-x-1/2 rounded border bg-white text-black p-3 shadow-lg text-sm break-words whitespace-pre-wrap"
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

      {hideGeneralSection === false && (
        <GeneralSection data={generalData} setData={setGeneralData} />
      )}

      {/* WorkGuru Data Section */}
      {(role === "admin" || role === "estimator" || role === "designer") && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
          className="dark:bg-gray-800 dark:border-gray-700"
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }} className="dark:text-white">
            WorkGuru Data
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: '1 1 150px', minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }} className="dark:text-gray-300">
                Tenant
              </label>
              <select
                value={wgData.tenant || 'Copelands'}
                onChange={(e) => setWgData(prev => ({ ...prev, tenant: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="Copelands">Copelands</option>
                <option value="D&R Liners">D&R Liners</option>
              </select>
            </div>
            <div style={{ flex: '2 1 200px', minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }} className="dark:text-gray-300">
                Project Number
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={wgData.project_number || ''}
                  onChange={(e) => setWgData(prev => ({ ...prev, project_number: e.target.value }))}
                  style={{
                    flex: '1',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                  }}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter project number"
                />
                <button
                  type="button"
                  onClick={handleWorkguruLookup}
                  disabled={!wgData.project_number}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: wgData.project_number ? '#3b82f6' : '#9ca3af',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: wgData.project_number ? 'pointer' : 'not-allowed',
                  }}
                >
                  Lookup
                </button>
              </div>
            </div>
          </div>
          
          {/* WorkGuru Lookup Results Display */}
          {wgLookupResult && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '6px',
              }}
              className="dark:bg-green-900/20 dark:border-green-800"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#065f46' }} className="dark:text-green-400">
                  Lookup Result
                </h4>
                <button
                  type="button"
                  onClick={() => setWgLookupResult(null)}
                  style={{ fontSize: '12px', color: '#065f46', background: 'none', border: 'none', cursor: 'pointer' }}
                  className="dark:text-green-400"
                >
                  ✕ Clear
                </button>
              </div>
              <div style={{ fontSize: '13px', color: '#047857' }} className="dark:text-green-300">
                {Object.entries(wgLookupResult).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '4px' }}>
                    <strong style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</strong> {value || '—'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <section className="space-y-3">
        {/* Global project form above item selector */}
        {ProjectFormComponent && (
          <Suspense fallback={<div className="p-3"></div>}>
            <ProjectFormComponent
              formRef={projectFormRef}
              projectDataHydrate={projectData}
            />
          </Suspense>
        )}
        
        {/* Only show item selector if ProductForm is provided */}
        {ProductForm && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {items.map((it, index) => (
                <div key={it.productIndex} className="flex items-center gap-1">
                  {it.productIndex === activeIndex ? (
                    <input
                      type="text"
                      value={it.name ?? ""}
                      onChange={e => handleTabNameChange(it.productIndex, e.target.value)}
                      onBlur={handleTabNameBlur}
                      onKeyDown={e => {
                        if (e.key === "Enter") e.target.blur();
                      }}
                      className={`px-3 py-1 rounded border text-sm inputCompact w-24 ${
                        "border-blue-500 bg-blue-500 text-white"
                      }`}
                      style={{ fontSize: '0.95em', padding: '2px 6px', textAlign: 'center' }}
                      onFocus={e => e.target.select()}
                    />
                  ) : (
                    <button
                      type="button"
                      className={`px-3 py-1 rounded border text-sm ${
                        "border-neutral-300 bg-gray-200 text-black"
                      }`}
                      onClick={() => setActiveIndex(it.productIndex)}
                    >
                      {(it.name && it.name.trim() !== "") ? it.name : `Item ${index + 1}`}
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="px-3 py-1 rounded border text-sm font-bold" onClick={addItem}>
                + Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, index) => {
                const ref = getItemRef(it.productIndex);
                return (
                  <div key={it.productIndex} style={{ display: it.productIndex === activeIndex ? "block" : "none" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="headingStyle">{it.name || `Item ${index + 1}`}</div>
                      {items.length > 1 && (
                        <button type="button" className="buttonStyle bg-error" onClick={() => removeItem(it.productIndex)}>
                          Remove Item
                        </button>
                      )}
                    </div>
                    <Suspense fallback={<div className="p-3"></div>}>
                      <ProductForm
                        formRef={ref}
                        hydrate={it.attributesHydrate}
                        {...productProps}
                      />
                    </Suspense>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Rehydrate box UI only if devMode is true */}
        {devMode && (
          <div className="mt-4">
            <button
              className="devStyle"
              onClick={() => setShowRehydrateBox((v) => !v)}
            >
              {showRehydrateBox ? "Hide" : "Show"} Rehydrate JSON
            </button>
            {showRehydrateBox && (
              <div className="mt-2">
                <textarea
                  className="w-full border rounded p-2 text-xs"
                  rows={8}
                  value={rehydrateText}
                  onChange={e => setRehydrateText(e.target.value)}
                  placeholder="Paste rehydrate JSON here"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="devStyle"
                    onClick={() => {
                      try {
                        const obj = JSON.parse(rehydrateText);
                        setRehydrate(obj);
                        setInstanceKey(k => k + 1); // force remount
                        // Explicitly reset all relevant state for full reload
                        if (obj && typeof obj === 'object') {
                          // General data
                          if (obj.general && typeof obj.general === 'object' && Object.keys(obj.general).length > 0) {
                            setGeneralData({ ...obj.general });
                          } else {
                            setGeneralData({});
                          }
                          // Project-level attributes
                          if (obj.project_attributes && typeof obj.project_attributes === 'object' && Object.keys(obj.project_attributes).length > 0) {
                            setProjectData({ ...obj.project_attributes });
                          } else {
                            setProjectData({});
                          }
                          // Items
                          const base = normalizeAttributes(obj.products);
                          const newItems = base.length > 0
                            ? base.map((prod, idx) => {
                                if (prod && typeof prod === "object" && prod.attributes) {
                                  return { ...makeEntry(prod.attributes, idx), name: prod.name ?? `Item ${idx + 1}` };
                                } else {
                                  return { ...makeEntry(prod, idx), name: `Item ${idx + 1}` };
                                }
                              })
                            : [undefined];
                          setItems(newItems);
                          setActiveIndex(newItems?.[0]?.productIndex ?? 0);
                        }
                        showToast(TOAST_TAGS.REHYDRATION_APPLIED);
                      } catch (e) {
                        showToast(TOAST_TAGS.INVALID_JSON, { args: [e.message], duration: 8000 });
                      }
                    }}
                  >
                    Apply Rehydrate
                  </button>
                  <button
                    className="devStyle"
                    onClick={() => {
                      // Always get latest form state
                      const val = formRef.current?.getValues?.();
                      setRehydrateText(JSON.stringify(val, null, 2));
                    }}
                  >
                    Copy Current Values
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {(role === "admin" || role === "estimator" || role === "designer") && (

      <>
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="submitToWG"
            checked={submitToWG}
            onChange={e => setSubmitToWG(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          <label htmlFor="submitToWG" style={{ fontWeight: 500 }}>Submit to WG</label>
        </div>
      </>
      )}
    </div>
  );
}
