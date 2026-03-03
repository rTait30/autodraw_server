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
import { Button } from "../../UI";

import FabricSelector from "../../FabricSelector";
import { getBaseUrl } from "../../../utils/baseUrl.js";

import { DEFAULT_ATTRIBUTES, GENERAL_DEFAULTS } from "./constants";

const MAX_POINTS = 11;

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

// Display label generator (0 -> "A", 1 -> "B", etc.)
function getLabel(index) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[index % letters.length];
}

function getEdgeLabel(u, v) {
  return `${getLabel(u)}${getLabel(v)}`;
}

// ----------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------

const ColorSwatch = ({ color, fabricName, className = "w-full h-16 rounded mb-2" }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState('');

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setLoadedSrc('');
    if (!color?.name) return;

    const basePath = `/static/textures/${fabricName?.toLowerCase().replace(/\s+/g, '')}/${color.name?.toLowerCase().replace(/\s+/g, '')}`;
    const imageSrc = getBaseUrl(`${basePath}.webp`);
    const alternativeSrc = getBaseUrl(`${basePath}.jpg`);
    
    const img = new Image();
    let triedAlternative = false;

    img.onload = () => {
      setImageLoaded(true);
      setLoadedSrc(img.src);
    };
    img.onerror = () => {
      if (!triedAlternative && alternativeSrc) {
        triedAlternative = true;
        img.src = alternativeSrc;
      } else {
        setImageError(true);
      }
    };
    img.src = imageSrc;
  }, [fabricName, color?.name]);

  if (imageLoaded && !imageError) {
    return (
      <div
        className={`${className} bg-cover bg-center`}
        style={{ backgroundImage: `url(${loadedSrc})` }}
      />
    );
  }
  return (
    <div
      className={className}
      style={{ backgroundColor: color?.hex_value || '#ccc' }}
    />
  );
};

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

const FABRIC_OPTIONS = {
  ShadeCloth: ["Rainbow Z16", "Poly Fx", "Extreme 32", "Polyfab Xtra", "Tensitech 480", "Monotec 370", "DriZ"],
  PVC: ["Bochini", "Bochini Blockout", "Mehler FR580", "Ferrari 502S2", "Ferrari 502V3"]
};
const FOLD_SIDES = ["Standard", "Underside", "Topside"];
const CABLE_SIZE_OPTIONS = [4, 5, 6, 8];

const TENSION_HARDWARE_DEFAULTS = {
  "M8 Bowshackle": 50, "M10 Bowshackle": 50, "M12 Bowshackle": 50,
  "M8 Turnbuckle": 300, "M10 Turnbuckle": 350, "M12 Turnbuckle": 450,
  "M12 Togglebolt": 150, "Sailtrack Corner": 0
};

// ----------------------------------------------------------------------
// Project Form
// ----------------------------------------------------------------------
export function ProjectForm({ formRef, projectDataHydrate = {} }) {
  const [projectData, setProjectData] = useState({
    location: projectDataHydrate.location ?? ""
  });

  useImperativeHandle(
    formRef,
    () => ({ getValues: () => ({ project: projectData }) }),
    [projectData]
  );

  return (
      <TextInput
        label="Location" 
        value={projectData.location} 
        onChange={(val) => setProjectData(prev => ({ ...prev, location: val }))} 
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
}) {
  // Shared attribute hooks
  const { attributes, setAttributes, setAttr } = useProductAttribute({
    formRef,
    hydrate,
    defaults: DEFAULT_ATTRIBUTES
  });

  // Local state
  const [unit, setUnit] = useState("mm");
  const unitFactor = { mm: 1, cm: 10, m: 1000 }[unit];

  const [showFabricSelector, setShowFabricSelector] = useState(false);
  
  // Pending lists additions
  const [pendingTrace, setPendingTrace] = useState({ pointIndex: 0, length: "" });
  const [pendingUfc, setPendingUfc] = useState({ from: 0, to: 2, size: "", internalPocket: "standard", coatedCable: "no" });

  // Refs for navigation
  const heightRefs = useRef({}); // index -> ref
  const connRefs = useRef({});   // "u-v" -> ref

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

        return changed ? next : prev;
    });
  }, [attributes.points, attributes.dimensions, attributes.connections, setAttributes]);

  // Safe Accessors (use these in render to prevent crashes before Effect runs)
  const pointsList = Array.isArray(attributes.points) ? attributes.points : [];
  const connectionsList = Array.isArray(attributes.connections) ? attributes.connections : [];

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

  // Find value of connection between u and v
  const getConnectionValue = (u, v) => {
    const minI = Math.min(u, v);
    const maxI = Math.max(u, v);
    const conn = connectionsList.find(c => 
      (c.from === minI && c.to === maxI) || (c.from === maxI && c.to === minI)
    );
    return conn ? conn.value : "";
  };

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
      
      const nextPt = { ...pts[index], [field]: value };

      // Helpers logic
      if (field === "tensionHardware") {
        const hw = String(value || "").toLowerCase();
        let defaultCorner = nextPt.cornerFitting ?? CORNER_FITTING_OPTIONS[0];
        if (hw.includes("bowshackle") || hw.includes("turnbuckle")) defaultCorner = "Pro-Rig";
        else if (hw.includes("togglebolt")) defaultCorner = "Pro-Rig with Small Pipe";
        
        nextPt.tensionAllowance = TENSION_HARDWARE_DEFAULTS[value] ?? 50;
        nextPt.cornerFitting = defaultCorner;
      }

      pts[index] = nextPt;
      return { ...prev, points: pts };
    });
  };

  // SailTracks logic
  const toggleSailTrack = (u, v) => {
    setAttributes(prev => {
      const list = (prev.sailTracks || []).slice();
      // Store as object {from, to} or string? 
      // The previous version stored "AB". The backend expects list of strings or list of objs.
      // Let's store as objects {from, to} to match the new style, 
      // OR convert to "AB" if the backend *strictly* asks for it.
      // The current backend `calculations.py` doesn't use `sailTracks` for `_dist_xy`.
      // The report generation likely uses it. Let's assume the legacy "AB" is safer for now 
      // OR update to strings of labels.
      // User said "not even have a label". But for compatibility with `sailTracks` which might be used elsewhere...
      // I'll store it as `{ from: u, to: v }` objects if possible, but let's stick to list of edge indices?
      // Actually, let's stick to strings "0-1" or labels "AB"?
      // To follow instructions: "use location and not even have a label".
      // I'll store as `{from: u, to: v}`.
      
      const existsIdx = list.findIndex(x => 
        (x.from === u && x.to === v) || (x.from === v && x.to === u)
      );
      
      if (existsIdx >= 0) {
        list.splice(existsIdx, 1);
      } else {
        list.push({ from: Math.min(u,v), to: Math.max(u,v) });
      }
      return { ...prev, sailTracks: list };
    });
  };

  const isSailTrack = (u, v) => {
    return (attributes.sailTracks || []).some(x => 
      (x.from === u && x.to === v) || (x.from === v && x.to === u)
    );
  };

  // Point Count Effects
  useEffect(() => {
    setAttributes(prev => {
      // Wait for migration if points is not an array yet
      if (!Array.isArray(prev.points)) return prev;

      const target = clamp(prev.pointCount, 3, MAX_POINTS);
      const currentPts = prev.points;
      const currentConns = Array.isArray(prev.connections) ? prev.connections : [];
      
      if (currentPts.length === target) return prev;

      // Resize points
      const newPts = [];
      for (let i = 0; i < target; i++) {
        if (i < currentPts.length) {
          newPts.push(currentPts[i]);
        } else {
          // Defaults for new points
          newPts.push({
            height: "",
            tensionHardware: TENSION_HARDWARE_OPTIONS[0],
            tensionAllowance: 50,
            cornerFitting: CORNER_FITTING_OPTIONS[0],
            Structure: "Pole"
          });
        }
      }

      // Filter invalid connections
      const newConns = currentConns.filter(c => c.from < target && c.to < target);

      return { ...prev, pointCount: target, points: newPts, connections: newConns };
    });
  }, [attributes.pointCount, attributes.points]); // Depend on points to retry after migration


  // ------------------------------------------------
  // Geometry & Navigation
  // ------------------------------------------------

  const geometry = useMemo(() => {
    const N = Math.max(3, Number(attributes.pointCount) || 3);
    const edges = [];
    for (let i = 0; i < N; i++) {
      const u = i;
      const v = (i + 1) % N;
      edges.push({ u, v, value: getConnectionValue(u, v) });
    }

    // Diagonals
    const diags = [];
    const diagSet = new Set();
    // All possible diags
    for (let i = 0; i < N; i++) {
        for (let j = i + 2; j < N; j++) {
            if (i === 0 && j === N - 1) continue; // 0->N-1 is an edge
            diags.push({ u: i, v: j, value: getConnectionValue(i, j) });
            diagSet.add(`${i}-${j}`);
        }
    }

    // Calculate Mandatory
    const mandatoryKeys = new Set();
    if (N >= 4) {
      const maxK = Math.floor((N - 4) / 2);
      for (let k = 0; k <= maxK; k++) {
        const topL = k;
        const topR = k + 1;
        const botR = N - k - 2;
        const botL = N - k - 1;
        
        // Diagonals of the box/strip
        // topL-botR (cross diagonal)
        mandatoryKeys.add(`${Math.min(topL, botR)}-${Math.max(topL, botR)}`);
        // topR-botL (cross diagonal)
        mandatoryKeys.add(`${Math.min(topR, botL)}-${Math.max(topR, botL)}`);
        // Also include the four sides of the box as mandatory where they are not polygon edges
        // topL-botL (left vertical of the box)
        mandatoryKeys.add(`${Math.min(topL, botL)}-${Math.max(topL, botL)}`);
        // topR-botR (right vertical of the box)
        mandatoryKeys.add(`${Math.min(topR, botR)}-${Math.max(topR, botR)}`);
        // Note: some of these may correspond to polygon edges for small N; deduping is handled by using a Set.
      }
    }

    const mandatory = diags.filter(d => mandatoryKeys.has(`${Math.min(d.u,d.v)}-${Math.max(d.u,d.v)}`));
    const others = diags.filter(d => !mandatoryKeys.has(`${Math.min(d.u,d.v)}-${Math.max(d.u,d.v)}`));
    
    // Tip logic for odd points
    let tip = [];
    let optional = others;
    
    if (N >= 5 && N % 2 !== 0) {
        // Simple heuristic: Diagonals connecting directly to the 'tip' index
        const tipIdx = Math.floor(N / 2);
        tip = optional.filter(d => d.u === tipIdx || d.v === tipIdx);
        optional = optional.filter(d => d.u !== tipIdx && d.v !== tipIdx);
    }
    
    const perimeterMM = edges.reduce((sum, e) => sum + (Number(e.value) || 0), 0);

    return { N, edges, mandatory, tip, optional, perimeterMM };
  }, [attributes.pointCount, attributes.connections]);


  const fieldOrder = [
    ...geometry.edges.map(e => `edge-${e.u}-${e.v}`),
    ...geometry.mandatory.map(d => `diag-${d.u}-${d.v}`),
    ...geometry.tip.map(d => `diag-${d.u}-${d.v}`),
    ...geometry.optional.map(d => `diag-${d.u}-${d.v}`),
    ...Array.from({length: geometry.N}, (_, i) => `height-${i}`)
  ];

  const nav = useFormNavigation(fieldOrder);

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
      fabricCategory: mappedCategory,
      fabricType: fabric.name,
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
                   color={{ name: attributes.color_name || "Please select material", hex_value: "#ffffff" }} 
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
           
           <FormGrid columns={3}>
              <SelectInput label="Fabric Category" value={attributes.fabricCategory} onChange={(val) => setAttributes(p => ({...p, fabricCategory: val}))} options={["PVC", "ShadeCloth"]} />
              <SelectInput label="Fabric Type" value={attributes.fabricType} onChange={setAttr("fabricType")} options={FABRIC_OPTIONS[attributes.fabricCategory] || []} disabled={!attributes.fabricCategory} />
              <TextInput label="Colour" value={attributes.colour} onChange={setAttr("colour")} />
           </FormGrid>
           <FormGrid columns={2}>
              <SelectInput label="Cable Size" value={attributes.cableSize} onChange={setAttr("cableSize")} options={CABLE_SIZE_OPTIONS.map(s => ({label: `${s}mm`, value: s}))} />
              <SelectInput label="Hem Fold Side" value={attributes.foldSides} onChange={setAttr("foldSides")} options={FOLD_SIDES} />
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
           {geometry.edges.map(({u, v, value}) => (
              <div key={`edge-${u}-${v}`} className="flex flex-col">
                <NumberInput
                  nav={nav}
                  name={`edge-${u}-${v}`}
                  label={`Edge ${getEdgeLabel(u, v)} (${unit})`}
                  min={0}
                  value={toDisplay(value)}
                  onChange={val => updateConnection(u, v, fromDisplay(val))}
                />
                <div className="mt-1">
                  <CheckboxInput label="Sailtrack" checked={isSailTrack(u, v)} onChange={() => toggleSailTrack(u, v)} />
                </div>
              </div>
           ))}
        </FormGrid>
        <div className="mt-4 text-center text-sm font-medium text-gray-500">Perimeter: {geometry.perimeterMM}mm ({Math.round(geometry.perimeterMM/100)/10}m)</div>
      </FormSection>

      <FormSection title="Diagonal Dimensions">
         {geometry.mandatory.length > 0 && (
             <div className="mb-6">
                <h4 className="text-sm font-bold text-red-600 mb-2">Required</h4>
                <FormGrid columns={3}>
                   {geometry.mandatory.map(({u, v, value}) => (
                      <NumberInput 
                        key={`diag-${u}-${v}`} nav={nav} name={`diag-${u}-${v}`}
                        label={`${getEdgeLabel(u, v)} (${unit})`}
                        className="text-red border-red-400 focus:border-red-500"
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
                       <SelectInput label="Fitting" options={CORNER_FITTING_OPTIONS} value={pt.cornerFitting} onChange={v => updatePoint(i, "cornerFitting", v)} />
                       <SelectInput label="Hardware" options={TENSION_HARDWARE_OPTIONS} value={pt.tensionHardware} onChange={v => updatePoint(i, "tensionHardware", v)} />
                       <SelectInput label="Structure" options={["Pole","Wall","Roof"]} value={pt.Structure} onChange={v => updatePoint(i, "Structure", v)} />
                       <NumberInput label="Allowance" value={pt.tensionAllowance} onChange={v => updatePoint(i, "tensionAllowance", v)} />
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

      {showFabricSelector && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/50" onClick={() => setShowFabricSelector(false)}>
            <div className="bg-white p-4 rounded-xl shadow-xl w-full max-w-4xl max-h-full overflow-auto" onClick={e => e.stopPropagation()}>
               <FabricSelector 
                   mode="selector" 
                   onSelect={handleFabricSelect} 
                   onClose={() => setShowFabricSelector(false)} 
               />
            </div>
         </div>
      )}
    </div>
  );
}

export default ProductForm;
