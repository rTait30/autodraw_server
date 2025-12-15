import React, { useImperativeHandle, useState, useRef } from "react";

const FINISH_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Single 50mm Hem", value: "single_50" },
  { label: "Double 50mm Hem", value: "double_50" },
  { label: "Double 50mm Hem + 5mm Rope", value: "double_50_rope" },
  { label: "Keder", value: "keder" },
];

const EYELET_OPTIONS = [
  { label: "No Eyelets", value: "none" },
  { label: "SP4 (Small)", value: "sp4" },
  { label: "SP7 (Medium)", value: "sp7" },
  { label: "SP9 (Large)", value: "sp9" },
];

const DEFAULT_EDGE = { finish: "none", eyelet: "none", eyeletMode: "spacing", eyeletValue: 200 };

export const ATTRIBUTE_DEFAULTS = Object.freeze({
  width: 0,
  height: 0,
  edges: {
    top: { ...DEFAULT_EDGE },
    bottom: { ...DEFAULT_EDGE },
    left: { ...DEFAULT_EDGE },
    right: { ...DEFAULT_EDGE },
  }
});

function EdgeControl({ label, value, onChange, length }) {
  const handleFinishChange = (e) => {
    const newFinish = e.target.value;
    const updates = { finish: newFinish };
    
    // If Keder or None is selected, force eyelets to None
    if (newFinish === 'keder' || newFinish === 'none') {
      updates.eyelet = 'none';
    }
    
    onChange({ ...value, ...updates });
  };

  const handleEyeletChange = (e) => {
    onChange({ ...value, eyelet: e.target.value });
  };

  const handleModeChange = (e) => {
    onChange({ ...value, eyeletMode: e.target.value });
  };

  const handleValueChange = (e) => {
    onChange({ ...value, eyeletValue: parseFloat(e.target.value) || 0 });
  };

  // Only show eyelet dropdown if a Hem is selected
  const showEyelets = value.finish !== 'keder' && value.finish !== 'none';
  const showEyeletSettings = showEyelets && value.eyelet !== 'none';

  let infoText = "";
  if (showEyeletSettings && length > 0 && value.eyeletValue > 0) {
    if (value.eyeletMode === 'count') {
      const count = Math.max(2, Math.floor(value.eyeletValue));
      const spacing = length / (count - 1);
      infoText = `${count} eyelets @ ${spacing.toFixed(0)}mm`;
    } else {
      // spacing mode
      const targetSpacing = value.eyeletValue;
      const spaces = Math.ceil(length / targetSpacing);
      const count = spaces + 1;
      const actualSpacing = length / spaces;
      infoText = `${count} eyelets @ ${actualSpacing.toFixed(0)}mm`;
    }
  }

  return (
    <div className="flex flex-col gap-2 p-2 border rounded bg-gray-50 dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="font-medium w-16 text-sm">{label}</span>
        
        <select 
          className="p-1 border rounded flex-1 text-sm"
          value={value.finish}
          onChange={handleFinishChange}
        >
          {FINISH_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {showEyelets && (
          <select 
            className="p-1 border rounded w-24 text-sm"
            value={value.eyelet}
            onChange={handleEyeletChange}
          >
            {EYELET_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>

      {showEyeletSettings && (
        <div className="flex flex-col gap-1 mt-1 p-2 bg-gray-100 dark:bg-gray-700/50 rounded text-sm">
           <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Eyelet Layout</span>
           </div>
           <div className="flex flex-wrap items-center gap-2">
             <div className="flex flex-col">
                <label className="text-[10px] text-gray-500 mb-0.5">Mode</label>
                <select
                    className="p-1 border rounded text-sm w-32"
                    value={value.eyeletMode || 'spacing'}
                    onChange={handleModeChange}
                >
                    <option value="spacing">Max Spacing</option>
                    <option value="count">Fixed Count</option>
                </select>
             </div>

             <div className="flex flex-col">
                <label className="text-[10px] text-gray-500 mb-0.5">
                  {value.eyeletMode === 'count' ? 'Quantity' : 'Spacing (mm)'}
                </label>
                <input
                    type="number"
                    className="p-1 border rounded w-24 text-sm"
                    value={value.eyeletValue || 0}
                    onChange={handleValueChange}
                    placeholder={value.eyeletMode === 'count' ? "Qty" : "mm"}
                />
             </div>
              
              {infoText && (
                <div className="flex flex-col justify-end h-full pb-1">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 ml-1">
                    → {infoText}
                    </span>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}

export function ProductForm({ formRef, hydrate = {} }) {
  const [attributes, setAttributes] = useState({
    ...ATTRIBUTE_DEFAULTS,
    ...(hydrate ?? {}),
    // Ensure edges object exists and has all keys even if hydrate is partial
    edges: {
      top: { ...DEFAULT_EDGE, ...(hydrate?.edges?.top ?? {}) },
      bottom: { ...DEFAULT_EDGE, ...(hydrate?.edges?.bottom ?? {}) },
      left: { ...DEFAULT_EDGE, ...(hydrate?.edges?.left ?? {}) },
      right: { ...DEFAULT_EDGE, ...(hydrate?.edges?.right ?? {}) },
    }
  });

  const inputRefs = useRef([]);

  const setAttr = (key) => (value) =>
    setAttributes((prev) => ({ ...prev, [key]: value }));

  const setEdge = (edge) => (newValue) => {
    setAttributes(prev => ({
      ...prev,
      edges: {
        ...prev.edges,
        [edge]: newValue
      }
    }));
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  useImperativeHandle(
    formRef,
    () => ({
      getValues: () => ({
        attributes,
      }),
    }),
    [attributes]
  );

  return (
    <div className="flex flex-col gap-6 max-w-md">
      
      {/* Dimensions Section */}
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-1">Dimensions</h3>
        
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Width (mm)</label>
          <input
            ref={el => inputRefs.current[0] = el}
            type="number"
            className="p-2 border rounded"
            value={attributes.width}
            onChange={(e) => setAttr("width")(parseFloat(e.target.value) || 0)}
            onKeyDown={(e) => handleKeyDown(e, 0)}
          />
        </div>
        
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Height (mm)</label>
          <input
            ref={el => inputRefs.current[1] = el}
            type="number"
            className="p-2 border rounded"
            value={attributes.height}
            onChange={(e) => setAttr("height")(parseFloat(e.target.value) || 0)}
            onKeyDown={(e) => handleKeyDown(e, 1)}
          />
        </div>
      </div>

      {/* Edges Section */}
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-1">Edge Finishes</h3>
        <EdgeControl label="Top" value={attributes.edges.top} onChange={setEdge('top')} length={attributes.width} />
        <EdgeControl label="Bottom" value={attributes.edges.bottom} onChange={setEdge('bottom')} length={attributes.width} />
        <EdgeControl label="Left" value={attributes.edges.left} onChange={setEdge('left')} length={attributes.height} />
        <EdgeControl label="Right" value={attributes.edges.right} onChange={setEdge('right')} length={attributes.height} />
      </div>

    </div>
  );
}

export default ProductForm;
