
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
    // add more fields here as needed
  });

  // Handy setter for individual fields
  const setAttr = (key) => (value) =>
    setAttributes((prev) => ({ ...prev, [key]: value }));

  useImperativeHandle(formRef, () => ({
      getValues: () => ({
        general: generalData,
        attributes
      }),
    }), [generalData, attributes]);

  //<label className="block text-sm font-medium mb-1">Length</label>
  //<input value={name} className='inputCompact w-full' onChange={(e) => setName(e.target.value)} />

  return (
    <div>
      <GeneralSection data={generalData} setData={setGeneralData} />
      <h3>Attributes</h3>
      


      <label className="block text-sm font-medium mb-1">Length (mm)</label>
      <input
        className="inputCompact w-full"
        value={attributes.length}
        onChange={(e) => setAttr("length")(e.target.value)}
        inputMode="numeric"
      />

      <label className="block text-sm font-medium mb-1">Width (mm)</label>
      <input
        className="inputCompact w-full"
        value={attributes.width}
        onChange={(e) => setAttr("width")(e.target.value)}
        inputMode="numeric"
      />

      <label className="block text-sm font-medium mb-1">Height (mm)</label>
      <input
        className="inputCompact w-full"
        value={attributes.width}
        onChange={(e) => setAttr("width")(e.target.value)}
        inputMode="numeric"
      />

    </div>
  );
}
