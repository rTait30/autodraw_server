
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
          project_attributes: projectAttrs,
          products,
          submitToWG,
        };
      },
    };

    return () => {
      if (formRef) formRef.current = undefined;
    };
  }, [formRef, items, generalData, submitToWG]);

  // When rehydrate changes, update generalData and items
  useEffect(() => {
    if (!rehydrate) return;
    // General data
    if (rehydrate.general && typeof rehydrate.general === 'object' && Object.keys(rehydrate.general).length > 0) {
      setGeneralData({ ...rehydrate.general });
    } else {
      setGeneralData({});
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
          className="fixed left-1/2 bottom-6 z-50 w-[90%] max-w-lg -translate-x-1/2 rounded border bg-white p-3 shadow-lg text-sm break-words whitespace-pre-wrap"
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
                        <button type="button" className="buttonStyle bg-[#AA0000]" onClick={() => removeItem(it.productIndex)}>
                          Remove Item
                        </button>
                      )}
                    </div>
                    <Suspense fallback={<div className="p-3"></div>}>
                      <ProductForm
                        formRef={ref}
                        generalData={generalData}
                        onGeneralDataChange={setGeneralData}
                        attributesHydrate={it.attributesHydrate}
                        hideGeneralSection={true}
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
