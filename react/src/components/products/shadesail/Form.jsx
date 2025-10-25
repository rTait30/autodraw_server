import React, { useEffect, useState, useRef } from "react";
import { GeneralSection } from "../GeneralSection";



const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: "winlloyd",
  due_date: "",
  info: "",
});

const MAX_POINTS = 11;

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

// Default attributes (used as base, then merged with attributesHydrate)
const DEFAULT_ATTRIBUTES = Object.freeze({
  fabricCategory: "ShadeCloth",
  fabricType: "Rainbow Z16",
  foldSide: "Underside",
  exitPoint: "A",
  logoPoint: "",
  cableSize: 4,
  pointCount: 4,
  dimensions: {
    AB: 1000,
    BC: 1000,
    CD: 1000,
    DA: 1000,
    AC: 1414,
    BD: 1414,
  },
  points: {
    A: { height: 5, cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
    B: { height: 5, cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
    C: { height: 5, cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
    D: { height: 5, cornerFitting: "Pro-Rig", tensionHardware: "M8 Bowshackle", tensionAllowance: 50 },
  },
  sailTracks: [],
  traceCables: [],
  ufcs: [],
});

export default function SailForm({ formRef, generalDataHydrate = {}, attributesHydrate = {}, discrepancyChecker = false }) {
  const [generalData, setGeneralData] = useState(() => ({
    ...GENERAL_DEFAULTS,
    ...(generalDataHydrate ?? {}),
  }));

  const heightRefs = useRef({});
  const edgeRefs = useRef({});
  const diagRefs = useRef({});

  // pending trace input (choose point + length)
  const [pendingTrace, setPendingTrace] = useState({ point: "A", length: "" });

  // pending UFC input (choose diagonal + optional size)
  const [pendingUfc, setPendingUfc] = useState({ diagonal: "", size: "" });

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

  // Add a UFC entry { diagonal, size? }
  const addUfc = () => {
    const diagonal = String(pendingUfc.diagonal || "").trim();
    if (!diagonal) return;
    const size = Number(pendingUfc.size) || undefined;
    setAttributes((prev) => {
      const a = (prev.ufcs || []).slice();
      a.push(size ? { diagonal, size } : { diagonal });
      return { ...prev, ufcs: a };
    });
    setPendingUfc((s) => ({ ...s, size: "" }));
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

  const removeUfc = (idx) => {
    setAttributes((prev) => {
      const a = (prev.ufcs || []).slice();
      if (idx < 0 || idx >= a.length) return prev;
      a.splice(idx, 1);
      return { ...prev, ufcs: a };
    });
  };


  // --- Attributes (now hydratable) ---
  const [attributes, setAttributes] = useState(() => {
    const hyd = deepNumberify(attributesHydrate ?? {});
    const base = DEFAULT_ATTRIBUTES;
    return {
      ...base,
      ...hyd,
      // ensure sailTracks merged/preserved if provided
      sailTracks: hyd.sailTracks ?? base.sailTracks ?? [],
      dimensions: { ...(base.dimensions ?? {}), ...(hyd.dimensions ?? {}) },
      points: { ...(base.points ?? {}), ...(hyd.points ?? {}) },
    };
  });

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
          height: old.height ?? 5,
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

  // Expose getValues (React 19: ref as prop)
  useEffect(() => {
    if (!formRef) return;
    formRef.current = {
      getValues: () => ({
        general: generalData,
        attributes: deepNumberify(attributes),
        calculated: {},
      }),
    };
    return () => {
      if (formRef) formRef.current = null;
    };
  }, [formRef, generalData, attributes]);

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


  return (
    <div className="p-3 space-y-3">

      {discrepancyChecker === false && (
      
        <GeneralSection data={generalData} setData={setGeneralData} />

      )}

      <br></br>
      <h3 className="headingStyle">Shade Sail</h3>

      {/* Fabric Category (minimal) */}
      <section className="space-y-2">
        <label className="block text-sm font-medium">Fabric Category</label>
        <select
          className="inputCompact"
          value={attributes.fabricCategory ?? ""}
          onChange={(e) =>
            setAttributes((prev) => {
              const nextCat = e.target.value;
              const firstType = FABRIC_OPTIONS[nextCat]?.[0] ?? "";
              return { ...prev, fabricCategory: nextCat, fabricType: firstType };
            })
          }
        >
          <option value="PVC">PVC</option>
          <option value="ShadeCloth">ShadeCloth</option>
        </select>



        {/* Fabric Type (dependent on category) */}
        <label className="block text-sm font-medium">Fabric Type</label>
        <select
          className="inputCompact"
          value={attributes.fabricType ?? ""}
          onChange={(e) =>
            setAttributes((prev) => ({ ...prev, fabricType: e.target.value }))
          }
        >
          {(FABRIC_OPTIONS[attributes.fabricCategory] || []).map((ft) => (
            <option key={ft} value={ft}>
              {ft}
            </option>
          ))}
        </select>



        {/* Colour*/}
        {!discrepancyChecker && (
          <>
            <label className="block text-sm font-medium">Colour</label>
            <input
              list="colourOptions"
              className="inputCompact"
              type="text"
          value={attributes.colour ?? ""}
          onChange={(e) => setAttributes((prev) => ({ ...prev, colour: e.target.value }))}
          />
          <datalist id="colourOptions">
            {COLOUR_OPTIONS.map((colour) => (
              <option key={colour} value={colour} />
            ))}
          </datalist>

          </>
        )}

        {/* Fold side */}
        {!discrepancyChecker && (
          <>
        
        <label className="block text-sm font-medium">Fold Side</label>
        <select
          className="inputCompact"
          value={attributes.foldSide ?? ""}
          onChange={(e) => setAttributes((prev) => ({ ...prev, foldSide: e.target.value }))}
        >
          {FOLD_SIDES.map((fs) => (
            <option key={fs} value={fs}>
              {fs}
            </option>
          ))}
        </select>
        
          </>
        )}
      </section>

        {/* Fold side */}
        {!discrepancyChecker && (
          <section className="space-y-2">
            <label className="block text-sm font-medium">Cable Size (mm)</label>
            <select
              className="inputCompact"
              value={attributes.cableSize ?? ""}
              onChange={(e) => setAttributes((prev) => ({ ...prev, cableSize: e.target.value }))}
            >
              {CABLE_SIZE_OPTIONS.map((cs) => (
                <option key={cs} value={cs}>
                  {cs}
                </option>
              ))}
            </select>
          </section>
        )}

      {/* Point count */}
      <section className="space-y-2">
        <label className="block text-sm font-medium">Points</label>

        <div className="flex items-center gap-2 max-w-[260px]">


          <input
            className="inputCompact h-9 text-center w-full"
            type="number"
            inputMode="numeric"
            step={1}
            min={3}
            max={MAX_POINTS}
            placeholder="—"
            value={attributes.pointCount === "" ? "" : attributes.pointCount}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                setCount(""); // allow empty
                return;
              }
              const n = parseInt(v, 10);
              if (Number.isNaN(n)) {
                setCount("");
                return;
              }
              // clamp to 1..MAX_POINTS
              setCount(Math.min(MAX_POINTS, Math.max(1, n)));
            }}
          />
          {/* Mobile +/- buttons (hide on md+) */}
          <button
            type="button"
            className="px-3 h-9 text-lg leading-none bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition-colors"
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
            className="px-3 h-9 text-lg leading-none bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition-colors"
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
      </section>

{/* Exit Point and Logo Point side by side, compact layout */}
<section className="flex items-end gap-4">
  {/* Exit Point */}
  <div className="flex flex-col items-center">
    <label className="text-sm font-medium mb-1">Exit Point</label>
    {(() => {
      const verts = makeVertexLabels(Math.max(0, Number(attributes.pointCount) || 0));
      const allowBlankExit = (attributes.sailTracks || []).length > 0;
      return (
        <select
          className="inputCompact h-9 text-center"
          value={attributes.exitPoint ?? ""}
          onChange={(e) => setExitPoint(e.target.value)}
        >
          {allowBlankExit ? <option value="">-</option> : null}
          {verts.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    })()}
  </div>

  {/* Logo Point */}
  <div className="flex flex-col items-center">
    <label className="text-sm font-medium mb-1">Logo</label>
    {(() => {
      const verts = makeVertexLabels(Math.max(0, Number(attributes.pointCount) || 0));
      return (
        <select
          className="inputCompact h-9 text-center"
          value={attributes.logoPoint ?? ""}
          onChange={(e) => setLogoPoint(e.target.value)}
        >
          <option value="">-</option>
          {verts.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    })()}
  </div>
</section>

      {/* Dimensions (Edges first, then Diagonals) */}
      <section className="space-y-3">

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
          const optionalDiagonals = diagonals.filter(([lbl]) => !mandatorySet.has(lbl));
 

          return (
            <>
              {/* Edges - vertical list */}
              <br></br>
              <div className="space-y-2">
                <h5 className="text-sm font-medium opacity-70">Edges</h5>
                {edges.map(([label, value]) => (
                  <div key={label} className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-sm">{label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          ref={(el) => (edgeRefs.current[label] = el)}
                          className="inputCompact"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={value}
                          onChange={(e) => setDimension(label, e.target.value)}
                         onKeyDown={(e) => handleEnterFocus(e, "edge", label)}
                        />

                        {!discrepancyChecker && (

                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={(attributes.sailTracks || []).includes(label)}
                            onChange={() => toggleSailTrack(label)}
                            aria-label={`Sailtrack ${label}`}
                          />
                          <span>Sailtrack</span>
                        </label>
                        )}
                      </div>
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
              </div>

              <br></br>

              {/* Diagonals - split into mandatory (required) and optional */}
              {mandatoryDiagonals.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium opacity-70">Required diagonals</h5>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-x-0 gap-y-3">
                    {mandatoryDiagonals.map(([label, value]) => (
                      <div key={label} className="space-y-3">
                        <label className="text-sm block mb-2">{label} <span className="text-xs opacity-60">(required)</span></label>
                        <input
                          ref={(el) => (diagRefs.current[label] = el)}
                          className="inputCompact w-28"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={value}
                          onChange={(e) => setDimension(label, e.target.value)}
                          onKeyDown={(e) => handleEnterFocus(e, "diag", label)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {optionalDiagonals.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium opacity-70">Optional diagonals (Please provide as many as possible)</h5>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-x-0 gap-y-3">
                    {optionalDiagonals.map(([label, value]) => (
                      <div key={label} className="space-y-3">
                        <label className="text-sm block mb-2">{label}</label>
                        <input
                          ref={(el) => (diagRefs.current[label] = el)}
                          className="inputCompact w-28"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={value}
                          onChange={(e) => setDimension(label, e.target.value)}
                          onKeyDown={(e) => handleEnterFocus(e, "diag", label)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </section>

      <section className="space-y-2">
        <br></br>
        <h5 className="text-sm font-medium opacity-70">Points</h5>

      {/* Compact header — visible on all screen sizes */}
      <div className="grid grid-cols-12 text-[11px] font-medium opacity-70 mb-1">
        <div className="col-span-1">Pt</div>
        <div className="col-span-2">Height&nbsp;(m)</div>

          {!discrepancyChecker && (
            <>
              <div className="col-span-3">Corner Fitting</div>
              <div className="col-span-3">Tensioning Hardware</div>
              <div className="col-span-2">Tension&nbsp;(mm)</div>
            </>
          )}

      </div>

      <div className="space-y-1">
        {Object.entries(attributes.points).map(([p, vals]) => (
          <div
            key={p}
            className="grid grid-cols-12 items-center gap-1 text-xs"
          >
            {/* Point label */}
            <div className="col-span-1 text-[11px] opacity-80">{p}</div>

            {/* Height */}
            <input
              ref={(el) => (heightRefs.current[p] = el)}
              className="inputCompact col-span-2"
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
            {!discrepancyChecker && (
              <input
                className="inputCompact h-8 px-2 text-xs w-full col-span-2"
                type="number"
                min={0}
                step="any"
                inputMode="numeric"
                value={vals.tensionAllowance}
                onChange={(e) => setPointField(p, "tensionAllowance", e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
      </section>

        {/* Trace cables - separate section (keeps points compact on mobile) */}
      {!discrepancyChecker && (
        <section className="space-y-2">
          <h5 className="text-sm font-medium opacity-70">Trace Cables</h5>

          {/* Single add control: select a point + enter length */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs opacity-70">From</label>
            <select
              className="inputCompact h-8 text-xs"
              value={pendingTrace.point}
              onChange={(e) => setPendingTrace((s) => ({ ...s, point: e.target.value }))}
            >
              {makeVertexLabels(Math.max(0, Number(attributes.pointCount) || 0)).map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>

            <label className="text-xs opacity-70">Length</label>
            <input
              className="inputCompact h-8 w-28 text-xs"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="mm"
              value={pendingTrace.length}
              onChange={(e) => setPendingTrace((s) => ({ ...s, length: e.target.value }))}
            />
            <button
              type="button"
              className="h-8 px-3 bg-gray-200 rounded hover:bg-gray-300 text-sm"
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
        </section>
      )}

      {/* UFCs - similar to Trace Cables: diagonal + optional size (5 or 6) */}
      {!discrepancyChecker && (
        <section className="space-y-2">
          <h5 className="text-sm font-medium opacity-70">UFCs</h5>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs opacity-70">Diagonal</label>
            <select
              className="inputCompact h-8 text-xs"
              value={pendingUfc.diagonal}
              onChange={(e) => setPendingUfc((s) => ({ ...s, diagonal: e.target.value }))}
            >
              <option value="">—</option>
              {makeDiagonalLabels(Math.max(0, Number(attributes.pointCount) || 0)).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <label className="text-xs opacity-70">Size</label>
            <select
              className="inputCompact h-8 w-24 text-xs"
              value={pendingUfc.size}
              onChange={(e) => setPendingUfc((s) => ({ ...s, size: e.target.value }))}
            >
              <option value="">(auto)</option>
              <option value="5">5</option>
              <option value="6">6</option>
            </select>

            <button
              type="button"
              className="h-8 px-3 bg-gray-200 rounded hover:bg-gray-300 text-sm"
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
                  <div className="w-10 opacity-80">{u.diagonal}</div>
                  <select
                    className="inputCompact h-8 w-24 text-xs"
                    value={u.size ?? ""}
                    onChange={(e) => updateUfcSize(i, e.target.value)}
                  >
                    <option value="">(auto)</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                  <div className="opacity-70">mm</div>
                  <button type="button" className="text-xs text-red-600 ml-2" onClick={() => removeUfc(i)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
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

// --- Recursively convert all numeric-like strings to numbers ---
function deepNumberify(obj) {
  if (Array.isArray(obj)) return obj.map(deepNumberify);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = deepNumberify(v);
    return out;
  }
  if (typeof obj === "string" && obj.trim() !== "" && !isNaN(obj)) return Number(obj);
  return obj;
}
