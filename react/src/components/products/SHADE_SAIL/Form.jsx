import React, { useEffect, useState, useRef, useImperativeHandle } from "react";
import { 
  useProductAttribute, 
  FormContainer, 
  Section,
  SelectInput, 
  TextInput, 
  NumberInput,
  deepNumberify,
  FormSection,
  FormGrid
} from "../../FormUI";

import { baseInputStyles, labelStyles } from "../../sharedStyles";

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
const FOLD_SIDES = ["Underside", "Topside"];

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

  // pending trace input (choose point + length)
  const [pendingTrace, setPendingTrace] = useState({ point: "A", length: "" });

  // pending UFC input (choose diagonal + optional size)
  const [pendingUfc, setPendingUfc] = useState({
    diagonal: "",
    size: "",
    internalPocket: "no",
    coatedCable: "no",
  });

  // Add a trace cable entry { point, length }
  const addTraceCable = () => {
    const point = String(pendingTrace.point || "").trim() || "A";
    const length = Number(pendingTrace.length) || 0;
    setAttributes((prev) => {
      const tc = (prev.traceCables || []).slice();
      tc.push({ point, length });
      return { ...prev, traceCables: tc };
    });
    setPendingTrace((s) => ({ ...s, length: "" }));
  };

  // Update an existing trace cable length (by index)
  const updateTraceCableLength = (idx, raw) => {
    const length = Number(raw) || 0;
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
      internalPocket: (pendingUfc.internalPocket || "no") === "yes",
      coatedCable: (pendingUfc.coatedCable || "no") === "yes",
    });
    return { ...prev, ufcs: a };
  });

  // Reset pending line
  setPendingUfc({ diagonal: "", size: "", internalPocket: "no", coatedCable: "no" });
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

  // Mobile convenience: clear all edge dimensions //DEPRECATED
  const clearAllEdges = () =>
    setAttributes((prev) => {
      const n = clamp(prev.pointCount, 1, MAX_POINTS);
      const dims = { ...(prev.dimensions || {}) };
      makeEdgeLabels(n).forEach((lbl) => {
        if (dims.hasOwnProperty(lbl)) dims[lbl] = "";
      });
      return { ...prev, dimensions: dims };
    });

  // Mobile convenience: clear all diagonal dimensions //DEPRECATED
  const clearAllDiagonals = () =>
    setAttributes((prev) => {
      const n = clamp(prev.pointCount, 1, MAX_POINTS);
      const dims = { ...(prev.dimensions || {}) };
      makeDiagonalLabels(n).forEach((lbl) => {
        if (dims.hasOwnProperty(lbl)) dims[lbl] = "";
      });
      return { ...prev, dimensions: dims };
    });

  // Mobile convenience: clear all heights //DEPRECATED
  const clearAllHeights = () =>
    setAttributes((prev) => {
      const pts = { ...(prev.points || {}) };
      Object.keys(pts).forEach((p) => {
        pts[p] = { ...pts[p], height: "" };
      });
      return { ...prev, points: pts };
    });

  // Mobile convenience: clear all measurements //DEPRECATED
  const clearAllMeasurements = () => {
    // Single batched update: clear all edges, diagonals, and heights
    setAttributes((prev) => {
      const n = clamp(prev.pointCount, 1, MAX_POINTS);

      // Clear edge and diagonal dimensions
      const dims = { ...(prev.dimensions || {}) };
      makeEdgeLabels(n).forEach((lbl) => { if (dims.hasOwnProperty(lbl)) dims[lbl] = ""; });
      makeDiagonalLabels(n).forEach((lbl) => { if (dims.hasOwnProperty(lbl)) dims[lbl] = ""; });

      // Clear heights
      const pts = { ...(prev.points || {}) };
      Object.keys(pts).forEach((p) => { pts[p] = { ...pts[p], height: "" }; });

      return { ...prev, dimensions: dims, points: pts };
    });
  };

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


  return (
    <FormContainer>

      { /*<h3 className="headingStyle">Shade Sail</h3> */ }

      {/* Fabric Category (minimal) */}
      {!discrepancyChecker && (
        <Section title="Fabric Details">
          <SelectInput
            label="Fabric Category" 
            value={attributes.fabricCategory} 
            // React 19 Ref passing (if you needed a ref here)
            //ref={myRef}
            onChange={(val) => {
                setAttributes((prev) => {
                  const firstType = FABRIC_OPTIONS[val]?.[0] ?? "";
                  return { ...prev, fabricCategory: val, fabricType: firstType };
                })
            }}
            options={[ 
              { label: "PVC Material", value: "PVC" }, 
              { label: "Shade Cloth", value: "ShadeCloth" } 
            ]}
          />

          <SelectInput
            label="Fabric Type" 
            value={attributes.fabricType} 
            onChange={setAttr("fabricType")} 
            options={(FABRIC_OPTIONS[attributes.fabricCategory] || []).map(ft => ({ label: ft, value: ft }))}
          />

          <TextInput
            label="Colour"
            value={attributes.colour}
            onChange={setAttr("colour")}
            list="colourOptions"
          />
          <datalist id="colourOptions">
             {COLOUR_OPTIONS.map((colour) => (
                <option key={colour} value={colour} />
             ))}
          </datalist>

          <SelectInput
            label="Fold Side" 
            value={attributes.foldSide} 
            onChange={setAttr("foldSide")} 
            options={FOLD_SIDES.map(fs => ({ label: fs, value: fs }))}
          />
        </Section>
      )}

      {/* Cable Size */}
      {!discrepancyChecker && (
        <Section>
           <SelectInput 
            label="Cable Size (mm)" 
            value={attributes.cableSize} 
            onChange={setAttr("cableSize")} 
            options={CABLE_SIZE_OPTIONS.map(cs => ({ label: cs, value: cs }))}
          />
        </Section>
      )}

      <hr className="my-8 border-gray-300 opacity-50" />

      {/* Point count */}
      <div className="flex items-center gap-2 max-w-[200px]">
        <label className="text-sm font-medium">Points</label>
        <NumberInput
          className="inputCompact h-9 text-center w-20"
          step={1}
          min={3}
          max={MAX_POINTS}
          placeholder="—"
          value={attributes.pointCount}
          onChange={(v) => {
             // clamp to 1..MAX_POINTS handled by setCount logic usually, but here doing direct
             if (v === null) { setCount(""); return; }
             setCount(v);
          }}
        />
        
          {/* Mobile +/- buttons (hide on md+) */}
          <button
            type="button"
            className="px-3 h-9 text-lg leading-none bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 md:hidden"
            onClick={() => {
              const cur = attributes.pointCount;
              if (cur === "" || cur == null) return; // keep empty on minus
              const next = Math.max(3, Number(cur) - 1);
              setCount(next);
            }}
            aria-label="Decrease points"
          >
            −
          </button>
          <button
            type="button"
            className="px-3 h-9 text-lg leading-none bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 md:hidden"
            onClick={() => {
              const cur = attributes.pointCount;
              const base = cur === "" || cur == null ? 0 : Number(cur);
              const next = Math.min(MAX_POINTS, base + 1);
              setCount(next || 1); // if empty, + sets to 1
            }}
            aria-label="Increase points"
          >
            +
          </button>
        </div>

      {/* Exit Point and Logo Point side by side, compact layout */}

      {!discrepancyChecker && (
        <section className="flex items-end gap-4">
           {(() => {
              const verts = makeVertexLabels(Math.max(0, Number(attributes.pointCount) || 0));
              const allowBlankExit = (attributes.sailTracks || []).length > 0;
              const exitOptions = [
                 ...(allowBlankExit ? [{label: "-", value: ""}] : []),
                 ...verts.map(v => ({ label: v, value: v }))
              ];
              const logoOptions = [
                 {label: "-", value: ""},
                 ...verts.map(v => ({ label: v, value: v }))
              ];

              return (
                <>
                <div className="w-24">
                  <SelectInput 
                    label="Exit Point" 
                    value={attributes.exitPoint} 
                    onChange={setExitPoint} 
                    options={exitOptions} 
                  />
                  </div>
                  <div className="w-24">
                   <SelectInput 
                    label="Logo" 
                    value={attributes.logoPoint} 
                    onChange={setLogoPoint} 
                    options={logoOptions} 
                  />
                  </div>
                </>
              );
            })()}
        </section>
      )}

      {/* Dimensions (Edges first, then Diagonals) */}
      <section>

        {(() => {
          const dims = attributes.dimensions || {};
          const count = Math.max(0, Number(attributes.pointCount) || 0);

          // Build expected edges from point count: AB, BC, ..., (last)A
          const letters = Array.from({ length: count }, (_, i) =>
            String.fromCharCode(65 + i)
          );
          const expectedEdges =
            letters.length >= 2
              ? letters.map((ch, i) => ch + letters[(i + 1) % letters.length])
              : [];

          const edgeSet = new Set(expectedEdges);

          // Edges: show in ring order; allow input even if not yet in dims
          const edges = expectedEdges.map((lbl) => [lbl, dims[lbl] ?? ""]);

          // Perimeter (sum of edges, in mm) and meters rounded by rule:
          // roundedMeters = floor(mm/1000) + (remainder > 100 ? 1 : 0)
          const perimeterMM = edges.reduce((sum, [, v]) => {
            const n = Number(v);
            return sum + (Number.isFinite(n) ? n : 0);
          }, 0);
          const perimeterMetersRounded = (() => {
            const base = Math.floor(perimeterMM / 1000);
            const rem = perimeterMM % 1000;
            return base + (rem > 199 ? 1 : 0);
          })();


          // Diagonals: anything else present in dims
          const diagonals = Object.entries(dims)
            .filter(([lbl]) => !edgeSet.has(lbl))
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

          // Determine mandatory diagonals by splitting polygon into "boxes".
          // Boxes are: for k = 0..floor((n-4)/2) take verts [k, k+1, n-k-2, n-k-1].
          // For each box the required dimensions are the two box-diagonals (a-c, b-d)
          // and the connecting side between the inner vertices (b-c). Remaining diagonals are optional.
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
              mandatorySet.add(mk(b, c)); // connecting side between boxes (may be an edge or diag)
            }
          }

          const mandatoryDiagonals = diagonals.filter(([lbl]) => mandatorySet.has(lbl));
          
          // For odd-numbered points (>=5), identify the "tip" vertex (middle index).
          // We need at least one diagonal connected to this tip to stabilize the reflex/convex orientation.
          let tipDiagonals = [];
          let otherDiagonals = diagonals.filter(([lbl]) => !mandatorySet.has(lbl));
          
          if (count >= 5 && count % 2 !== 0) {
            const tipVertex = verts[Math.floor(count / 2)];
            // Filter out diagonals connected to the tip from the general optional list
            const connectedToTip = otherDiagonals.filter(([lbl]) => lbl.includes(tipVertex));
            const notConnected = otherDiagonals.filter(([lbl]) => !lbl.includes(tipVertex));
            
            tipDiagonals = connectedToTip;
            otherDiagonals = notConnected;
          }

          return (
            <>
              {/* Edges - vertical list */}
              <br></br>
              <Section title="Edges">
                {edges.map(([label, value]) => (
                  <div key={label} className="flex items-start gap-2">
                    <div className="flex-1 flex items-center gap-2">
                       {/* Standard Input for easier focusing and compactness */}
                       <div className="w-8 pt-2">
                          <label htmlFor={`edge-${label}`} className="text-sm font-bold cursor-pointer select-none">{label}</label>
                       </div>
                      <NumberInput
                        id={`edge-${label}`}
                        ref={(el) => (edgeRefs.current[label] = el)}
                        className="inputCompact w-32"
                        min={0}
                        value={value}
                        onChange={(v) => setDimension(label, v)}
                        onKeyDown={(e) => handleEnterFocus(e, "edge", label)}
                      />
                      <label className="flex items-center gap-2 text-xs pt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(attributes.sailTracks || []).includes(label)}
                          onChange={() => toggleSailTrack(label)}
                          aria-label={`Sailtrack ${label}`}
                        />
                        <span>Sailtrack</span>
                      </label>
                    </div>
                  </div>
                ))}
                
                {edges.length === 0 && (
                  <div className="text-xs opacity-60">No edges for this point count.</div>
                )}
                
                {/* Perimeter display */}
                {edges.length > 0 && (
                  <div className="text-xl opacity-80 mt-2">
                    Edge meter: {perimeterMM}mm ({perimeterMetersRounded}m)
                  </div>
                )}

                {/* Clear edges button
                {edges.length > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      className="h-8 px-3 bg-gray-200 rounded hover:bg-gray-300 text-xs dark:bg-gray-700 dark:hover:bg-gray-600"
                      onClick={clearAllEdges}
                    >
                      Clear Edges
                    </button>
                  </div>
                )} */}
              </Section>

              <br></br>

              {/* Diagonals - split into mandatory (required) and optional */}
              {mandatoryDiagonals.length > 0 && (
                <Section title="Required diagonals">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                    {mandatoryDiagonals.map(([label, value]) => (
                      <div key={label} className="flex items-center gap-2">
                        <label htmlFor={`diag-req-${label}`} className="text-sm w-6 font-bold cursor-pointer select-none">{label}</label>
                        <NumberInput
                          id={`diag-req-${label}`}
                          ref={(el) => (diagRefs.current[label] = el)}
                          className="inputCompact w-28"
                          min={0}
                          value={value}
                          onChange={(v) => setDimension(label, v)}
                          onKeyDown={(e) => handleEnterFocus(e, "diag", label)}
                        />
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              <br></br>

              {/* Tip Diagonals (for odd points) */}
              {tipDiagonals.length > 0 && (
                <Section>
                  <h5 className="text-sm font-medium opacity-70 text-blue-700">
                    Tip diagonals (Provide at least one)
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 p-2 bg-blue-50 rounded border border-blue-100">
                    {tipDiagonals.map(([label, value]) => (
                      <div key={label} className="flex items-center gap-2">
                        <label htmlFor={`diag-tip-${label}`} className="text-sm font-medium text-blue-800 w-6 cursor-pointer select-none">{label}</label>
                        <NumberInput
                          id={`diag-tip-${label}`}
                          ref={(el) => (diagRefs.current[label] = el)}
                          className="inputCompact w-28 border-blue-300 focus:border-blue-500"
                          min={0}
                          value={value}
                          onChange={(v) => setDimension(label, v)}
                          onKeyDown={(e) => handleEnterFocus(e, "diag", label)}
                        />
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {tipDiagonals.length > 0 && <br></br>}

              {otherDiagonals.length > 0 && (
                <Section title="Optional diagonals (Please provide as many as possible)">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                    {otherDiagonals.map(([label, value]) => (
                      <div key={label} className="flex items-center gap-2">
                        <label htmlFor={`diag-opt-${label}`} className="text-sm w-6 font-bold cursor-pointer select-none">{label}</label>
                        <NumberInput
                          id={`diag-opt-${label}`}
                          ref={(el) => (diagRefs.current[label] = el)}
                          className="inputCompact w-28"
                          min={0}
                          value={value}
                          onChange={(v) => setDimension(label, v)}
                          onKeyDown={(e) => handleEnterFocus(e, "diag", label)}
                        />
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Clear diagonals button 
              {(mandatoryDiagonals.length > 0 || tipDiagonals.length > 0 || otherDiagonals.length > 0) && (
                <div className="mt-3">
                  <button
                    type="button"
                    className="h-8 px-3 bg-gray-200 rounded hover:bg-gray-300 text-xs dark:bg-gray-700 dark:hover:bg-gray-600"
                    onClick={clearAllDiagonals}
                  >
                    Clear Diagonals
                  </button>
                </div>
              )}*/}
            </>
          );
        })()}
      </section>

      <section className="space-y-2 w-full md:max-w-4xl md:mx-auto">
        <br></br>
        <h5 className="text-sm font-medium opacity-70">Points</h5>

        {/* Compact header — visible on desktop only */}
        <div className={`hidden md:grid ${discrepancyChecker ? "grid-cols-5" : "grid-cols-11"} text-[11px] font-medium opacity-70 mb-1`}>
          <div className="col-span-3">Height&nbsp;(m)</div>

          {!discrepancyChecker && (
            <>
              <div className="col-span-3">Corner Fitting</div>
              <div className="col-span-3">Tensioning Hardware</div>
            </>
          )}
          <div className="col-span-2">Tension&nbsp;(mm)</div>

        </div>

        <div className="space-y-1">
          {Object.entries(attributes.points).map(([p, vals]) => (
            <div
              key={p}
              className="flex flex-col md:flex-row md:items-center gap-1"
            >
              {/* Point label */}
              <div className="text-[11px] opacity-80 md:w-6 md:text-right">{p}</div>

              {/* Inputs grid */}
              <div className={`grid ${discrepancyChecker ? "grid-cols-5" : "grid-cols-11"} items-center gap-1 text-xs flex-1`}>
                {/* Height */}
                <input
                  ref={(el) => (heightRefs.current[p] = el)}
                  className={`inputCompact col-span-3 md:w-28`}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="numeric"
                  value={vals.height}
                  onChange={(e) => setPointField(p, "height", e.target.value)}
                  onKeyDown={(e) => handleEnterFocus(e, "height", p)}
                />

                {/* Corner Fitting */}
                {!discrepancyChecker && (
                  <select
                    className="inputCompact h-8 px-1 text-[11px] w-full col-span-3 truncate"
                    value={vals.cornerFitting ?? ""}
                    onChange={(e) => setPointField(p, "cornerFitting", e.target.value)}
                  >
                    {CORNER_FITTING_OPTIONS.map((cf) => (
                      <option key={cf} value={cf}>
                        {cf}
                      </option>
                    ))}
                  </select>
                )}

                {/* Tension Hardware */}
                {!discrepancyChecker && (
                  <select
                    className="inputCompact h-8 px-1 text-[11px] w-full col-span-3 truncate"
                    value={vals.tensionHardware ?? ""}
                    onChange={(e) => setPointField(p, "tensionHardware", e.target.value)}
                  >
                    {TENSION_HARDWARE_OPTIONS.map((th) => (
                      <option key={th} value={th}>
                        {th}
                      </option>
                    ))}
                  </select>
                )}

                {/* Tension allowance */}
                <input
                  className="inputCompact h-8 px-2 text-xs w-full col-span-2"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="numeric"
                  value={vals.tensionAllowance}
                  onChange={(e) => setPointField(p, "tensionAllowance", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        {/* Clear heights button
        <div className="mt-2">
          <button
            type="button"
            className="h-8 px-3 bg-gray-200 rounded hover:bg-gray-300 text-xs dark:bg-gray-700 dark:hover:bg-gray-600"
            onClick={clearAllHeights}
          >
            Clear Heights
          </button>
        </div> */}
      </section>

      {/* Clear all button 
      <div className="mt-2 flex justify-center md:block">
        <button
          type="button"
          className="h-17 w-70 px-9 bg-[#AA0000] rounded hover:bg-[#BB5555] text-xl text-white"
          onClick={clearAllMeasurements}
        >
          Clear Measurements
        </button>
      </div>*/}

      {!discrepancyChecker && (
        <details className="space-y-2">
          <summary className="cursor-pointer text-2xl font-medium opacity-70">Extras</summary>

          {/* Trace cables - separate section (keeps points compact on mobile) */}
          <Section title="Trace Cables">
            {/* Single add control: select a point + enter length */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-20">
                <SelectInput
                  // label="From"
                  value={pendingTrace.point}
                  onChange={(val) => setPendingTrace((s) => ({ ...s, point: val }))}
                  options={makeVertexLabels(Math.max(0, Number(attributes.pointCount) || 0)).map(pt => ({label: pt, value: pt}))}
                />
              </div>

               <div className="w-28">
                <NumberInput
                  // label="Length"
                  placeholder="mm"
                  value={pendingTrace.length}
                  onChange={(val) => setPendingTrace((s) => ({ ...s, length: val }))}
                />
              </div>

              <button
                type="button"
                className="h-10 px-3 mt-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                onClick={addTraceCable}
                aria-label={`Add trace from ${pendingTrace.point}`}
              >
                Add
              </button>
            </div>

            {/* Existing trace cables list */}
            {(attributes.traceCables || []).length > 0 && (
              <div className="space-y-2 mt-2 text-xs">
                {(attributes.traceCables || []).map((tc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 opacity-80">{tc.point}</div>
                     <input
                      className="inputCompact h-8 w-28 text-xs"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={tc.length}
                      onChange={(e) => updateTraceCableLength(i, e.target.value)}
                    />
                    <div className="opacity-70">mm</div>
                    <button type="button" className="text-xs text-red-600 ml-2" onClick={() => removeTraceCable(i)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* UFCs - similar to Trace Cables: diagonal + optional size (5 or 6) */}
          <Section title="UFCs">
            <div className="flex flex-wrap items-center gap-2">
               <div className="w-24">
                <SelectInput
                  label="Diagonal"
                  value={pendingUfc.diagonal}
                  onChange={(val) => setPendingUfc((s) => ({ ...s, diagonal: val }))}
                  options={[
                    {label: "—", value: ""},
                    ...makeDiagonalLabels(Math.max(0, Number(attributes.pointCount) || 0)).map(d => ({label: d, value: d}))
                  ]}
                />
              </div>

              <div className="w-20">
                <SelectInput
                  label="Size"
                  value={pendingUfc.size}
                  onChange={(val) => setPendingUfc((s) => ({ ...s, size: val }))}
                  options={[
                    { label: "(auto)", value: "" },
                    { label: "5", value: "5" },
                    { label: "6", value: "6" }
                  ]}
                />
              </div>

              <div className="w-24">
                <SelectInput
                  label="Pocket"
                  value={pendingUfc.internalPocket ?? "no"}
                  onChange={(val) => setPendingUfc((s) => ({ ...s, internalPocket: val }))}
                   options={[
                    { label: "No Pocket", value: "no" },
                    { label: "Pocket", value: "yes" }
                  ]}
                />
              </div>

            <div className="w-24">
               <SelectInput
                  label="Coated"
                  value={pendingUfc.coatedCable ?? "no"}
                  onChange={(val) => setPendingUfc((s) => ({ ...s, coatedCable: val }))}
                   options={[
                    { label: "Uncoated", value: "no" },
                    { label: "Coated", value: "yes" }
                  ]}
                />
              </div>

              <button
                type="button"
                className="h-10 mt-6 px-3 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                onClick={addUfc}
                aria-label={`Add ufc ${pendingUfc.diagonal}`}
              >
                Add
              </button>
            </div>

            {(attributes.ufcs || []).length > 0 && (
              <div className="space-y-2 mt-2 text-xs">
                {(attributes.ufcs || []).map((u, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {/* Diagonal label */}
                    <div className="w-10 opacity-80">{u.diagonal}</div>

                    {/* Size selector */}
                    <select
                      className="inputCompact h-8 w-20 text-xs"
                      value={u.size ?? ""}
                      onChange={(e) => updateUfcSize(i, e.target.value)}
                    >
                      <option value="">(auto)</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                    </select>
                    <div className="opacity-70">mm</div>

                    {/* Internal Pocket selector */}
                    <select
                      className="inputCompact h-8 w-20 text-xs"
                      value={u.internalPocket ? "yes" : "no"}
                      onChange={(e) =>
                        updateUfcField(i, "internalPocket", e.target.value === "yes")
                      }
                    >
                      <option value="no">No Pocket</option>
                      <option value="yes">Pocket</option>
                    </select>

                    {/* Coated Cable selector */}
                    <select
                      className="inputCompact h-8 w-20 text-xs"
                      value={u.coatedCable ? "yes" : "no"}
                      onChange={(e) =>
                        updateUfcField(i, "coatedCable", e.target.value === "yes")
                      }
                    >
                      <option value="no">Uncoated</option>
                      <option value="yes">Coated</option>
                    </select>

                    {/* Remove button */}
                    <button
                      type="button"
                      className="text-xs text-red-600 ml-2"
                      onClick={() => removeUfc(i)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </details>
      )}
    </FormContainer>
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

// --- Recursively convert all numeric-like strings to numbers ---
/* 
 deepNumberify is now imported from shared/FormUI 
 but we keep it here if not imported, but wait we imported it.
 Removing the local declaration.
*/

export default ProductForm;
