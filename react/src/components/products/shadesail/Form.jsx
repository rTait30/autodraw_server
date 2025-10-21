import React, { useEffect, useState } from "react";
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
  PVC: ["Bochini", "Bochini Blockout", "Mehler FR580", "Ferrari 502S2", "Ferrari 502V3"],
};
const FOLD_SIDES = ["Underside", "Topside"];

const COLOUR_OPTIONS = ["Charcoal", "Black", "White"];

const CABLE_SIZE_OPTIONS = [4, 5, 6, 8];

// Default attributes (used as base, then merged with attributesHydrate)
const DEFAULT_ATTRIBUTES = Object.freeze({
  exitPoint: "A",
  fabricCategory: "ShadeCloth",
  fabricType: "Rainbow Z16",
  foldSide: "Underside",
  cableSize: 4,
  pointCount: 4,
  sailTracks: [],
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
});

export default function SailForm({ formRef, generalDataHydrate = {}, attributesHydrate = {}, discrepancyChecker = false }) {
  const [generalData, setGeneralData] = useState(() => ({
    ...GENERAL_DEFAULTS,
    ...(generalDataHydrate ?? {}),
  }));

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

  const setPointField = (p, key, value) =>
    setAttributes((prev) => {
      const newPoints = { ...(prev.points || {}) };
      const cur = newPoints[p] || {};
      let next = { ...cur, [key]: value };

      // If customer selects tensionHardware, set a sensible default cornerFitting
      if (key === "tensionHardware") {
        const hw = String(value || "").toLowerCase();
        let defaultCorner = cur.cornerFitting ?? CORNER_FITTING_OPTIONS[0];
        if (hw.includes("bowshackle") || hw.includes("turnbuckle")) defaultCorner = "Pro-Rig";
        else if (hw.includes("togglebolt")) defaultCorner = "Pro-Rig with Small Pipe";
        // apply default (overwrites previous only when different)
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

  return (
    <div className="p-3 space-y-3">

      <h3 className="headingStyle">General</h3>

      {discrepancyChecker === false && (
      
        <GeneralSection data={generalData} setData={setGeneralData} />

      )}

      <h3 className="headingStyle">Attributes</h3>

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

        {/* Fold side */}
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
      </section>

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

      {/* Point count */}
      <section className="space-y-2">
        <label className="block text-sm font-medium">Points</label>

        <div className="flex items-center gap-2 max-w-[260px]">
          {/* Mobile +/- buttons (hide on md+) */}
          <button
            type="button"
            className="md:hidden px-3 h-9 rounded border text-lg leading-none"
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

          <button
            type="button"
            className="md:hidden px-3 h-9 rounded border text-lg leading-none"
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

          // Diagonals: anything else present in dims
          const diagonals = Object.entries(dims)
            .filter(([lbl]) => !edgeSet.has(lbl))
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

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
                          className="inputCompact"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={value}
                          onChange={(e) => setDimension(label, e.target.value)}
                        />
                        <label className="flex items-center gap-2 text-xs">
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
                  </div>
                ))}
                {edges.length === 0 && (
                  <div className="text-xs opacity-60">No edges for this point count.</div>
                )}
              </div>

              <br></br>

              {/* Diagonals - grid */}
              {diagonals.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium opacity-70">Diagonals</h5>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-x-0 gap-y-3">
                    {diagonals.map(([label, value]) => (
                      <div key={label} className="space-y-1">
                        <label className="text-sm">{label}</label>
                        <input
                          className="inputCompact w-28"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={value}
                          onChange={(e) => setDimension(label, e.target.value)}
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
        <div className="col-span-3">Corner Fitting</div>
        <div className="col-span-3">Tensioning Hardware</div>
        <div className="col-span-2">Tension&nbsp;(mm)</div>
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
              className="inputCompact h-8 px-2 text-xs w-full col-span-2"
              type="number"
              min={0}
              step="any"
              inputMode="numeric"
              value={vals.height}
              onChange={(e) => setPointField(p, "height", e.target.value)}
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
