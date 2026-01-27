import React, { useEffect, useState, useRef, useImperativeHandle, useMemo } from "react";
import { 
  useProductAttribute, 
  FormContainer, 
  SelectInput, 
  TextInput, 
  NumberInput,
  CheckboxInput,
  CompactNumberInput,
  CompactSelectInput,
  useFormNavigation,
  FormSection,
  FormGrid
} from "../../FormUI";

import { DEFAULT_ATTRIBUTES, GENERAL_DEFAULTS } from "./constants";

const MAX_POINTS = 21;

const TENSION_HARDWARE_OPTIONS = [
  "M8 Bowshackle",
  "M10 Bowshackle",
  "M12 Bowshackle",
  "M8 Turnbuckle",
  "M10 Turnbuckle",
  "M12 Turnbuckle",
  "M12 Togglebolt",
  "Sailtrack Corner",
];

const CORNER_FITTING_OPTIONS = [
  "Pro-Rig",
  "Pro-Rig with Small Pipe",
  "Ezy Slide",
  "100mm Corner Plate",
  "100mm Corner Plate with Pipe",
  "150mm Corner Plate",
  "150mm Corner Plate with Pipe",
  "Sailtrack Corner"
];

const FABRIC_OPTIONS = {
  ShadeCloth: ["Rainbow Z16", "Poly Fx", "Extreme 32", "Polyfab Xtra", "Tensitech 480", "Monotec 370", "DriZ"],
  PVC: ["Bochini", "Bochini Blockout", "Mehler FR580", "Ferrari 502S2", "Ferrari 502V3"]
};
const FOLD_SIDES = ["Standard", "Underside", "Topside"];

const COLOUR_OPTIONS = ["Charcoal", "Black", "White"];

const CABLE_SIZE_OPTIONS = [4, 5, 6, 8];

const TENSION_HARDWARE_DEFAULTS = {
  "M8 Bowshackle": 50,
  "M10 Bowshackle": 50,
  "M12 Bowshackle": 50,
  "M8 Turnbuckle": 300,
  "M10 Turnbuckle": 350,
  "M12 Turnbuckle": 450,
  "M12 Togglebolt": 150,
  "Sailtrack Corner": 0
};

// Generic ProjectForm for global attributes (location)
export function ProjectForm({ formRef, projectDataHydrate = {} }) {
  const [projectData, setProjectData] = useState({
    location: projectDataHydrate.location ?? ""
  });

  useImperativeHandle(
    formRef,
    () => ({
      getValues: () => ({ project: projectData }),
    }),
    [projectData]
  );

  return (
    <div className="space-y-2">
      <TextInput
        label="Location" 
        value={projectData.location} 
        onChange={(val) => setProjectData(prev => ({ ...prev, location: val }))} 
        placeholder="Enter location..."
      />
    </div>
  );
}

export function ProductForm({
  formRef,
  hydrate = {},
  discrepancyChecker = false,
}) {
  const heightRefs = useRef({});
  const edgeRefs = useRef({});
  const diagRefs = useRef({});
  
  // Use shared hook for attribute management
  // We include logic to ensure sub-objects exist even if hydrate is partial
  const { attributes, setAttributes, setAttr } = useProductAttribute({
    formRef,
    hydrate,
    defaults: {
      ...DEFAULT_ATTRIBUTES,
      sailTracks: [],
      dimensions: {},
      points: {}
    }
  });

  // UNIT CONVERSION STATE
  const [unit, setUnit] = useState("mm");
  const unitFactor = { mm: 1, cm: 10, m: 1000 }[unit];

  // MM conversions (Edges, Diagonals, TraceCables)
  const toDisplay = (valMM) => {
    if (valMM === "" || valMM === undefined || valMM === null) return "";
    const num = Number(valMM);
    if (!Number.isFinite(num)) return "";
    // Avoid floating point errors (e.g. 0.3000000004)
    return parseFloat((num / unitFactor).toFixed(4));
  };
  const fromDisplay = (valDisp) => {
    if (valDisp === "" || valDisp === undefined) return "";
    const num = Number(valDisp);
    if (!Number.isFinite(num)) return "";
    return num * unitFactor;
  };

  // Height conversions (Stored as Meters)
  const toDisplayHeight = (valM) => {
    if (valM === "" || valM === undefined || valM === null) return "";
    const num = Number(valM);
    if (!Number.isFinite(num)) return "";
    // Convert m -> mm then to display unit
    return parseFloat(((num * 1000) / unitFactor).toFixed(4));
  };
  const fromDisplayHeight = (valDisp) => {
    if (valDisp === "" || valDisp === undefined) return "";
    const num = Number(valDisp);
    if (!Number.isFinite(num)) return "";
    // Convert display unit -> mm then to m
    return (num * unitFactor) / 1000;
  };

  // pending trace input (choose point + length)
  const [pendingTrace, setPendingTrace] = useState({ point: "A", length: "" });

  // pending UFC input (choose diagonal + optional size)
  const [pendingUfc, setPendingUfc] = useState({
    diagonal: "",
    size: "",
    internalPocket: "standard",
    coatedCable: "no",
  });

  // Add a trace cable entry { point, length }
  const addTraceCable = () => {
    const point = String(pendingTrace.point || "").trim() || "A";
    const lengthDisp = Number(pendingTrace.length) || 0;
    const length = fromDisplay(lengthDisp); // Store in MM

    setAttributes((prev) => {
      const tc = (prev.traceCables || []).slice();
      tc.push({ point, length });
      return { ...prev, traceCables: tc };
    });
    setPendingTrace((s) => ({ ...s, length: "" }));
  };

  // Update an existing trace cable length (by index)
  const updateTraceCableLength = (idx, raw) => {
    const length = fromDisplay(raw);
    setAttributes((prev) => {
      const tc = (prev.traceCables || []).slice();
      if (!tc[idx]) return prev;
      tc[idx] = { ...tc[idx], length };
      return { ...prev, traceCables: tc };
    });
  };

  const removeTraceCable = (idx) => {
    setAttributes((prev) => {
      const tc = (prev.traceCables || []).slice();
      if (idx < 0 || idx >= tc.length) return prev;
      tc.splice(idx, 1);
      return { ...prev, traceCables: tc };
    });
  };

const addUfc = () => {
  const d = String(pendingUfc.diagonal || "").trim();
  if (!d) return;

  const sizeNum = Number(pendingUfc.size) || undefined;

  setAttributes((prev) => {
    const a = (prev.ufcs || []).slice();
    a.push({
      diagonal: d,
      ...(sizeNum ? { size: sizeNum } : {}),
      internalPocket: pendingUfc.internalPocket || "standard",
      coatedCable: (pendingUfc.coatedCable || "no") === "yes",
    });
    return { ...prev, ufcs: a };
  });

  // Reset pending line
  setPendingUfc({ diagonal: "", size: "", internalPocket: "standard", coatedCable: "no" });
};


  const updateUfcSize = (idx, raw) => {
    const size = Number(raw) || undefined;
    setAttributes((prev) => {
      const a = (prev.ufcs || []).slice();
      if (!a[idx]) return prev;
      a[idx] = size ? { ...a[idx], size } : { diagonal: a[idx].diagonal };
      return { ...prev, ufcs: a };
    });
  };

  const updateUfcField = (idx, key, value) => {
    setAttributes((prev) => {
      const a = (prev.ufcs || []).slice();
      if (!a[idx]) return prev;
      a[idx] = { ...a[idx], [key]: value };
      return { ...prev, ufcs: a };
    });
  };

  const removeUfc = (idx) => {
    setAttributes((prev) => {
      const a = (prev.ufcs || []).slice();
      if (idx < 0 || idx >= a.length) return prev;
      a.splice(idx, 1);
      return { ...prev, ufcs: a };
    });
  };

  // Rebuild dimensions + points when pointCount changes (preserve existing values)
  useEffect(() => {
    setAttributes((prev) => {
      const n = clamp(prev.pointCount, 1, MAX_POINTS);
      const allLabels = [...makeEdgeLabels(n), ...makeDiagonalLabels(n)];

      const dimensions = {};
      allLabels.forEach((lbl) => {
        dimensions[lbl] = prev.dimensions?.[lbl] ?? "";
      });

      const points = {};
      makeVertexLabels(n).forEach((p) => {
        const old = prev.points?.[p] ?? {};
        points[p] = {
          height: old.height ?? "",
          // default tension hardware (was FIXING_TYPES[0])
          tensionHardware: old.tensionHardware ?? TENSION_HARDWARE_OPTIONS[0],
          tensionAllowance: old.tensionAllowance ?? 50,
          cornerFitting: old.cornerFitting ?? CORNER_FITTING_OPTIONS[0],
        };
      });

      // preserve only sailTracks that still exist for this point count
      const sailTracks = (prev.sailTracks || []).filter((lbl) => allLabels.includes(lbl));

      return { ...prev, pointCount: n, dimensions, points, sailTracks };
    });
  }, [attributes.pointCount]);

  // Setters
  const setCount = (next) =>
    setAttributes((prev) => ({
      ...prev,
      pointCount: clamp(Number(next) || 1, 1, MAX_POINTS),
    }));

  const setDimension = (label, value) =>
    setAttributes((prev) => ({
      ...prev,
      dimensions: { ...prev.dimensions, [label]: value },
    }));

  // Set exit and logo points (labels like 'A','B',... or empty string)
  const setExitPoint = (pt) =>
    setAttributes((prev) => ({ ...prev, exitPoint: pt }));

  const setLogoPoint = (pt) =>
    setAttributes((prev) => ({ ...prev, logoPoint: pt }));

// Modify the setPointField function:
const setPointField = (p, key, value) =>
  setAttributes((prev) => {
    const newPoints = { ...(prev.points || {}) };
    const cur = newPoints[p] || {};
    let next = { ...cur, [key]: value };

    // If customer selects tensionHardware, set defaults for both cornerFitting and tensionAllowance
    if (key === "tensionHardware") {
      const hw = String(value || "").toLowerCase();
      let defaultCorner = cur.cornerFitting ?? CORNER_FITTING_OPTIONS[0];
      if (hw.includes("bowshackle") || hw.includes("turnbuckle")) defaultCorner = "Pro-Rig";
      else if (hw.includes("togglebolt")) defaultCorner = "Pro-Rig with Small Pipe";
      
      // Set default tension allowance based on hardware type
      next.tensionAllowance = TENSION_HARDWARE_DEFAULTS[value] ?? 50;
      // Apply default corner fitting
      next.cornerFitting = defaultCorner;
    }

    newPoints[p] = next;
    return { ...prev, points: newPoints };
  });





  // Toggle sailtrack presence for a given edge label
  const toggleSailTrack = (edgeLabel) =>
    setAttributes((prev) => {
      const set = new Set(prev.sailTracks || []);
      if (set.has(edgeLabel)) set.delete(edgeLabel);
      else set.add(edgeLabel);
      return { ...prev, sailTracks: Array.from(set) };
    });

  useEffect(() => {
    setAttributes((prev) => {
      const sail = prev.sailTracks || [];
      const forced = new Set();
      for (const lbl of sail) {
        if (typeof lbl !== "string") continue;
        // expect labels like "AB"
        if (lbl.length >= 2) {
          forced.add(lbl[0]);
          forced.add(lbl[1]);
        }
      }

      let changed = false;
      const newPoints = { ...(prev.points || {}) };

      for (const p of Object.keys(newPoints)) {
        if (forced.has(p)) {
          const cur = newPoints[p] || {};
          if (cur.cornerFitting !== "Sailtrack Corner" || Number(cur.tensionAllowance) !== 0) {
            newPoints[p] = { ...cur, cornerFitting: "Sailtrack Corner", tensionAllowance: 0 };
            changed = true;
          }
        }
      }

      if (!changed) return prev;
      return { ...prev, points: newPoints };
    });
  }, [attributes.sailTracks]);

   // Handler to move focus to the next height input when Enter is pressed.
  // Uses the vertex order from makeVertexLabels so it wraps naturally.
  // Generic Enter navigation: cycles through heights -> edges -> diagonals, wraps.
  const handleEnterFocus = (e, type, label) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const count = Math.max(0, Number(attributes.pointCount) || 0);
    const heights = makeVertexLabels(count);
    const edges = makeEdgeLabels(count);

    // For diagonals we want to mirror the same logic used in rendering:
    // - only include diagonal labels that exist in attributes.dimensions
    // - split into mandatory (required) diagonals first, then optional ones
    const edgeSet = new Set(edges);
    const dims = attributes.dimensions || {};
    // All diagonal labels present in the dimensions object (and not edges)
    const diagonals = Object.keys(dims || {}).filter((lbl) => !edgeSet.has(lbl)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    // Determine mandatory diagonals using the same "boxes" algorithm as render
    const verts = makeVertexLabels(count);
    const mandatorySet = new Set();
    if (count >= 4) {
      const maxK = Math.floor((count - 4) / 2);
      for (let k = 0; k <= maxK; k++) {
        const a = verts[k];
        const b = verts[k + 1];
        const c = verts[count - k - 2];
        const d = verts[count - k - 1];
        const mk = (x, y) => (x < y ? `${x}${y}` : `${y}${x}`);
        mandatorySet.add(mk(a, c)); // diagonal 1 of box
        mandatorySet.add(mk(b, d)); // diagonal 2 of box
        mandatorySet.add(mk(b, c)); // connecting side between boxes
      }
    }

    const mandatoryDiagonals = diagonals.filter((lbl) => mandatorySet.has(lbl));
    const optionalDiagonals = diagonals.filter((lbl) => !mandatorySet.has(lbl));

    const orderedDiagonals = [...mandatoryDiagonals, ...optionalDiagonals];

    // Build ordered list of {type, label, ref}
    const order = [
      ...heights.map((l) => ({ type: "height", label: l, ref: heightRefs.current[l] })),
      ...edges.map((l) => ({ type: "edge", label: l, ref: edgeRefs.current[l] })),
      ...orderedDiagonals.map((l) => ({ type: "diag", label: l, ref: diagRefs.current[l] })),
    ];

    const startIndex = order.findIndex((it) => it.type === type && it.label === label);

    // If we couldn't find the current element in the order, start from the beginning
    const begin = startIndex === -1 ? 0 : startIndex + 1;

    // Walk forward from the next item, wrapping around, and focus the first
    // rendered/focusable element we find. This ensures Enter always moves to
    // the next input even if some refs are missing or some inputs already
    // contain values.
    for (let i = 0; i < order.length; i++) {
      const idx = (begin + i) % order.length;
      const candidate = order[idx];
      const el = candidate?.ref;
      if (!el) continue; // not rendered / ref not set
      try {
        if (typeof el.focus === "function") {
          el.focus();
          // If it's an <input> we can also try to select its contents.
          try {
            if (typeof el.select === "function") el.select();
            else if (el.setSelectionRange) el.setSelectionRange(0, el.value?.length ?? 0);
          } catch (selErr) {
            // ignore selection errors
          }
          break;
        }
      } catch (err) {
        // ignore any focus errors and continue searching
      }
    }
  };

  // We use useMemo so this doesn't run on every single keystroke, only when structure changes
  const geometry = useMemo(() => {
    const dims = attributes.dimensions || {};
    const count = Math.max(0, Number(attributes.pointCount) || 0);
    const letters = Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
    
    // Edges
    const expectedEdges = letters.length >= 2 ? letters.map((ch, i) => ch + letters[(i + 1) % letters.length]) : [];
    const edgeSet = new Set(expectedEdges);
    const edges = expectedEdges.map((lbl) => ({ label: lbl, value: dims[lbl] ?? "" }));

    // Diagonals
    const allDiagonals = Object.entries(dims)
      .filter(([lbl]) => !edgeSet.has(lbl))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    // Mandatory Logic
    const verts = makeVertexLabels(count);
    const mandatorySet = new Set();
    if (count >= 4) {
      const maxK = Math.floor((count - 4) / 2);
      for (let k = 0; k <= maxK; k++) {
        const a = verts[k], b = verts[k + 1], c = verts[count - k - 2], d = verts[count - k - 1];
        const mk = (x, y) => (x < y ? `${x}${y}` : `${y}${x}`);
        mandatorySet.add(mk(a, c)); mandatorySet.add(mk(b, d)); mandatorySet.add(mk(b, c));
      }
    }

    const mandatory = allDiagonals.filter(([lbl]) => mandatorySet.has(lbl));
    let tip = [], optional = allDiagonals.filter(([lbl]) => !mandatorySet.has(lbl));

    if (count >= 5 && count % 2 !== 0) {
      const tipVertex = verts[Math.floor(count / 2)];
      tip = optional.filter(([lbl]) => lbl.includes(tipVertex));
      optional = optional.filter(([lbl]) => !lbl.includes(tipVertex));
    }

    // Perimeter Calc
    const perimeterMM = edges.reduce((sum, item) => sum + (Number.isFinite(Number(item.value)) ? Number(item.value) : 0), 0);
    const perimeterMeters = Math.floor(perimeterMM / 1000) + (perimeterMM % 1000 > 199 ? 1 : 0);

    return { edges, mandatory, tip, optional, perimeterMM, perimeterMeters, letters };
  }, [attributes.dimensions, attributes.pointCount, makeVertexLabels]);

  // --- 2. SETUP NAVIGATION ORDER ---
  
  // We build a flat array of IDs in the exact order the user should "Enter" through
  const fieldOrder = [
    // 1. Edges (e.g. edge-AB, edge-BC)
    ...geometry.edges.map(e => `edge-${e.label}`),
    // 2. Required Diagonals
    ...geometry.mandatory.map(([label]) => `diag-${label}`),
    // 3. Tip Diagonals
    ...geometry.tip.map(([label]) => `diag-${label}`),
    // 4. Optional Diagonals
    ...geometry.optional.map(([label]) => `diag-${label}`),
    // 5. Heights (e.g. height-A, height-B)
    ...geometry.letters.map(p => `height-${p}`)
  ];

  // Initialize the hook
  const nav = useFormNavigation(fieldOrder);


  return (
    <div className="max-w-5xl mx-auto">
      
      {/* SECTION 1: MAIN SPECS */}
      {!discrepancyChecker && (
        <FormSection title="Fabric & Cable Specifications">
           <FormGrid columns={3}>
              <SelectInput 
                label="Fabric Category" 
                value={attributes.fabricCategory} 
                onChange={(val) => setAttributes(prev => ({...prev, fabricCategory: val, fabricType: ""}))} 
                options={["PVC", "ShadeCloth"]} 
              />
              <SelectInput 
                label="Fabric Type" 
                value={attributes.fabricType} 
                onChange={setAttr("fabricType")} 
                options={FABRIC_OPTIONS[attributes.fabricCategory] || []}
                disabled={!attributes.fabricCategory}
              />
              <TextInput label="Colour" value={attributes.colour} onChange={setAttr("colour")} />
           </FormGrid>
           
           <FormGrid columns={2}>
              <SelectInput 
                label="Cable Size" 
                value={attributes.cableSize} 
                onChange={setAttr("cableSize")} 
                options={CABLE_SIZE_OPTIONS.map(s => ({label: `${s}mm`, value: s}))}
              />
              <SelectInput 
                label="Hem Fold Side" 
                value={attributes.foldSides} 
                onChange={setAttr("foldSides")} 
                options={FOLD_SIDES} 
              />
           </FormGrid>
        </FormSection>
      )}

      {/* SECTION 2: GEOMETRY SETUP */}
      <FormSection title={
        <div className="flex justify-between items-center w-full">
          <span>Geometry Configuration</span>
          <div className="flex items-center text-sm font-normal">
            <label className="mr-2 text-gray-500 dark:text-gray-400">Values in:</label>
            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
              {['mm', 'cm', 'm'].map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                    unit === u
                      ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      }>
        <FormGrid columns={2}>
          {/* Points +/- Control (Preserved) */}
          <div className="flex flex-col">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5 ml-1 select-none">Points</label>
            <div className="flex items-center">
              <button type="button" className="flex items-center justify-center w-12 h-12 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 border-r-0 rounded-l-lg dark:text-white" onClick={() => setCount(Math.max(3, Number(attributes.pointCount) - 1))}>−</button>
              <NumberInput className="md:rounded-lg rounded-none text-center" step={1} min={3} max={MAX_POINTS} placeholder="—" value={attributes.pointCount} onChange={(v) => setCount(v)} />
              <button type="button" className="flex items-center justify-center w-12 h-12 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 border-l-0 rounded-r-lg dark:text-white" onClick={() => setCount(Math.min(MAX_POINTS, (Number(attributes.pointCount)||0) + 1))}>+</button>
            </div>
          </div>
          {/* Exit/Logo (Preserved) */}
          {!discrepancyChecker && (
             <div className="flex gap-4">
                <SelectInput label="Exit Point" value={attributes.exitPoint} onChange={setExitPoint} options={[{ label: "Any", value: "" }, { label: "Low", value: "low" }, { label: "High", value: "high" }, ...geometry.letters.map(v => ({ label: v, value: v }))]} />
                <SelectInput label="Logo Point" value={attributes.logoPoint} onChange={setLogoPoint} options={[{ label: "Any", value: "" }, { label: "Low", value: "low" }, { label: "High", value: "high" }, ...geometry.letters.map(v => ({ label: v, value: v }))]} />
             </div>
          )}
        </FormGrid>
      </FormSection>

      {/* --- SECTION 3: EDGES & DIAGONALS (Updated with Nav) --- */}
      
      {/* EDGES */}
      <FormSection title="Edge Dimensions">
        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 italic">
          Enter the measurement of each side.
        </div>
        <FormGrid columns={geometry.edges.length > 4 ? 3 : 2}>
          {geometry.edges.map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <NumberInput
                // NAVIGATION BINDING:
                nav={nav}
                name={`edge-${label}`} // Matches fieldOrder
                // Basics
                label={`Edge ${label[0]}-${label[1]} (${unit})`}
                min={0}
                value={toDisplay(value)}
                onChange={(v) => setDimension(label, fromDisplay(v))}
              />
              <div className="mt-1">
                <CheckboxInput
                  label="Sailtrack"
                  checked={(attributes.sailTracks || []).includes(label)}
                  onChange={() => toggleSailTrack(label)}
                />
              </div>
            </div>
          ))}
        </FormGrid>
        {geometry.edges.length > 0 && (
            <div className="mt-4 p-4 bg-gray-500/5 rounded-lg border border-gray-500/20 text-center font-medium text-gray-700 dark:text-gray-300">
              Total Perimeter: {geometry.perimeterMM}mm ({geometry.perimeterMeters}m)
            </div>
        )}
      </FormSection>

      {/* DIAGONALS */}
      {(geometry.mandatory.length > 0 || geometry.tip.length > 0 || geometry.optional.length > 0) && (
        <FormSection title="Diagonal Dimensions">
          <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 italic">
            Measure across the sail to check determine geometry. 'Required' measurements (red) are needed to calculate shape.
          </div>
          
          {/* Required */}
          {geometry.mandatory.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-red-600 mb-3 uppercase tracking-wide dark:text-red-400">Required</h4>
              <FormGrid columns={3}>
                {geometry.mandatory.map(([label, value]) => (
                  <NumberInput
                    key={label}
                    nav={nav}
                    className={"text-red border-red-400 focus:border-red-500"}
                    name={`diag-${label}`} // Matches fieldOrder
                    label={`${label[0]}-${label[1]} (${unit})`}
                    min={0}
                    value={toDisplay(value)}
                    onChange={(v) => setDimension(label, fromDisplay(v))}
                  />
                ))}
              </FormGrid>
            </div>
          )}

          {/* Tip */}
          {geometry.tip.length > 0 && (
            <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 uppercase tracking-wide">Tip Diagonals (At least one)</h4>
              <FormGrid columns={3}>
                {geometry.tip.map(([label, value]) => (
                  <NumberInput
                    key={label}
                    nav={nav}
                    name={`diag-${label}`}
                    label={`${label[0]}-${label[1]} (${unit})`}
                    className="border-blue-300 focus:border-blue-500"
                    min={0}
                    value={toDisplay(value)}
                    onChange={(v) => setDimension(label, fromDisplay(v))}
                  />
                ))}
              </FormGrid>
            </div>
          )}

          {/* Optional */}
          {geometry.optional.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Optional</h4>
              <FormGrid columns={4}>
                {geometry.optional.map(([label, value]) => (
                  <NumberInput
                    key={label}
                    nav={nav}
                    name={`diag-${label}`}
                    label={`${label}(${unit})`}
                    min={0}
                    value={toDisplay(value)}
                    onChange={(v) => setDimension(label, fromDisplay(v))}
                  />
                ))}
              </FormGrid>
            </div>
          )}
        </FormSection>
      )}

      {/* --- SECTION 4: POINT SPECIFICATIONS (With Priority Box + Nav) --- */}
      <FormSection title="Point Specifications">
        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 italic">
          Enter the height of each corner point from the ground or datum point.
        </div>
        <div className="flex flex-col space-y-2">
          {Object.entries(attributes.points).map(([p, vals]) => (
            <div key={p} className="py-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                
                {/* PRIORITY BOX */}
                <div className="flex-none w-full lg:w-56 bg-blue-500/5 p-3 rounded-lg border border-blue-500/20 flex items-center gap-4">
                  <div className="flex-none flex items-center justify-center w-12 h-12 rounded-full bg-blue-900 text-white text-xl font-bold shadow-sm">
                    {p}
                  </div>
                  <div className="flex-1">
                    <NumberInput
                      // NAVIGATION BINDING (Next in list after Diagonals)
                      nav={nav}
                      name={`height-${p}`} 
                      label={`Height (${unit})`}
                      className="border-blue-300 focus:border-blue-500 font-bold text-lg"
                      wrapperClassName="mb-0"
                      min={0}
                      step="any"
                      value={toDisplayHeight(vals.height)}
                      onChange={(v) => setPointField(p, "height", fromDisplayHeight(v))}
                    />
                  </div>
                </div>

                <div className="hidden lg:block text-gray-300 dark:text-gray-600 text-2xl">→</div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  {!discrepancyChecker && (
                    <>
                      <SelectInput
                        label="Corner Fitting"
                        options={CORNER_FITTING_OPTIONS}
                        value={vals.cornerFitting ?? ""}
                        onChange={(val) => setPointField(p, "cornerFitting", val)}
                      />
                      <SelectInput
                        label="Hardware"
                        options={TENSION_HARDWARE_OPTIONS}
                        value={vals.tensionHardware ?? ""}
                        onChange={(val) => setPointField(p, "tensionHardware", val)}
                      />
                    </>
                  )}
                  {!discrepancyChecker && (
                    <div className={discrepancyChecker ? "col-span-1 md:col-span-3" : ""}>
                      <NumberInput
                        label="Tension Allowance (mm)"
                        min={0}
                        placeholder="Standard"
                        value={vals.tensionAllowance}
                        onChange={(v) => setPointField(p, "tensionAllowance", v)}
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      </FormSection>

      {/* --- SECTION 5: EXTRAS (DETAILS) --- */}
      {!discrepancyChecker && (
        <details className="group mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
          <summary className="cursor-pointer text-xl font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 select-none list-none">
             <span className="group-open:rotate-90 transition-transform">▶</span>
             Extras (Trace Cables & UFCs)
          </summary>
          
          <div className="mt-6 space-y-8 pl-4 border-l-2 border-gray-100 dark:border-gray-700 ml-2">
            
            {/* TRACE CABLES */}
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Trace Cables</h4>
              <div className="flex flex-wrap items-end gap-4 mb-4">
                <div className="w-32">
                  <SelectInput
                    label="From Point"
                    value={pendingTrace.point}
                    onChange={(val) => setPendingTrace((s) => ({ ...s, point: val }))}
                    options={makeVertexLabels(Math.max(0, Number(attributes.pointCount) || 0)).map(pt => ({label: pt, value: pt}))}
                  />
                </div>
                <div className="w-40">
                  <NumberInput
                    label={`Length (${unit})`}
                    value={toDisplay(pendingTrace.length)}
                    onChange={(val) => setPendingTrace((s) => ({ ...s, length: fromDisplay(val) }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={addTraceCable}
                  className="h-12 px-6 bg-gray-900 text-white font-bold rounded-lg hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 transition-colors shadow-sm"
                >
                  Add
                </button>
              </div>

              {/* List */}
              <div className="space-y-3">
                {(attributes.traceCables || []).map((tc, i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-500/5 p-2 rounded-lg border border-gray-500/20 w-max pr-4">
                     <span className="font-bold text-gray-700 dark:text-gray-200 w-8 text-center">{tc.point}</span>
                     <div className="w-32">
                       <NumberInput 
                         value={toDisplay(tc.length)} 
                         onChange={(v) => updateTraceCableLength(i, v)} 
                         className="h-10 bg-white" // Slightly smaller for list items
                       />
                     </div>
                     <span className="text-gray-500 text-sm">{unit}</span>
                     <button 
                       type="button" 
                       onClick={() => removeTraceCable(i)} 
                       className="ml-auto px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium transition-colors"
                     >
                       Remove
                     </button>
                  </div>
                ))}
              </div>
            </div>

            {/* UFCs */}
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">UFCs</h4>
              <FormGrid columns={4} className="items-end">
                 <SelectInput
                    label="Diagonal"
                    value={pendingUfc.diagonal}
                    onChange={(val) => setPendingUfc((s) => ({ ...s, diagonal: val }))}
                    options={[
                      {label: "—", value: ""},
                      ...makeDiagonalLabels(Math.max(0, Number(attributes.pointCount) || 0)).map(d => ({label: d, value: d}))
                    ]}
                 />
                 <SelectInput
                    label="Size"
                    value={pendingUfc.size}
                    onChange={(val) => setPendingUfc((s) => ({ ...s, size: val }))}
                    options={[{ label: "(auto)", value: "" }, { label: "5mm", value: "5" }, { label: "6mm", value: "6" }]}
                 />
                 <SelectInput
                    label="Pocket"
                    value={pendingUfc.internalPocket ?? "standard"}
                    onChange={(val) => setPendingUfc((s) => ({ ...s, internalPocket: val }))}
                    options={[{ label: "Standard", value: "standard" }, { label: "No", value: "no" }, { label: "Yes", value: "yes" }]}
                 />
                 <button
                    type="button"
                    onClick={addUfc}
                    className="h-12 w-full bg-gray-900 text-white font-bold rounded-lg hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 transition-colors shadow-sm"
                 >
                    Add UFC
                 </button>
              </FormGrid>

              {/* UFC List */}
              <div className="space-y-3 mt-4">
                {(attributes.ufcs || []).map((u, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-4 bg-gray-500/5 p-2 rounded-lg border border-gray-500/20">
                    <span className="font-bold text-gray-700 dark:text-gray-200 w-12">{u.diagonal}</span>
                    <SelectInput 
                      className="h-10 w-24 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={u.size ?? ""} 
                      onChange={(val) => updateUfcSize(i, val)} 
                      options={[{ label: "Auto", value: "" }, { label: "5mm", value: "5" }, { label: "6mm", value: "6" }]}
                    />
                    <SelectInput 
                      className="h-10 w-28 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={u.internalPocket === true ? "yes" : u.internalPocket === false ? "no" : (u.internalPocket || "standard")}
                      onChange={(val) => updateUfcField(i, "internalPocket", val)} 
                      options={[{ label: "Standard", value: "standard" }, { label: "No Pocket", value: "no" }, { label: "Pocket", value: "yes" }]}
                    />
                     <button 
                       type="button" 
                       onClick={() => removeUfc(i)} 
                       className="ml-auto px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium transition-colors"
                     >
                       Remove
                     </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </details>
      )}

    </div>
  );
}

/* ---------- Helpers ---------- */

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function makeVertexLabels(n) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: n }, (_, i) => letters[i % letters.length]);
}

function makeEdgeLabels(n) {
  const v = makeVertexLabels(n);
  const out = [];
  for (let i = 0; i < n; i++) out.push(`${v[i]}${v[(i + 1) % n]}`);
  return out;
}

function makeDiagonalLabels(n) {
  if (n < 3) return [];
  const v = makeVertexLabels(n);
  const out = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const isEdge = j === i + 1 || (i === 0 && j === n - 1);
      if (!isEdge) out.push(`${v[i]}${v[j]}`);
    }
  }
  return out;
}

export default ProductForm;
