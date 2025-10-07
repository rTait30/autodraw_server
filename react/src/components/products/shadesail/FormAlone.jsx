import React, { useEffect, useState } from "react";
import { GeneralSection } from "../GeneralSection";

const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: "winlloyd",
  due_date: "",
  info: "",
});

const MAX_POINTS = 11;

export default function SailForm({ formRef, generalDataHydrate = {} }) {
  const [generalData, setGeneralData] = useState(() => ({
    ...GENERAL_DEFAULTS,
    ...(generalDataHydrate ?? {}),
  }));

  // --- Attributes ---
  const [attributes, setAttributes] = useState(() => ({
    count: 4,
    dimensions: {
      edges: { AB: "", BC: "", CD: "", DA: "" },
      diagonals: {},
    },
  }));

  // Rebuild edges + diagonals when count changes; keep any existing values
  useEffect(() => {
    setAttributes((prev) => {
      const n = clamp(prev.count, 1, MAX_POINTS);
      const edgeLabels = makeEdgeLabels(n);
      const diagLabels = makeDiagonalLabels(n);

      const nextEdges = {};
      edgeLabels.forEach((lbl) => {
        nextEdges[lbl] = prev.dimensions.edges?.[lbl] ?? "";
      });

      const nextDiags = {};
      diagLabels.forEach((lbl) => {
        nextDiags[lbl] = prev.dimensions.diagonals?.[lbl] ?? "";
      });

      return {
        ...prev,
        count: n,
        dimensions: { edges: nextEdges, diagonals: nextDiags },
      };
    });
  }, [attributes.count]);

  // Simple setters
  const setCount = (next) =>
    setAttributes((prev) => ({
      ...prev,
      count: clamp(Number(next) || 1, 1, MAX_POINTS),
    }));

  const setEdge = (label, value) =>
    setAttributes((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        edges: { ...prev.dimensions.edges, [label]: value },
      },
    }));

  const setDiagonal = (label, value) =>
    setAttributes((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        diagonals: { ...prev.dimensions.diagonals, [label]: value },
      },
    }));

  // Expose only getValues (React 19: ref as a prop, no forwardRef)
  useEffect(() => {
    if (!formRef) return;
    formRef.current = {
      getValues: () => ({
        general: generalData,
        attributes,
        calculated: {},
      }),
    };
    return () => {
      if (formRef) formRef.current = null;
    };
  }, [formRef, generalData, attributes]);

  // --- UI ---
  return (
    <div className="p-3 space-y-3">
      <GeneralSection data={generalData} setData={setGeneralData} />

      <section className="space-y-2">
        <label className="block text-sm font-medium">
          Points
        </label>
        <input
          className="inputCompact"
          type="number"
          min={1}
          max={MAX_POINTS}
          value={attributes.count}
          onChange={(e) => setCount(e.target.value)}
        />
      </section>

      <section className="space-y-3">
        <h4 className="headingStyle">Edges</h4>

        {/* vertical spacing between each input group */}
        <div className="space-y-2">
          {Object.entries(attributes.dimensions.edges).map(([label, value]) => (
            <div key={label} className="space-y-1">
              <label className="text-sm">{label} </label>
              <input
                className="inputCompact"
                type="number"
                min={0}
                inputMode="numeric"
                value={value}
                onChange={(e) => setEdge(label, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      {attributes.count > 3 && (
        <section className="space-y-3">
          <h4 className="headingStyle">Diagonals</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-0.5 gap-y-3">
            {Object.entries(attributes.dimensions.diagonals).map(([label, value]) => (
              <div key={label} className="space-y-1">
                <label className="text-sm">{label} </label>
                <input
                  className="inputCompact"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setDiagonal(label, e.target.value)}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

// A, B, C, ... (we cap at 11 => up to K)
function makeVertexLabels(n) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: n }, (_, i) => letters[i % letters.length]);
}

// Sequential edges: AB, BC, ..., (last)A
function makeEdgeLabels(n) {
  const v = makeVertexLabels(n);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = v[i];
    const b = v[(i + 1) % n];
    out.push(`${a}${b}`);
  }
  return out;
}

// All non-adjacent pairs (i < j), excluding edges and the wrap-around edge
// For n<3 there are no diagonals
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
