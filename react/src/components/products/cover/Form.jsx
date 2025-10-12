
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

import React, { useEffect, useImperativeHandle, useState } from "react";

import { GeneralSection } from "../GeneralSection";

const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: "winlloyd",
  due_date: "",
  info: "",
});

export default function CoverForm({ formRef, generalDataHydrate = {}}) {

  const [generalData, setGeneralData] = useState(() => ({
    ...GENERAL_DEFAULTS,
    ...(generalDataHydrate ?? {}),
  }));


  const [name, setName] = useState("");

  // Single attributes object
  const [attributes, setAttributes] = useState({
    length: 1000,
    width: 1000,
    height: 1000,
    quantity: 1,
    hem: 0,
    seam: 0,
    zips: true,
    stayputs: false,
    fabricWidth: 1320,
  });

  const [calculations, setCalculations] = useState({
    volume: 0
  })

  const setAttr = (key) => (value) =>
    setAttributes((prev) => ({ ...prev, [key]: value }));

  useImperativeHandle(
    formRef,
    () => ({
      getValues: () => ({
        general: generalData,
        attributes,
      }),
    }),
    [generalData, attributes]
  );

  return (
    <div>
      <GeneralSection data={generalData} setData={setGeneralData} />
      <br></br>
      <h3 className = "headingStyle">Attributes</h3>

      <label className="block text-sm font-medium mb-1">Length (mm)</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"              // or "1" for integers
        value={attributes.length ?? ""}          // show blank if null
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber; // NaN when empty/invalid
          setAttr("length")(Number.isNaN(v) ? null : v);
        }}
      />

      <label className="block text-sm font-medium mb-1">Width (mm)</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"              // or "1" for integers
        value={attributes.width ?? ""}          // show blank if null
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber; // NaN when empty/invalid
          setAttr("width")(Number.isNaN(v) ? null : v);
        }}
      />

      <label className="block text-sm font-medium mb-1">Height (mm)</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"              // or "1" for integers
        value={attributes.height ?? ""}          // show blank if null
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber; // NaN when empty/invalid
          setAttr("height")(Number.isNaN(v) ? null : v);
        }}
      />

      <label className="block text-sm font-medium mb-1">Quantity</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"              // or "1" for integers
        value={attributes.quantity ?? ""}          // show blank if null
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber; // NaN when empty/invalid
          setAttr("quantity")(Number.isNaN(v) ? null : v);
        }}
      />

      <label className="block text-sm font-medium mb-1">Hem (mm)</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"              // or "1" for integers
        value={attributes.hem ?? ""}          // show blank if null
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber; // NaN when empty/invalid
          setAttr("hem")(Number.isNaN(v) ? null : v);
        }}
      />

      <label className="block text-sm font-medium mb-1">Seam (mm)</label>
      <input
        className="inputCompact"
        type="number"
        inputMode="numeric"
        step="any"              // or "1" for integers
        value={attributes.seam ?? ""}          // show blank if null
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber; // NaN when empty/invalid
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

      <label className="block text-sm font-medium mb-1 mt-2"> Fabric Width (mm) </label>
      <input
        className="inputCompact"
        type="number"
        value={attributes.fabricWidth}
        onChange={(e) => setAttr("fabricWidth")(e.target.value)}
        inputMode="numeric"
      />
    </div>
  );
}
