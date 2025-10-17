import React, { useEffect, useState } from "react";
import { GeneralSection } from "../GeneralSection";

const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: "winlloyd",
  due_date: "",
  info: "",
});

const MAX_POINTS = 11;
const FIXING_TYPES = ["M8 Bowshackle", "M10 Bowshackle", "M12 Bowshackle", "Turnbuckle"];

// Default attributes (used as base, then merged with attributesHydrate)
const DEFAULT_ATTRIBUTES = Object.freeze({
  exitPoint: "A",
  fabricCategory: "ShadeCloth",
  fabricType: "Rainbow Z16",
  foldSide: "underside",
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
    A: { height: 5, fixingType: "M8 Bowshackle", tensionAllowance: 50 },
    B: { height: 5, fixingType: "M8 Bowshackle", tensionAllowance: 50 },
    C: { height: 5, fixingType: "M8 Bowshackle", tensionAllowance: 50 },
    D: { height: 5, fixingType: "M8 Bowshackle", tensionAllowance: 50 },
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
          fixingType: old.fixingType ?? FIXING_TYPES[0],
          tensionAllowance: old.tensionAllowance ?? 50,
        };
      });

      return { ...prev, pointCount: n, dimensions, points };
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
    setAttributes((prev) => ({
      ...prev,
      points: {
        ...prev.points,
        [p]: { ...prev.points[p], [key]: key === "fixingType" ? value : value },
      },
    }));

  return (
    <div className="p-3 space-y-3">
      {discrepancyChecker === false && (
      
        <GeneralSection data={generalData} setData={setGeneralData} />

      )}

      {/* Fabric Category (minimal) */}
      <section className="space-y-2">
        <label className="block text-sm font-medium">Fabric Category</label>
        <select
          className="inputCompact"
          value={attributes.fabricCategory ?? ""}
          onChange={(e) =>
            setAttributes((prev) => ({ ...prev, fabricCategory: e.target.value }))
          }
        >
          <option value="">Select...</option>
          <option value="PVC">PVC</option>
          <option value="ShadeCloth">ShadeCloth</option>
        </select>
      </section>

      {/* Point count */}
      <section className="space-y-2">
        <label className="block text-sm font-medium">Points</label>
        <input
          className="inputCompact"
          type="number"
          min={1}
          max={MAX_POINTS}
          value={attributes.pointCount}
          onChange={(e) => setCount(e.target.value)}
        />
      </section>

      {/* Dimensions (Edges first, then Diagonals) */}
      <section className="space-y-3">
        <h4 className="headingStyle">Dimensions</h4>

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
              <div className="space-y-2">
                <h5 className="text-sm font-medium opacity-70">Edges</h5>
                {edges.map(([label, value]) => (
                  <div key={label} className="space-y-1">
                    <label className="text-sm">{label}</label>
                    <input
                      className="inputCompact"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={value}
                      onChange={(e) => setDimension(label, e.target.value)}
                    />
                  </div>
                ))}
                {edges.length === 0 && (
                  <div className="text-xs opacity-60">No edges for this point count.</div>
                )}
              </div>

              {/* Diagonals - grid */}
              {diagonals.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium opacity-70">Diagonals</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-0.5 gap-y-3">
                    {diagonals.map(([label, value]) => (
                      <div key={label} className="space-y-1">
                        <label className="text-sm">{label}</label>
                        <input
                          className="inputCompact"
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
  <h4 className="headingStyle">Points</h4>

  {/* Compact header — visible on all screen sizes */}
  <div className="grid grid-cols-12 text-[11px] font-medium opacity-70 mb-1">
    <div className="col-span-2">Pt</div>
    <div className="col-span-4">Height&nbsp;(m)</div>
    {!discrepancyChecker && (
      <>
        <div className="col-span-3">Fixing</div>
        <div className="col-span-3">Tension&nbsp;(mm)</div>
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
        <div className="col-span-2 text-[11px] opacity-80">{p}</div>

        {/* Height */}
        <input
          className="inputCompact h-8 px-2 text-xs w-full col-span-4"
          type="number"
          min={0}
          step="any"
          inputMode="numeric"
          value={vals.height}
          onChange={(e) => setPointField(p, "height", e.target.value)}
        />

        {/* Only show Fixing + Tension if discrepancyChecker === false */}
        {!discrepancyChecker && (
          <>
            <select
              className="inputCompact h-8 px-1 text-[11px] w-full col-span-3 truncate"
              value={vals.fixingType}
              onChange={(e) => setPointField(p, "fixingType", e.target.value)}
            >
              {FIXING_TYPES.map((ft) => (
                <option key={ft} value={ft}>
                  {ft}
                </option>
              ))}
            </select>

            <input
              className="inputCompact h-8 px-2 text-xs w-full col-span-3"
              type="number"
              min={0}
              step="any"
              inputMode="numeric"
              value={vals.tensionAllowance}
              onChange={(e) => setPointField(p, "tensionAllowance", e.target.value)}
            />
          </>
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
