
/*
export default {
  default: [
    {
      fields: [
          { "name": "length", "label": "Length", "type": "number", "min": 0, "default": 1000 },
          { "name": "width", "label": "Width", "type": "number", "min": 0, "default": 1000 },
          { "name": "height", "label": "Height", "type": "number", "min": 0, "default": 1000 },
          { "name": "quantity", "label": "Quantity", "type": "number", "min": 1, "step": 1, "default": 1 },
          { "name": "hem", "label": "Hem", "type": "number", "min": 0, "default": 0 },
          { "name": "seam", "label": "Seam", "type": "number", "min": 0, "default": 20 },
          
          
          { "name": "zips", "label": "Include Zips", "type": "checkbox", "default": true },
          { "name": "stayputs", "label": "Include Stayputs", "type": "checkbox", "default": false },
          {
            "name": "fabricWidth",
            "label": "Fabric Width",
            "type": "number",
            "min": 0,
            "default": 1320
          },
          { "name": "foldType", "label": "Fold Type", "type": "select", "options": [ { "label": "Up and Over", "value": "upover" }, { "label": "Individual", "value": "individual" }, { "label": "Sides", "value": "sides" } ], "default": "none" }
        
      ]
    }
  ]
}
*/


import React, { useImperativeHandle, useState } from "react";

export const PROJECT_DEFAULTS = Object.freeze({
  medical: false,
});

export function ProjectForm({ formRef, projectDataHydrate = {} }) {
  const [projectData, setProjectData] = useState({
    ...PROJECT_DEFAULTS,
    ...(projectDataHydrate ?? {}),
  });

  useImperativeHandle(
    formRef,
    () => ({
      getValues: () => ({
        project: projectData,
      }),
    }), 
    [projectData]
  );

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Medical </label>
      <input
        type="checkbox"
        checked={projectData.medical}
        onChange={e => setProjectData(prev => ({ ...prev, medical: e.target.checked }))}
      />
      
    </div>
  );
}

export const ATTRIBUTE_DEFAULTS = Object.freeze({
  label: "",
  length: 1000,
  width: 1000,
  height: 1000,
  quantity: 1,
  hem: 0,
  seam: 20,
  zips: true,
  stayputs: false,
  fabricWidth: 1320,
  fabricRollLength: 30000,
});

export function ProductForm({ formRef, hydrate = {} }) {
  // Single attributes object
  const [attributes, setAttributes] = useState({
    ...ATTRIBUTE_DEFAULTS,
    ...(hydrate ?? {}),
  });

  const setAttr = (key) => (value) =>
    setAttributes((prev) => ({ ...prev, [key]: value }));

  useImperativeHandle(
    formRef,
    () => ({
      getValues: () => ({
        attributes,
      }),
    }),
    [attributes]
  );

  let role = localStorage.getItem("role");

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Length (mm)</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"
        value={attributes.length ?? ""}
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber;
          setAttr("length")(Number.isNaN(v) ? null : v);
        }}
      />

      <label className="block text-sm font-medium mb-1">Width (mm)</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"
        value={attributes.width ?? ""}
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber;
          setAttr("width")(Number.isNaN(v) ? null : v);
        }}
      />

      <label className="block text-sm font-medium mb-1">Height (mm)</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"
        value={attributes.height ?? ""}
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber;
          setAttr("height")(Number.isNaN(v) ? null : v);
        }}
      />

      <label className="block text-sm font-medium mb-1">Quantity</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"
        value={attributes.quantity ?? ""}
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber;
          setAttr("quantity")(Number.isNaN(v) ? null : v);
        }}
      />

      <label className="block text-sm font-medium mb-1">Hem (mm)</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"
        value={attributes.hem ?? ""}
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber;
          setAttr("hem")(Number.isNaN(v) ? null : v);
        }}
      />

      <label className="block text-sm font-medium mb-1">Seam (mm)</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"
        value={attributes.seam ?? ""}
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber;
          setAttr("seam")(Number.isNaN(v) ? null : v);
        }}
      />

      <div className="flex items-center space-x-6 mt-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={attributes.zips}
            onChange={(e) => setAttr("zips")(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Zips</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={attributes.stayputs}
            onChange={(e) => setAttr("stayputs")(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Stayputs</span>
        </label>
      </div>

      {(role === "admin" || role === "estimator" || role === "designer") && (

      <>

      <label className="block text-sm font-medium mb-1 mt-2"> Fabric Width (mm) </label>
        <input
          className="inputCompact"
          type="number"
          value={attributes.fabricWidth}
          onChange={(e) => setAttr("fabricWidth")(e.target.value)}
          inputMode="numeric"
        />

        <label className="block text-sm font-medium mb-1 mt-2"> Fabric Roll Length (mm) </label>
        <input
          className="inputCompact"
          type="number"
          value={attributes.fabricRollLength}
          onChange={(e) => setAttr("fabricRollLength")(e.target.value)}
          inputMode="numeric"
        />
      </>
      )}
    </div>
  );
}

export default ProductForm;
