import React, { useCallback, useEffect, useState, useMemo } from "react";
import { 
  deepNumberify,
  useProductAttribute, 
  useFormHandle,
  SelectInput, 
  TextInput, 
  NumberInput,
  CheckboxInput,
  useFormNavigation,
  FormSection,
  FormGrid
} from "../../FormUI";
import { Button } from "../../UI";

import FabricSelector, { ColorSwatch } from "../../FabricSelector";
import OverlayShell from "../../OverlayShell";

const MAX_POINTS = 11;
const DEFAULT_SAIL_TRACK_CUTOUT = 50;
const PVC_FABRIC_CATEGORY = "PVC";
const UNDERSIDE_FOLD_SIDE = "Underside";
export const PROJECT_DEFAULTS = Object.freeze({
  location: "",
});

const DEFAULT_POINT = Object.freeze({
  height: "",
  cornerFitting: "",
  tensionHardware: "",
  tensionAllowance: "",
  Structure: "",
});

export const ATTRIBUTE_DEFAULTS = Object.freeze({
  fabricCategory: "",
  fabricType: "",
  foldSides: "",
  exitPoint: "",
  logoPoint: null,
  cableSize: "",
  pointCount: 4,
  points: Array.from({ length: 4 }, () => ({ ...DEFAULT_POINT })),
  connections: [],
  sailTracks: [],
  edgeCutouts: [],
  traceCables: [],
  ufcs: [],
  fabric_id: null,
  fabric_name: "",
  color_id: null,
  color_name: "",
  color_hex: "",
  colour: "",
});

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function createDefaultPoint() {
  return { ...DEFAULT_POINT };
}

function buildValidationResult(errors) {
  return { valid: errors.length === 0, errors };
}

function isPvcFabricCategory(value) {
  return String(value ?? "").trim().toUpperCase() === PVC_FABRIC_CATEGORY;
}

function getNormalizedFoldSides(attributes) {
  return isPvcFabricCategory(attributes?.fabricCategory)
    ? UNDERSIDE_FOLD_SIDE
    : (attributes?.foldSides ?? "");
}

function isBlank(value) {
  return value === "" || value === undefined || value === null;
}

function getConnectionsList(attributes) {
  return Array.isArray(attributes?.connections) ? attributes.connections : [];
}

// Display label generator (0 -> "A", 1 -> "B", etc.)
function getLabel(index) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[index % letters.length];
}

function getPointIndex(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  if (/^[A-Z]$/i.test(raw)) {
    return raw.toUpperCase().charCodeAt(0) - 65;
  }

  return null;
}

function getEdgeLabel(u, v) {
  return `${getLabel(u)}${getLabel(v)}`;
}

function normalizeMeasurement(value, fallback = "") {
  if (value === "" || value === undefined || value === null) {
    return fallback;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : value;
}

function getSailTrackKey(u, v) {
  return `${Math.min(u, v)}-${Math.max(u, v)}`;
}

function areNormalizedEdgeListsEquivalent(current, normalized) {
  const currentList = Array.isArray(current) ? current : [];
  return JSON.stringify(currentList) === JSON.stringify(normalized);
}

function normalizeSailTrackEntry(entry) {
  let rawFrom;
  let rawTo;
  let rawFromSideCutout = DEFAULT_SAIL_TRACK_CUTOUT;
  let rawToSideCutout = DEFAULT_SAIL_TRACK_CUTOUT;
  let base = {};

  if (typeof entry === "string") {
    const trimmed = entry.trim();
    if (/^\d+\s*-\s*\d+$/.test(trimmed)) {
      const [fromPart, toPart] = trimmed.split("-");
      rawFrom = fromPart;
      rawTo = toPart;
    } else if (trimmed.length >= 2) {
      rawFrom = trimmed[0];
      rawTo = trimmed[1];
    }
  } else if (Array.isArray(entry)) {
    [rawFrom, rawTo] = entry;
  } else if (entry && typeof entry === "object") {
    const { from, to, fromSideCutout, toSideCutout, ...rest } = entry;
    base = rest;
    rawFrom = from;
    rawTo = to;
    rawFromSideCutout = fromSideCutout;
    rawToSideCutout = toSideCutout;
  }

  const originalFrom = getPointIndex(rawFrom);
  const originalTo = getPointIndex(rawTo);

  if (originalFrom === null || originalTo === null || originalFrom === originalTo) {
    return null;
  }

  const from = Math.min(originalFrom, originalTo);
  const to = Math.max(originalFrom, originalTo);
  const isReversed = originalFrom > originalTo;

  return {
    ...base,
    from,
    to,
    fromSideCutout: normalizeMeasurement(isReversed ? rawToSideCutout : rawFromSideCutout, DEFAULT_SAIL_TRACK_CUTOUT),
    toSideCutout: normalizeMeasurement(isReversed ? rawFromSideCutout : rawToSideCutout, DEFAULT_SAIL_TRACK_CUTOUT),
  };
}

function normalizeSailTracks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeSailTrackEntry).filter(Boolean);
}

function normalizeEdgeCutoutEntry(entry) {
  let rawFrom;
  let rawTo;
  let rawFromCutout = "";
  let rawToCutout = "";
  let rawCutoutWidth = "";
  let rawCutoutProjection = "";
  let base = {};

  if (typeof entry === "string") {
    const trimmed = entry.trim();
    if (/^\d+\s*-\s*\d+$/.test(trimmed)) {
      const [fromPart, toPart] = trimmed.split("-");
      rawFrom = fromPart;
      rawTo = toPart;
    } else if (trimmed.length >= 2) {
      rawFrom = trimmed[0];
      rawTo = trimmed[1];
    }
  } else if (Array.isArray(entry)) {
    [rawFrom, rawTo] = entry;
  } else if (entry && typeof entry === "object") {
    const {
      from,
      to,
      fromCutout,
      toCutout,
      cutoutWidth,
      cutoutProjection,
      ...rest
    } = entry;
    base = rest;
    rawFrom = from;
    rawTo = to;
    rawFromCutout = fromCutout;
    rawToCutout = toCutout;
    rawCutoutWidth = cutoutWidth;
    rawCutoutProjection = cutoutProjection;
  }

  const originalFrom = getPointIndex(rawFrom);
  const originalTo = getPointIndex(rawTo);

  if (originalFrom === null || originalTo === null || originalFrom === originalTo) {
    return null;
  }

  const from = Math.min(originalFrom, originalTo);
  const to = Math.max(originalFrom, originalTo);
  const isReversed = originalFrom > originalTo;

  return {
    ...base,
    from,
    to,
    fromCutout: normalizeMeasurement(isReversed ? rawToCutout : rawFromCutout),
    toCutout: normalizeMeasurement(isReversed ? rawFromCutout : rawToCutout),
    cutoutWidth: normalizeMeasurement(rawCutoutWidth),
    cutoutProjection: normalizeMeasurement(rawCutoutProjection),
  };
}

function normalizeEdgeCutouts(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeEdgeCutoutEntry).filter(Boolean);
}

function filterEdgeCutoutsToSailTracks(edgeCutouts, sailTracks) {
  if (!Array.isArray(edgeCutouts) || edgeCutouts.length === 0) {
    return [];
  }

  const sailTrackKeys = new Set(
    (Array.isArray(sailTracks) ? sailTracks : []).map((track) => getSailTrackKey(track.from, track.to))
  );

  return edgeCutouts.filter((cutout) => sailTrackKeys.has(getSailTrackKey(cutout.from, cutout.to)));
}

function findSailTrackIndex(sailTracks, u, v) {
  const key = getSailTrackKey(u, v);
  return sailTracks.findIndex((track) => getSailTrackKey(track.from, track.to) === key);
}

function getConnectionValue(connectionsList, u, v) {
  const minI = Math.min(u, v);
  const maxI = Math.max(u, v);
  const conn = connectionsList.find((connection) =>
    (connection.from === minI && connection.to === maxI) ||
    (connection.from === maxI && connection.to === minI)
  );
  return conn ? conn.value : "";
}

function buildGeometry(attributes) {
  const N = clamp(Number(attributes?.pointCount) || 3, 3, MAX_POINTS);
  const connectionsList = getConnectionsList(attributes);
  const edges = [];

  for (let i = 0; i < N; i++) {
    const u = i;
    const v = (i + 1) % N;
    edges.push({ u, v, value: getConnectionValue(connectionsList, u, v) });
  }

  const diags = [];
  for (let i = 0; i < N; i++) {
    for (let j = i + 2; j < N; j++) {
      if (i === 0 && j === N - 1) continue;
      diags.push({ u: i, v: j, value: getConnectionValue(connectionsList, i, j) });
    }
  }

  const mandatoryKeys = new Set();
  if (N >= 4) {
    const maxK = Math.floor((N - 4) / 2);
    for (let k = 0; k <= maxK; k++) {
      const topL = k;
      const topR = k + 1;
      const botR = N - k - 2;
      const botL = N - k - 1;

      mandatoryKeys.add(`${Math.min(topL, botR)}-${Math.max(topL, botR)}`);
      mandatoryKeys.add(`${Math.min(topR, botL)}-${Math.max(topR, botL)}`);
      mandatoryKeys.add(`${Math.min(topL, botL)}-${Math.max(topL, botL)}`);
      mandatoryKeys.add(`${Math.min(topR, botR)}-${Math.max(topR, botR)}`);
    }
  }

  const mandatory = diags.filter((diag) => mandatoryKeys.has(`${Math.min(diag.u, diag.v)}-${Math.max(diag.u, diag.v)}`));
  const others = diags.filter((diag) => !mandatoryKeys.has(`${Math.min(diag.u, diag.v)}-${Math.max(diag.u, diag.v)}`));

  let tip = [];
  let optional = others;

  if (N >= 5 && N % 2 !== 0) {
    const tipIdx = Math.floor(N / 2);
    tip = optional.filter((diag) => diag.u === tipIdx || diag.v === tipIdx);
    optional = optional.filter((diag) => diag.u !== tipIdx && diag.v !== tipIdx);
  }

  const perimeterMM = edges.reduce((sum, edge) => sum + (Number(edge.value) || 0), 0);

  return { N, edges, mandatory, tip, optional, perimeterMM };
}

function validateRequiredConnections(attributes, context = {}) {
  const errors = [];
  const isJob = context.orderType === "job";
  const geometry = buildGeometry(attributes);

  geometry.edges.forEach(({ u, v, value }) => {
    if (isBlank(value)) {
      errors.push({
        path: `attributes.connections.edge-${u}-${v}`,
        message: `Edge ${getEdgeLabel(u, v)} not filled`,
      });
    }
  });

  if (isJob) {
    geometry.mandatory.forEach(({ u, v, value }) => {
      if (isBlank(value)) {
        errors.push({
          path: `attributes.connections.diag-${u}-${v}`,
          message: `Required diagonal ${getEdgeLabel(u, v)} not filled`,
        });
      }
    });
  }

  return errors;
}

function validateProjectData(projectData, context = {}) {
  const errors = [];
  const isJob = context.orderType === "job";

  if (isJob && !String(projectData.location ?? "").trim()) {
    errors.push({ path: "project.location", message: "Location not filled" });
  }

  return buildValidationResult(errors);
}

function validateProductData(attributes, pointsList, context = {}, discrepancyChecker = false) {
  const errors = [];
  const isJob = context.orderType === "job";
  const sailTracks = normalizeSailTracks(attributes.sailTracks);
  const edgeCutouts = filterEdgeCutoutsToSailTracks(normalizeEdgeCutouts(attributes.edgeCutouts), sailTracks);
  const foldSides = getNormalizedFoldSides(attributes);

  errors.push(...validateRequiredConnections(attributes, context));

  if (!discrepancyChecker && !String(attributes.fabricCategory ?? "").trim()) {
    errors.push({ path: "attributes.fabricCategory", message: "Fabric category not filled" });
  }

  if (!discrepancyChecker && !String(attributes.fabricType ?? "").trim()) {
    errors.push({ path: "attributes.fabricType", message: "Fabric type not filled" });
  }

  if (isJob && !discrepancyChecker && !String(attributes.colour ?? "").trim()) {
    errors.push({ path: "attributes.colour", message: "Colour not filled" });
  }

  if (!discrepancyChecker && isBlank(attributes.cableSize)) {
    errors.push({ path: "attributes.cableSize", message: "Cable size not filled" });
  }

  if (!discrepancyChecker && !String(foldSides).trim()) {
    errors.push({ path: "attributes.foldSides", message: "Hem fold side not filled" });
  }

  if (!discrepancyChecker) {
    sailTracks.forEach((track, index) => {
      const edgeLabel = getEdgeLabel(track.from, track.to);

      if (isBlank(track.fromSideCutout)) {
        errors.push({
          path: `attributes.sailTracks.${index}.fromSideCutout`,
          message: `Cutout on ${getLabel(track.from)} side not filled for sailtrack ${edgeLabel}`,
        });
      }

      if (isBlank(track.toSideCutout)) {
        errors.push({
          path: `attributes.sailTracks.${index}.toSideCutout`,
          message: `Cutout on ${getLabel(track.to)} side not filled for sailtrack ${edgeLabel}`,
        });
      }
    });

    edgeCutouts.forEach((cutout, index) => {
      const edgeLabel = getEdgeLabel(cutout.from, cutout.to);

      if (isBlank(cutout.fromCutout)) {
        errors.push({
          path: `attributes.edgeCutouts.${index}.fromCutout`,
          message: `Distance to cutout edge from ${getLabel(cutout.from)} not filled for edge ${edgeLabel}`,
        });
      }

      if (isBlank(cutout.toCutout)) {
        errors.push({
          path: `attributes.edgeCutouts.${index}.toCutout`,
          message: `Distance to cutout edge from ${getLabel(cutout.to)} not filled for edge ${edgeLabel}`,
        });
      }

      if (isBlank(cutout.cutoutWidth)) {
        errors.push({
          path: `attributes.edgeCutouts.${index}.cutoutWidth`,
          message: `Cutout width not filled for edge ${edgeLabel}`,
        });
      }

      if (isBlank(cutout.cutoutProjection)) {
        errors.push({
          path: `attributes.edgeCutouts.${index}.cutoutProjection`,
          message: `Cutout projection not filled for edge ${edgeLabel}`,
        });
      }
    });
  }

  if (isJob && !discrepancyChecker) {
    pointsList.forEach((point, index) => {
      if (!String(point?.cornerFitting ?? "").trim()) {
        errors.push({
          path: `attributes.points.${index}.cornerFitting`,
          message: `Fitting not filled for point ${getLabel(index)}`,
        });
      }

      if (!String(point?.tensionHardware ?? "").trim()) {
        errors.push({
          path: `attributes.points.${index}.tensionHardware`,
          message: `Hardware not filled for point ${getLabel(index)}`,
        });
      }

      if (isBlank(point?.tensionAllowance)) {
        errors.push({
          path: `attributes.points.${index}.tensionAllowance`,
          message: `Allowance not filled for point ${getLabel(index)}`,
        });
      }
    });
  }

  return buildValidationResult(errors);
}

// ----------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------

const TENSION_HARDWARE_OPTIONS = [
  "M8 Bowshackle", "M10 Bowshackle", "M12 Bowshackle",
  "M8 Turnbuckle", "M10 Turnbuckle", "M12 Turnbuckle",
  "M12 Togglebolt", "Sailtrack Corner",
];

const CORNER_FITTING_OPTIONS = [
  "Pro-Rig", "Pro-Rig with Small Pipe", "Ezy Slide",
  "100mm Corner Plate", "100mm Corner Plate with Pipe",
  "150mm Corner Plate", "150mm Corner Plate with Pipe",
  "Sailtrack Corner"
];

const FOLD_SIDES = [UNDERSIDE_FOLD_SIDE, "Topside"];
const CABLE_SIZE_OPTIONS = [4, 5, 6, 8];

// ----------------------------------------------------------------------
// Project Form
// ----------------------------------------------------------------------
export function ProjectForm({ formRef, projectDataHydrate = {}, currentOrderType = "job" }) {
  const [projectData, setProjectData] = useState({
    ...PROJECT_DEFAULTS,
    ...(projectDataHydrate ?? {}),
  });
  const isJob = currentOrderType === "job";

  const getValues = useCallback(() => ({ project: projectData }), [projectData]);

  const validate = useCallback((context = {}) => validateProjectData(projectData, context), [projectData]);

  useFormHandle(formRef, { getValues, validate });

  return (

      <TextInput
        label="Location/Postcode" 
        value={projectData.location} 
        onChange={(val) => setProjectData(prev => ({ ...prev, location: val }))} 
        mandatory={isJob}
        placeholder="Enter location..."
      />
  );
}

// ----------------------------------------------------------------------
// Product Form
// ----------------------------------------------------------------------
export function ProductForm({
  formRef,
  hydrate = {},
  discrepancyChecker = false,
  currentOrderType = "job",
}) {
  const isJob = currentOrderType === "job";

  // Shared attribute hooks
  const { attributes, setAttributes, setAttr } = useProductAttribute({
    hydrate,
    defaults: ATTRIBUTE_DEFAULTS
  });
  const isPvcFabric = isPvcFabricCategory(attributes.fabricCategory);
  const foldSidesValue = getNormalizedFoldSides(attributes);

  // Local state
  const [unit, setUnit] = useState("mm");
  const unitFactor = { mm: 1, cm: 10, m: 1000 }[unit];

  const [showFabricSelector, setShowFabricSelector] = useState(false);
  
  // Pending lists additions
  const [pendingTrace, setPendingTrace] = useState({ pointIndex: 0, length: "" });
  const [pendingUfc, setPendingUfc] = useState({ from: 0, to: 2, size: "", internalPocket: "standard", coatedCable: "no" });

  // ------------------------------------------------
  // Migration & Safety
  // ------------------------------------------------
  useEffect(() => {
    setAttributes(prev => {
        let next = { ...prev };
        let changed = false;

        // 1. Points Migration: Object -> Array
        if (prev.points && !Array.isArray(prev.points)) {
            const count = Number(prev.pointCount) || 3;
            const newPoints = [];
            const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            for(let i=0; i<count; i++) {
                const label = letters[i];
                // Try to retrieve from dictionary by label, else empty object
                const ptData = prev.points[label] || {};
                newPoints.push(ptData);
            }
            next.points = newPoints;
            changed = true;
        }

        // 2. Dimensions Migration: "AB": 1000 -> connections: [{from:0, to:1, value: 1000}]
        // Only if connections is missing or empty, AND dimensions exists
        const safeConns = Array.isArray(prev.connections) ? prev.connections : [];
        if (safeConns.length === 0 && prev.dimensions && Object.keys(prev.dimensions).length > 0) {
           const newConns = [];
           const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
           
           Object.entries(prev.dimensions).forEach(([key, val]) => {
               if (key.length === 2) {
                   const u = letters.indexOf(key[0]);
                   const v = letters.indexOf(key[1]);
                   if (u !== -1 && v !== -1) {
                       newConns.push({ from: Math.min(u,v), to: Math.max(u,v), value: val });
                   }
               }
           });
           
           if (newConns.length > 0) {
               next.connections = newConns;
               // Clear old dimensions to prevent re-migration loop? 
               // Or keeps them for backward compat? Prefer cleaning up state.
               // next.dimensions = {}; 
               changed = true;
           }
        } else if (!Array.isArray(prev.connections)) {
            // Ensure it is at least an empty array
            next.connections = [];
            changed = true;
        }

        const normalizedSailTracks = normalizeSailTracks(prev.sailTracks);
        if (!areNormalizedEdgeListsEquivalent(prev.sailTracks, normalizedSailTracks)) {
          next.sailTracks = normalizedSailTracks;
          changed = true;
        }

        const normalizedEdgeCutouts = filterEdgeCutoutsToSailTracks(
          normalizeEdgeCutouts(prev.edgeCutouts),
          normalizedSailTracks
        );
        if (!areNormalizedEdgeListsEquivalent(prev.edgeCutouts, normalizedEdgeCutouts)) {
          next.edgeCutouts = normalizedEdgeCutouts;
          changed = true;
        }

        return changed ? next : prev;
    });
      }, [attributes.points, attributes.dimensions, attributes.connections, attributes.sailTracks, attributes.edgeCutouts, setAttributes]);

  useEffect(() => {
    if (!isPvcFabric || attributes.foldSides === UNDERSIDE_FOLD_SIDE) {
      return;
    }

    setAttributes((prev) => {
      if (!isPvcFabricCategory(prev.fabricCategory) || prev.foldSides === UNDERSIDE_FOLD_SIDE) {
        return prev;
      }

      return {
        ...prev,
        foldSides: UNDERSIDE_FOLD_SIDE,
      };
    });
  }, [attributes.foldSides, isPvcFabric, setAttributes]);

  // Safe Accessors (use these in render to prevent crashes before Effect runs)
  const pointsList = Array.isArray(attributes.points) ? attributes.points : [];

  // ------------------------------------------------
  // Data Access Helpers
  // ------------------------------------------------

  const toDisplay = (valMM) => {
    if (valMM === "" || valMM === undefined || valMM === null) return "";
    const num = Number(valMM);
    if (!Number.isFinite(num)) return "";
    return parseFloat((num / unitFactor).toFixed(4));
  };

  const fromDisplay = (valDisp) => {
    if (valDisp === "" || valDisp === undefined) return "";
    const num = Number(valDisp);
    if (!Number.isFinite(num)) return "";
    return num * unitFactor;
  };

  const sailTracksList = useMemo(() => normalizeSailTracks(attributes.sailTracks), [attributes.sailTracks]);
  const edgeCutoutsList = useMemo(
    () => filterEdgeCutoutsToSailTracks(normalizeEdgeCutouts(attributes.edgeCutouts), sailTracksList),
    [attributes.edgeCutouts, sailTracksList]
  );

  // Update connection value
  const updateConnection = (u, v, val) => {
    setAttributes(prev => {
      const minI = Math.min(u, v);
      const maxI = Math.max(u, v);
      // Ensure we have an array to work with
      const list = Array.isArray(prev.connections) ? prev.connections.slice() : [];
      
      const idx = list.findIndex(c => 
        (c.from === minI && c.to === maxI) || (c.from === maxI && c.to === minI)
      );
      
      if (idx >= 0) {
        if (val === "" || val === undefined) {
             list[idx] = { ...list[idx], value: "" }; 
        } else {
             list[idx] = { ...list[idx], value: val };
        }
      } else {
        if (val !== "" && val !== undefined) {
          list.push({ from: minI, to: maxI, value: val });
        }
      }
      return { ...prev, connections: list };
    });
  };

  // Point update
  const updatePoint = (index, field, value) => {
    setAttributes(prev => {
      // Ensure we have an array
      if (!Array.isArray(prev.points)) return prev; 
      
      const pts = [...prev.points];
      if (!pts[index]) return prev;

      pts[index] = { ...pts[index], [field]: value };
      return { ...prev, points: pts };
    });
  };

  // SailTracks logic
  const toggleSailTrack = (u, v) => {
    setAttributes(prev => {
      const sailTracks = normalizeSailTracks(prev.sailTracks);
      const edgeCutouts = normalizeEdgeCutouts(prev.edgeCutouts);
      const existsIdx = findSailTrackIndex(sailTracks, u, v);
      let nextSailTracks = sailTracks;
      
      if (existsIdx >= 0) {
        nextSailTracks = sailTracks.filter((_, index) => index !== existsIdx);
      } else {
        nextSailTracks = [
          ...sailTracks,
          {
          from: Math.min(u, v),
          to: Math.max(u, v),
          fromSideCutout: DEFAULT_SAIL_TRACK_CUTOUT,
          toSideCutout: DEFAULT_SAIL_TRACK_CUTOUT,
          },
        ];
      }

      return {
        ...prev,
        sailTracks: nextSailTracks,
        edgeCutouts: filterEdgeCutoutsToSailTracks(edgeCutouts, nextSailTracks),
      };
    });
  };

  const updateSailTrackSideCutout = (u, v, pointIndex, value) => {
    setAttributes(prev => {
      const list = normalizeSailTracks(prev.sailTracks);
      const trackIndex = findSailTrackIndex(list, u, v);

      if (trackIndex < 0) {
        return prev;
      }

      const track = list[trackIndex];
      const cutoutField = track.from === pointIndex ? "fromSideCutout" : "toSideCutout";
      list[trackIndex] = { ...track, [cutoutField]: value };

      return { ...prev, sailTracks: list };
    });
  };

  const toggleEdgeCutout = (u, v, enabled) => {
    setAttributes(prev => {
      const sailTracks = normalizeSailTracks(prev.sailTracks);
      if (findSailTrackIndex(sailTracks, u, v) < 0) {
        return prev;
      }

      const list = normalizeEdgeCutouts(prev.edgeCutouts);
      const cutoutIndex = findSailTrackIndex(list, u, v);

      if (cutoutIndex < 0) {
        if (!enabled) {
          return prev;
        }

        list.push({
          from: Math.min(u, v),
          to: Math.max(u, v),
          fromCutout: "",
          toCutout: "",
          cutoutWidth: "",
          cutoutProjection: "",
        });
        return { ...prev, edgeCutouts: list };
      }

      if (!enabled) {
        list.splice(cutoutIndex, 1);
        return { ...prev, edgeCutouts: list };
      }

      return prev;
    });
  };

  const updateEdgeCutoutField = (u, v, field, value) => {
    setAttributes(prev => {
      const list = normalizeEdgeCutouts(prev.edgeCutouts);
      const cutoutIndex = findSailTrackIndex(list, u, v);

      if (cutoutIndex < 0) {
        return prev;
      }

      list[cutoutIndex] = {
        ...list[cutoutIndex],
        [field]: value,
      };

      return { ...prev, edgeCutouts: list };
    });
  };

  const updateEdgeCutoutDistance = (u, v, pointIndex, value) => {
    setAttributes(prev => {
      const list = normalizeEdgeCutouts(prev.edgeCutouts);
      const cutoutIndex = findSailTrackIndex(list, u, v);

      if (cutoutIndex < 0) {
        return prev;
      }

      const cutout = list[cutoutIndex];
      const cutoutField = cutout.from === pointIndex ? "fromCutout" : "toCutout";
      list[cutoutIndex] = { ...cutout, [cutoutField]: value };

      return { ...prev, edgeCutouts: list };
    });
  };

  const getSailTrack = (u, v) => {
    const trackIndex = findSailTrackIndex(sailTracksList, u, v);
    return trackIndex >= 0 ? sailTracksList[trackIndex] : null;
  };

  const getSailTrackSideCutout = (track, pointIndex) => {
    if (!track) return "";
    if (track.from === pointIndex) return track.fromSideCutout;
    if (track.to === pointIndex) return track.toSideCutout;
    return "";
  };

  const getEdgeCutout = (u, v) => {
    const cutoutIndex = findSailTrackIndex(edgeCutoutsList, u, v);
    return cutoutIndex >= 0 ? edgeCutoutsList[cutoutIndex] : null;
  };

  const getEdgeCutoutDistance = (cutout, pointIndex) => {
    if (!cutout) return "";
    if (cutout.from === pointIndex) return cutout.fromCutout;
    if (cutout.to === pointIndex) return cutout.toCutout;
    return "";
  };

  // Point Count Effects
  useEffect(() => {
    setAttributes(prev => {
      // Wait for migration if points is not an array yet
      if (!Array.isArray(prev.points)) return prev;

      const target = clamp(prev.pointCount, 3, MAX_POINTS);
      const currentPts = prev.points;
      const currentConns = Array.isArray(prev.connections) ? prev.connections : [];
      const currentSailTracks = normalizeSailTracks(prev.sailTracks);
      const currentEdgeCutouts = normalizeEdgeCutouts(prev.edgeCutouts);
      const needsResize = currentPts.length !== target;

      // Resize points
      const newPts = [];
      for (let i = 0; i < target; i++) {
        if (i < currentPts.length) {
          newPts.push(currentPts[i]);
        } else {
          newPts.push(createDefaultPoint());
        }
      }

      // Filter invalid connections
      const newConns = currentConns.filter(c => c.from < target && c.to < target);
      const newSailTracks = currentSailTracks.filter(track => track.from < target && track.to < target);
      const resizedEdgeCutouts = currentEdgeCutouts.filter(cutout => cutout.from < target && cutout.to < target);
      const newEdgeCutouts = filterEdgeCutoutsToSailTracks(resizedEdgeCutouts, newSailTracks);

      if (
        !needsResize &&
        newConns.length === currentConns.length &&
        newSailTracks.length === currentSailTracks.length &&
        newEdgeCutouts.length === currentEdgeCutouts.length
      ) {
        return prev;
      }

      return {
        ...prev,
        pointCount: target,
        points: newPts,
        connections: newConns,
        sailTracks: newSailTracks,
        edgeCutouts: newEdgeCutouts,
      };
    });
  }, [attributes.pointCount, attributes.points]); // Depend on points to retry after migration


  // ------------------------------------------------
  // Geometry & Navigation
  // ------------------------------------------------

  const geometry = useMemo(() => buildGeometry(attributes), [attributes.pointCount, attributes.connections]);


  const fieldOrder = [
    ...geometry.edges.flatMap((edge) => {
      const names = [`edge-${edge.u}-${edge.v}`];
      const sailTrack = getSailTrack(edge.u, edge.v);
      const edgeCutout = getEdgeCutout(edge.u, edge.v);

      if (!discrepancyChecker && sailTrack) {
        names.push(`edge-sailtrack-cutout-${edge.u}-${edge.v}-${edge.u}`);
        names.push(`edge-sailtrack-cutout-${edge.u}-${edge.v}-${edge.v}`);
      }

      if (!discrepancyChecker && edgeCutout) {
        names.push(`edge-cutout-${edge.u}-${edge.v}-${edge.u}`);
        names.push(`edge-cutout-${edge.u}-${edge.v}-${edge.v}`);
        names.push(`edge-cutout-width-${edge.u}-${edge.v}`);
        names.push(`edge-cutout-projection-${edge.u}-${edge.v}`);
      }

      return names;
    }),
    ...geometry.mandatory.map(d => `diag-${d.u}-${d.v}`),
    ...geometry.tip.map(d => `diag-${d.u}-${d.v}`),
    ...geometry.optional.map(d => `diag-${d.u}-${d.v}`),
    ...Array.from({length: geometry.N}, (_, i) => `height-${i}`)
  ];

  const nav = useFormNavigation(fieldOrder);

  const getValues = useCallback(() => ({
    attributes: deepNumberify({
      ...attributes,
      foldSides: getNormalizedFoldSides(attributes),
    }),
  }), [attributes]);

  const validate = useCallback(
    (context = {}) => validateProductData(attributes, pointsList, context, discrepancyChecker),
    [attributes, discrepancyChecker, pointsList]
  );

  useFormHandle(formRef, { getValues, validate });

  // ------------------------------------------------
  // Handlers
  // ------------------------------------------------

  const handleFabricSelect = (selection) => {
    const { fabric, color } = selection;
    const categoryMapping = { 'Shade': 'ShadeCloth', 'PVC': 'PVC' };
    const mappedCategory = categoryMapping[fabric.category] || fabric.category;
    setAttributes(prev => ({
      ...prev,
      fabric_id: fabric.id,
      fabric_name: fabric.name,
      color_id: color.id,
      color_name: color.name,
      color_hex: color.hex_value,
      fabricCategory: mappedCategory,
      fabricType: fabric.name,
      foldSides: mappedCategory === PVC_FABRIC_CATEGORY ? UNDERSIDE_FOLD_SIDE : prev.foldSides,
      colour: color.name,
    }));
  };

  const addTraceCable = () => {
    const list = [...(attributes.traceCables || [])];
    list.push({ pointIndex: pendingTrace.pointIndex, length: fromDisplay(pendingTrace.length) });
    setAttributes(prev => ({ ...prev, traceCables: list }));
    setPendingTrace(s => ({ ...s, length: "" }));
  };

  const removeTraceCable = (i) => {
    const list = [...(attributes.traceCables || [])];
    list.splice(i, 1);
    setAttributes(prev => ({ ...prev, traceCables: list }));
  };

  const addUfc = () => {
    const list = [...(attributes.ufcs || [])];
    const size = Number(pendingUfc.size) || undefined;
    list.push({
      from: pendingUfc.from,
      to: pendingUfc.to,
      size,
      internalPocket: pendingUfc.internalPocket,
      coatedCable: (pendingUfc.coatedCable === "yes")
    });
    setAttributes(prev => ({ ...prev, ufcs: list }));
  };

  const removeUfc = (i) => {
    const list = [...(attributes.ufcs || [])];
    list.splice(i, 1);
    setAttributes(prev => ({ ...prev, ufcs: list }));
  };

  // Loop of letters for dropdowns
  const pointOptions = Array.from({length: geometry.N}, (_, i) => ({ label: getLabel(i), value: i }));

  // ------------------------------------------------
  // Render
  // ------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto">
      {/* SECTION 1: MAIN SPECS */}
      {!discrepancyChecker && (
        <FormSection title="Fabric & Cable Specifications">
           <div className="mb-4">
             <div className="text-left mb-2">Choose your fabric type and color</div>
             <div 
               onClick={() => setShowFabricSelector(true)}
               className="cursor-pointer border rounded-lg p-4 hover:shadow-sm transition-shadow bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 flex items-center justify-center gap-4"
             >
               <div className="w-20 h-20">
                 <ColorSwatch 
                     color={{
                       name: attributes.color_name || "Please select material",
                       hex_value: attributes.color_hex,
                     }} 
                   fabricName={attributes.fabric_name || "Please select material"} 
                   className="w-full h-full rounded"
                 />
               </div>
               <div className="text-center">
                 <div className="font-bold text-lg">{attributes.fabric_name} - {attributes.color_name}</div>
                 <div className="text-sm opacity-75">Click to change</div>
               </div>
             </div>
           </div>
           
           <FormGrid columns={2}>
              <SelectInput mandatory={true} label="Cable Size" value={attributes.cableSize} onChange={setAttr("cableSize")} options={[{ label: "-", value: "" }, ...CABLE_SIZE_OPTIONS.map(s => ({label: `${s}mm`, value: s}))]} />
              <SelectInput mandatory={true} label="Hem Fold Side" value={foldSidesValue} onChange={setAttr("foldSides")} options={[{ label: "-", value: "" }, ...FOLD_SIDES.map(side => ({ label: side, value: side }))]} disabled={isPvcFabric} title={isPvcFabric ? "PVC sails always use Underside fold side" : undefined} />
           </FormGrid>
        </FormSection>
      )}

      {/* SECTION 2: GEOMETRY SETUP */}
      <FormSection title="Geometry Configuration">
        <FormGrid columns={2}>
          <div className="flex flex-col">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5 ml-1">Points</label>
            <div className="flex items-center">
               <button type="button" className="w-12 h-12 bg-gray-200 rounded-l" onClick={() => setAttributes(p => ({...p, pointCount: Math.max(3, p.pointCount-1)}))}>-</button>
               <div className="flex-1 text-center border-t border-b border-gray-200 dark:border-gray-700 h-12 flex items-center justify-center font-bold bg-white dark:bg-gray-800">{attributes.pointCount}</div>
               <button type="button" className="w-12 h-12 bg-gray-200 rounded-r" onClick={() => setAttributes(p => ({...p, pointCount: Math.min(MAX_POINTS, p.pointCount+1)}))}>+</button>
            </div>
          </div>
        </FormGrid>
        {!discrepancyChecker && (
             <div className="flex gap-4 mt-4">
                <SelectInput label="Exit Point" value={attributes.exitPoint} onChange={v => setAttributes(p=>({...p, exitPoint: v}))} options={[{label: "Any", value: "" }, ...pointOptions]} />
                <SelectInput label="Logo Point" value={attributes.logoPoint} onChange={v => setAttributes(p=>({...p, logoPoint: v}))} options={[{label: "None", value: null }, ...pointOptions]} />
             </div>
        )}
      </FormSection>

      {/* SECTION 3: DIMENSIONS */}
      <FormSection title="Edge Dimensions">
        <FormGrid columns={geometry.edges.length > 4 ? 3 : 2}>
           {geometry.edges.map(({u, v, value}) => {
              const sailTrack = getSailTrack(u, v);
              const edgeCutout = getEdgeCutout(u, v);

              return (
              <div key={`edge-${u}-${v}`} className="flex flex-col">
                <NumberInput
                  nav={nav}
                  name={`edge-${u}-${v}`}
                  label={`Edge ${getEdgeLabel(u, v)} (${unit})`}
                  mandatory={true}
                  min={0}
                  value={toDisplay(value)}
                  onChange={val => updateConnection(u, v, fromDisplay(val))}
                />
                {!discrepancyChecker && (
                  <>
                    <div className="mt-1">
                      <CheckboxInput label="Sailtrack" checked={Boolean(sailTrack)} onChange={() => toggleSailTrack(u, v)} />
                    </div>
                    {sailTrack && (
                      <div className="mt-3 rounded-lg border border-gray-300 p-3">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Sailtrack Side Cutouts
                        </div>
                        <FormGrid columns={2}>
                          <NumberInput
                            nav={nav}
                            name={`edge-sailtrack-cutout-${u}-${v}-${u}`}
                            label={`Cutout on ${getLabel(u)} Side (${unit})`}
                            mandatory={true}
                            min={0}
                            value={toDisplay(getSailTrackSideCutout(sailTrack, u))}
                            onChange={(val) => updateSailTrackSideCutout(u, v, u, fromDisplay(val))}
                            wrapperClassName="mb-0"
                          />
                          <NumberInput
                            nav={nav}
                            name={`edge-sailtrack-cutout-${u}-${v}-${v}`}
                            label={`Cutout on ${getLabel(v)} Side (${unit})`}
                            mandatory={true}
                            min={0}
                            value={toDisplay(getSailTrackSideCutout(sailTrack, v))}
                            onChange={(val) => updateSailTrackSideCutout(u, v, v, fromDisplay(val))}
                            wrapperClassName="mb-0"
                          />
                        </FormGrid>
                        <div className="mt-3">
                          <CheckboxInput
                            label="Cutout"
                            checked={Boolean(edgeCutout)}
                            onChange={(checked) => toggleEdgeCutout(u, v, checked)}
                          />
                        </div>
                        {edgeCutout && (
                          <div className="mt-3 rounded-lg border border-gray-300 p-3">
                            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Cutout Dimensions
                            </div>
                            <FormGrid columns={2}>
                              <NumberInput
                                nav={nav}
                                name={`edge-cutout-${u}-${v}-${u}`}
                                label={`Distance to Cutout Edge from ${getLabel(u)} (${unit})`}
                                mandatory={true}
                                min={0}
                                value={toDisplay(getEdgeCutoutDistance(edgeCutout, u))}
                                onChange={(val) => updateEdgeCutoutDistance(u, v, u, fromDisplay(val))}
                                wrapperClassName="mb-0"
                              />
                              <NumberInput
                                nav={nav}
                                name={`edge-cutout-${u}-${v}-${v}`}
                                label={`Distance to Cutout Edge from ${getLabel(v)} (${unit})`}
                                mandatory={true}
                                min={0}
                                value={toDisplay(getEdgeCutoutDistance(edgeCutout, v))}
                                onChange={(val) => updateEdgeCutoutDistance(u, v, v, fromDisplay(val))}
                                wrapperClassName="mb-0"
                              />
                              <NumberInput
                                nav={nav}
                                name={`edge-cutout-width-${u}-${v}`}
                                label={`Width (${unit})`}
                                mandatory={true}
                                min={0}
                                value={toDisplay(edgeCutout.cutoutWidth)}
                                onChange={(val) => updateEdgeCutoutField(u, v, "cutoutWidth", fromDisplay(val))}
                                wrapperClassName="mb-0"
                              />
                              <NumberInput
                                nav={nav}
                                name={`edge-cutout-projection-${u}-${v}`}
                                label={`Projection (${unit})`}
                                mandatory={true}
                                min={0}
                                value={toDisplay(edgeCutout.cutoutProjection)}
                                onChange={(val) => updateEdgeCutoutField(u, v, "cutoutProjection", fromDisplay(val))}
                                wrapperClassName="mb-0"
                              />
                            </FormGrid>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
           )})}
        </FormGrid>
        <div className="mt-4 text-center text-sm font-medium text-gray-500">Perimeter: {geometry.perimeterMM}mm ({Math.round(geometry.perimeterMM/100)/10}m)</div>
      </FormSection>

      <FormSection title="Diagonal Dimensions">
         {geometry.mandatory.length > 0 && (
             <div className="mb-6">
                <FormGrid columns={3}>
                   {geometry.mandatory.map(({u, v, value}) => (
                      <NumberInput 
                        key={`diag-${u}-${v}`} nav={nav} name={`diag-${u}-${v}`}
                        label={`${getEdgeLabel(u, v)} (${unit})`}
                        mandatory={isJob}
                        className={isJob ? "text-red border-red-400 focus:border-red-500" : ""}
                        value={toDisplay(value)}
                        onChange={val => updateConnection(u, v, fromDisplay(val))}
                      />
                   ))}
                </FormGrid>
             </div>
         )}
         {(geometry.tip.length > 0) && (
             <div className="mb-6">
                <h4 className="text-sm font-bold text-blue-600 mb-2">Tip Check (One needed)</h4>
                <FormGrid columns={3}>
                   {geometry.tip.map(({u, v, value}) => (
                      <NumberInput 
                         key={`diag-${u}-${v}`} nav={nav} name={`diag-${u}-${v}`}
                         label={`${getEdgeLabel(u, v)} (${unit})`}
                         className="border-blue-300"
                         value={toDisplay(value)}
                         onChange={val => updateConnection(u, v, fromDisplay(val))}
                      />
                   ))}
                </FormGrid>
             </div>
         )}
         {geometry.optional.length > 0 && (
             <div>
                <h4 className="text-sm font-bold text-gray-400 mb-2">Optional</h4>
                <FormGrid columns={4}>
                   {geometry.optional.map(({u, v, value}) => (
                      <NumberInput 
                         key={`diag-${u}-${v}`} nav={nav} name={`diag-${u}-${v}`}
                         label={`${getEdgeLabel(u,v)} (${unit})`}
                         value={toDisplay(value)}
                         onChange={val => updateConnection(u, v, fromDisplay(val))}
                      />
                   ))}
                </FormGrid>
             </div>
         )}
      </FormSection>

      {/* SECTION 4: POINTS */}
      <FormSection title="Point Specs">
         <div className="flex flex-col space-y-2">
            {pointsList.map((pt, i) => (
               <div key={i} className="py-4 flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                  <div className="flex-none bg-blue-500/5 p-3 rounded lg:w-48 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold">{getLabel(i)}</div>
                     <NumberInput
                        nav={nav}
                        name={`height-${i}`}
                        label={`Height (${unit})`}
                        value={toDisplay(pt.height)}
                        onChange={val => updatePoint(i, "height", fromDisplay(val))}
                        min={0} step="any"
                        wrapperClassName="mb-0 flex-1"
                     />
                  </div>
                  {!discrepancyChecker && (
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                        <SelectInput mandatory={isJob} label="Fitting" options={[{ label: "-", value: "" }, ...CORNER_FITTING_OPTIONS.map(option => ({ label: option, value: option }))]} value={pt.cornerFitting} onChange={v => updatePoint(i, "cornerFitting", v)} />
                        <SelectInput mandatory={isJob} label="Hardware" options={[{ label: "-", value: "" }, ...TENSION_HARDWARE_OPTIONS.map(option => ({ label: option, value: option }))]} value={pt.tensionHardware} onChange={v => updatePoint(i, "tensionHardware", v)} />
                        <NumberInput mandatory={isJob} label="Allowance" value={pt.tensionAllowance} onChange={v => updatePoint(i, "tensionAllowance", v)} />
                        <SelectInput label="Structure" options={[{ label: "-", value: "" }, { label: "Pole", value: "Pole" }, { label: "Wall", value: "Wall" }, { label: "Roof", value: "Roof" }]} value={pt.Structure} onChange={v => updatePoint(i, "Structure", v)} />
                        
                    </div>
                  )}
               </div>
            ))}
         </div>
      </FormSection>

      {/* EXTRAS */}
      {!discrepancyChecker && (
        <details className="mt-8 pt-6 bg-white dark:bg-transparent">
           <summary className="font-bold text-xl cursor-pointer">Other (UFC's and Trace Cables)</summary>
           <div className="mt-4">
              <h4 className="font-bold">Trace Cables</h4>
              <div className="flex gap-2 items-end mb-2">
                 <SelectInput label="Point" value={pendingTrace.pointIndex} onChange={v => setPendingTrace(s => ({...s, pointIndex: Number(v)}))} options={pointOptions} />
                 <NumberInput label="Length" value={toDisplay(pendingTrace.length)} onChange={v => setPendingTrace(s => ({...s, length: fromDisplay(v)}))} />
                 <Button onClick={addTraceCable}>Add</Button>
              </div>
              {attributes.traceCables?.map((tc, k) => (
                  <div key={k} className="flex gap-4 items-center mb-1">
                     <span className="font-bold w-8">{getLabel(tc.pointIndex)}</span>
                     <span>{toDisplay(tc.length)}{unit}</span>
                     <button onClick={() => removeTraceCable(k)} className="text-red-500 text-sm">Remove</button>
                  </div>
              ))}

              <h4 className="font-bold mt-6">UFCs</h4>
              <div className="flex gap-2 items-end mb-2 flex-wrap">
                 <div className="w-32"><SelectInput label="From" value={pendingUfc.from} onChange={v => setPendingUfc(s => ({...s, from: Number(v)}))} options={pointOptions} /></div>
                 <div className="w-32"><SelectInput label="To" value={pendingUfc.to} onChange={v => setPendingUfc(s => ({...s, to: Number(v)}))} options={pointOptions} /></div>
                 <div className="w-24"><SelectInput label="Size" value={pendingUfc.size} onChange={v => setPendingUfc(s => ({...s, size: v}))} options={[{label:"Auto", value:""}, {label:"5mm", value:"5"}]} /></div>
                 <div className="w-32"><SelectInput label="Pocket" value={pendingUfc.internalPocket} onChange={v => setPendingUfc(s => ({...s, internalPocket: v}))} options={[{label:"Std", value:"standard"}, {label:"No", value:"no"}]} /></div>
                 <Button onClick={addUfc}>Add</Button>
              </div>
              {attributes.ufcs?.map((u, k) => (
                  <div key={k} className="flex gap-4 items-center mb-1">
                     <span className="font-bold">{getEdgeLabel(u.from, u.to)}</span>
                     <span>{u.size || "Auto"}mm</span>
                     <button onClick={() => removeUfc(k)} className="text-red-500 text-sm">Remove</button>
                  </div>
              ))}
           </div>
        </details>
      )}

      <OverlayShell
        open={showFabricSelector}
        onClose={() => setShowFabricSelector(false)}
        panelClassName="max-w-4xl"
        showCloseButton={true}
      >
        <div className="p-4">
          <FabricSelector
            mode="selector"
            onSelect={handleFabricSelect}
            onClose={() => setShowFabricSelector(false)}
          />
        </div>
      </OverlayShell>
    </div>
  );
}

export default ProductForm;



// Eventually migrate to this structure
/*
{
  "project_info": {
    "id": 74,
    "name": "Murphy st",
    "client": { "id": 150, "name": "gt" },
    "meta": { "tenant": "Copelands", "status": "awaiting_deposit" }
  },
  "products": [
    {
      "id": 166,
      "index": 0,
      "name": "Left sail",
      "specification": {
        "fabric": { "id": 10, "name": "Bochini Blockout", "color": "Champagne" },
        "hardware": { "cable_size_mm": 4, "edge_meter": 20 }
      },
      "topology": {
        "points": {
          "A": { "structure": "Pole", "base_height": 2600, "hardware": "M8 Bowshackle" },
          "B": { "structure": "Pole", "base_height": 3500, "hardware": "M8 Bowshackle" },
          "C": { "structure": "Pole", "base_height": 2600, "hardware": "M8 Bowshackle" },
          "D": { "structure": "Pole", "base_height": 2100, "hardware": "M8 Turnbuckle" },
          "E": { "structure": "Pole", "base_height": 1800, "hardware": "M8 Turnbuckle" }
        },
        "edges": {
          "AB": { "type": "perimeter", "measured": 1840, "blame": 0 },
          "BC": { "type": "perimeter", "measured": 1670, "blame": 0 },
          "CD": { "type": "perimeter", "measured": 6230, "blame": 0 },
          "DE": { "type": "perimeter", "measured": 3750, "blame": 0 },
          "EA": { "type": "perimeter", "measured": 6190, "blame": 0 },
          "AC": { "type": "diagonal", "measured": 3060, "blame": 0 },
          "BD": { "type": "diagonal", "measured": 6710, "blame": 0 }
        }
      },
      "validation": {
        "max_discrepancy": 33.29,
        "is_problematic": false,
        "cells": [
          { "id": "Box_1", "points": ["A", "B", "C", "D"], "error": 33.29 }
        ]
      },
      "geometry_layers": {
        "primary_solve": {
          "A": { "x": 0.0, "y": 0.0, "z": 2600.0 },
          "B": { "x": 1604.8, "y": 0.0, "z": 3500.0 },
          "C": { "x": 3009.7, "y": -71.3, "z": 2600.0 },
          "D": { "x": 3593.5, "y": -6253.7, "z": 2100.0 },
          "E": { "x": -142.5, "y": -6136.4, "z": 1800.0 }
        },
        "workpoint_bisect": {
          "A": { "x": 31.3, "y": -36.6, "z": 2613.2 },
          "B": { "x": 1600.3, "y": -6.2, "z": 3350.1 }
        },
        "workpoint_planar": {
          "A": { "x": 34.8, "y": -35.7, "z": 2597.1 },
          "B": { "x": 1601.2, "y": -141.9, "z": 3451.7 }
        }
      }
    }
  ]
} */
