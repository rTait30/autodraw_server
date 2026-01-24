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
      : [{ ...makeEntry(undefined, 0), name: 'Item 1' }];
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
      {(role === "admin" || role === "estimator" || role === "designer") && false && (
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
          <div className="mt-6 w-full">
            
            {/* Mobile: Item Selector Dropdown (visible < md) */}
            <div className="md:hidden mb-4">
               <label className="block text-sm font-bold text-gray-700 mb-1">Select Item to Edit:</label>
               <div className="relative">
                  <select
                    value={activeIndex}
                    onChange={(e) => setActiveIndex(Number(e.target.value))}
                    className="w-full p-3 pl-4 pr-10 bg-white border-2 border-gray-300 rounded-lg text-lg font-medium text-blue-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 appearance-none transition-all"
                  >
                    {items.map((it, index) => (
                      <option key={it.productIndex} value={it.productIndex}>
                         {(it.name && it.name.trim() !== "") ? it.name : `Item ${index + 1}`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
               </div>
               
               <button 
                  type="button" 
                  onClick={addItem}
                  className="mt-2 w-full py-3 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                 </svg>
                 Add New Item
               </button>
            </div>

            {/* Desktop: Tabs Navigation Bar (hidden < md) */}
            <div className="hidden md:flex flex-wrap items-end gap-1 border-b-2 border-gray-300 mb-0 px-1 w-full">
              {items.map((it, index) => {
                const isActive = it.productIndex === activeIndex;
                return (
                  <div 
                    key={it.productIndex} 
                    onClick={() => setActiveIndex(it.productIndex)}
                    className={`
                      relative px-4 lg:px-6 py-3 rounded-t-lg border-t-2 border-l-2 border-r-2 cursor-pointer select-none transition-all min-w-[140px] text-center flex-shrink-0 mt-2
                      ${isActive 
                        ? "bg-white border-gray-300 border-b-white -mb-0.5 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] text-blue-700" 
                        : "bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                      }
                    `}
                  >
                    <span className={`block w-full truncate ${isActive ? "font-bold" : "font-medium"}`}>
                      {(it.name && it.name.trim() !== "") ? it.name : `Item ${index + 1}`}
                    </span>
                  </div>
                );
              })}
              
              {/* Desktop Add Button */}
              <button 
                type="button" 
                onClick={addItem}
                className="ml-2 mb-1 p-2 rounded-full hover:bg-blue-100 text-blue-600 font-bold transition-all transform hover:scale-110 active:scale-95 flex-shrink-0"
                title="Add New Item"
                aria-label="Add New Item"
              >
                <div className="flex items-center space-x-1">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 <span className="font-semibold text-sm">Add Item</span>
                </div>
              </button>
            </div>

            {/* Tab Content Panel */}
            <div className="bg-white border-2 md:border-t-0 border-gray-300 rounded-lg md:rounded-t-none md:rounded-b-lg p-3 md:p-6 min-h-[300px] shadow-sm w-full">
              {items.map((it, index) => {
                const ref = getItemRef(it.productIndex);
                const isActive = it.productIndex === activeIndex;

                return (
                  <div 
                    key={it.productIndex} 
                    className={`${isActive ? "block animate-in fade-in zoom-in-95 duration-200" : "hidden"} w-full`}
                  >
                    
                    {/* Unified Item Header (Name + Delete) - Visible on both Mobile & Desktop */}
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6 pb-4 border-b border-gray-100">
                       <div className="flex-1 w-full">
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                            Item Name (Optional)
                          </label>
                          <div className="relative group">
                            <input 
                              type="text"
                              value={it.name || ""}
                              onChange={(e) => handleTabNameChange(it.productIndex, e.target.value)}
                              placeholder={`Item ${index + 1}`}
                              className="text-xl md:text-2xl font-bold text-gray-800 bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded px-2 -ml-2 w-full transition-all outline-none placeholder-gray-300"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </div>
                          </div>
                      </div>

                      {items.length > 1 && (
                        <button 
                          type="button" 
                          className="self-end md:self-center px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 text-xs font-bold flex items-center gap-1 shadow-sm transition-all whitespace-nowrap" 
                          onClick={() => removeItem(it.productIndex)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Item
                        </button>
                      )}
                    </div>

                    
                    <Suspense fallback={<div className="p-12 text-center text-gray-400 font-medium">Loading form...</div>}>
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
          </div>
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
