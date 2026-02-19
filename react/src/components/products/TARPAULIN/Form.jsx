import React, { useImperativeHandle, useState } from "react";
import { 
  useProductAttribute, 
  FormContainer,
  NumberInput,
  CheckboxInput,
  SelectInput,
  FormSection
} from "../../FormUI";

export const PROJECT_DEFAULTS = Object.freeze({});

export function ProjectForm({ formRef, projectDataHydrate = {} }) {
  const [projectData, setProjectData] = useState({
    ...PROJECT_DEFAULTS,
    ...(projectDataHydrate ?? {}),
  });

  useImperativeHandle(formRef, () => ({
    getValues: () => ({ project: projectData }),
    isValid: () => true, 
  }));

  return (
    <FormContainer>
      <div className="text-sm text-gray-500 italic">
        No specific project settings for Tarpaulin.
      </div>
    </FormContainer>
  );
}

const SIDES = ["top", "bottom", "left", "right"];

export const ATTRIBUTE_DEFAULTS = Object.freeze({
  length: 1000,
  width: 1000,
  quantity: 1,
  // Add defaults for eyelets per side
  ...SIDES.reduce((acc, side) => ({
    ...acc,
    [`eyelet_${side}_enabled`]: false,
    [`eyelet_${side}_mode`]: "spacing", // 'count' or 'spacing'
    [`eyelet_${side}_val`]: 500
  }), {}),

  fabricWidth: 3200,
  fabricType: "PVC",
  weldSize: 25
});

function EyeletSideInput({ side, attributes, setAttr }) {
  const enabled = attributes[`eyelet_${side}_enabled`];
  const mode = attributes[`eyelet_${side}_mode`];
  const label = side.charAt(0).toUpperCase() + side.slice(1);

  return (
    <div className="border p-3 rounded-md mb-2">
      <CheckboxInput
        label={`${label} Eyelets`}
        checked={enabled}
        onChange={setAttr(`eyelet_${side}_enabled`)}
      />
      
      {enabled && (
        <div className="mt-2 pl-4 border-l-2 border-gray-100 space-y-2">
          <SelectInput
            label="Spacing Mode"
            value={mode}
            onChange={setAttr(`eyelet_${side}_mode`)}
            options={[
              { label: "Total Count", value: "count" },
              { label: "Spacing (mm)", value: "spacing" }
            ]}
          />
          <NumberInput
            label={mode === "count" ? "Total Quantity" : "Approx. Spacing (mm)"}
            value={attributes[`eyelet_${side}_val`]}
            onChange={setAttr(`eyelet_${side}_val`)}
            min={1}
            step={1}
          />
        </div>
      )}

    </div>
  );
}

export function ProductForm({ formRef, hydrate = {} }) {
  const { attributes, setAttr } = useProductAttribute({
    formRef,
    hydrate,
    defaults: ATTRIBUTE_DEFAULTS
  });

  return (
    <FormContainer>
      <div className="space-y-4">
        <NumberInput
          label="Length (mm)"
          value={attributes.length}
          onChange={setAttr("length")}
          min={0}
          step={1}
        />
        <NumberInput
          label="Width (mm)"
          value={attributes.width}
          onChange={setAttr("width")}
          min={0}
          step={1}
        />
        <NumberInput
          label="Quantity"
          value={attributes.quantity}
          onChange={setAttr("quantity")}
          min={1}
          step={1}
        />
        

        <NumberInput
          label="Fabric Width (mm)"
          value={attributes.fabricWidth}
          onChange={setAttr("fabricWidth")}
          min={1}
          step={1}
          className="mt-2"
        />

        <SelectInput label="Fabric Type" value={attributes.fabricType} onChange={setAttr("fabricType")} options={[
          { label: "PVC", value: "PVC" },
          { label: "Polyester", value: "Polyester" },
          { label: "Canvas", value: "Canvas" }
        ]}/>

        <SelectInput
          label="Weld Size (mm)"
          value={attributes.weldSize}
          onChange={setAttr("weldSize")}
          options={[
            { label: "25 mm", value: 25 },
            { label: "40 mm", value: 40 }
          ]}
        />

        <FormSection title="Eyelets">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SIDES.map(side => (
              <EyeletSideInput 
                key={side} 
                side={side} 
                attributes={attributes} 
                setAttr={setAttr} 
              />
            ))}
          </div>
        </FormSection>
      </div>
    </FormContainer>
  );
}
