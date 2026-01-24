
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
import { 
  useProductAttribute, 
  useFormNavigation, 
  FormContainer, 
  NumberInput, 
  CheckboxInput, 
  ButtonGroup 
} from "../../FormUI";

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
  // Use the shared hook for attribute management
  const { attributes, setAttr } = useProductAttribute({
    formRef,
    hydrate,
    defaults: ATTRIBUTE_DEFAULTS
  });

  let role = localStorage.getItem("role");
  
  // Define field order for Enter navigation
  const fieldOrder = [
    "length", "width", "height", "quantity", "hem", "seam",
    ...( (role === "admin" || role === "estimator" || role === "designer") ? ["fabricWidth", "fabricRollLength"] : [])
  ];

  // Use shared hook for navigation
  const nav = useFormNavigation(fieldOrder);

  return (
    <FormContainer>
      <NumberInput 
        label="Length (mm)" 
        value={attributes.length} 
        onChange={setAttr("length")} 
        name="length" 
        nav={nav} 
      />

      <NumberInput 
        label="Width (mm)" 
        value={attributes.width} 
        onChange={setAttr("width")} 
        name="width" 
        nav={nav} 
      />

      <NumberInput 
        label="Height (mm)" 
        value={attributes.height} 
        onChange={setAttr("height")} 
        name="height" 
        nav={nav} 
      />

      <NumberInput 
        label="Quantity" 
        value={attributes.quantity} 
        onChange={setAttr("quantity")} 
        name="quantity" 
        nav={nav} 
      />

      <NumberInput 
        label="Hem (mm)" 
        value={attributes.hem} 
        onChange={setAttr("hem")} 
        name="hem" 
        nav={nav} 
      />

      <NumberInput 
        label="Seam (mm)" 
        value={attributes.seam} 
        onChange={setAttr("seam")} 
        name="seam" 
        nav={nav} 
      />

      <ButtonGroup>
        <CheckboxInput 
          label="Zips" 
          checked={attributes.zips} 
          onChange={setAttr("zips")} 
        />
        <CheckboxInput 
          label="Stayputs" 
          checked={attributes.stayputs} 
          onChange={setAttr("stayputs")} 
        />
      </ButtonGroup>

      {(role === "admin" || role === "estimator" || role === "designer") && (
        <>
          <div className="mt-2">
            <NumberInput 
              label="Fabric Width (mm)" 
              value={attributes.fabricWidth} 
              onChange={setAttr("fabricWidth")} 
              name="fabricWidth" 
              nav={nav} 
            />
          </div>

          <div className="mt-2">
            <NumberInput 
              label="Fabric Roll Length (mm)" 
              value={attributes.fabricRollLength} 
              onChange={setAttr("fabricRollLength")} 
              name="fabricRollLength" 
              nav={nav} 
            />
          </div>
        </>
      )}
    </FormContainer>
  );
}

export default ProductForm;
