import React, { useImperativeHandle, useState } from "react";
import { 
  FormContainer, 
  FormSection,
  NumberInput, 
  TextInput, 
  CheckboxInput 
} from "../../FormUI";
import { Button } from "../../ui";

export const PROJECT_DEFAULTS = Object.freeze({
  rectangles: [
    { width: 1000, height: 800, label: "A", quantity: 1 },
    { width: 600, height: 400, label: "B", quantity: 1 },
  ],
  fabricWidth: 3200,
  fabricRollLength: 50000,
  allowRotation: true,
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

  const addRectangle = () => {
    setProjectData((prev) => ({
      ...prev,
      rectangles: [
        ...prev.rectangles,
        { width: 500, height: 500, label: `R${prev.rectangles.length + 1}`, quantity: 1 },
      ],
    }));
  };

  const updateRectangle = (index, field, value) => {
    setProjectData((prev) => {
      const updated = [...prev.rectangles];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, rectangles: updated };
    });
  };

  const removeRectangle = (index) => {
    setProjectData((prev) => ({
      ...prev,
      rectangles: prev.rectangles.filter((_, i) => i !== index),
    }));
  };

  const setField = (field) => (val) => {
      setProjectData(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="space-y-6">
      <FormSection title="Nesting Configuration">
         <FormContainer>
            <NumberInput 
                label="Fabric Width (mm)"
                value={projectData.fabricWidth}
                onChange={setField("fabricWidth")}
            />
            <NumberInput 
                label="Fabric Roll Length (mm)"
                value={projectData.fabricRollLength}
                onChange={setField("fabricRollLength")}
            />
            <CheckboxInput 
                label="Allow Rotation"
                checked={projectData.allowRotation}
                onChange={setField("allowRotation")}
            />
         </FormContainer>
      </FormSection>

      <FormSection title="Rectangles">
        <div className="flex justify-end mb-4">
            <Button onClick={addRectangle} size="sm">+ Add Rectangle</Button>
        </div>

        <div className="space-y-4">
          {projectData.rectangles.map((rect, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
            >
              <div className="md:col-span-2">
                <TextInput
                  label="Label"
                  value={rect.label}
                  onChange={(val) => updateRectangle(index, "label", val)}
                  wrapperClassName="mb-0"
                />
              </div>

              <div className="md:col-span-3">
                <NumberInput
                  label="Width (mm)"
                  value={rect.width}
                  onChange={(val) => updateRectangle(index, "width", val)}
                  wrapperClassName="mb-0"
                />
              </div>

              <div className="md:col-span-3">
                <NumberInput
                  label="Height (mm)"
                  value={rect.height}
                  onChange={(val) => updateRectangle(index, "height", val)}
                  wrapperClassName="mb-0"
                />
              </div>

              <div className="md:col-span-2">
                <NumberInput
                  label="Qty"
                  value={rect.quantity}
                  onChange={(val) => updateRectangle(index, "quantity", val)}
                  wrapperClassName="mb-0"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => removeRectangle(index)}
                  className="w-full py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {projectData.rectangles.length === 0 && (
              <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                  No rectangles added yet.
              </div>
          )}
        </div>
      </FormSection>
    </div>
  );
}

export function ProductForm({ formRef }) {
  // RECTANGLES product doesn't have per-item attributes yet, 
  // as it uses the ProjectForm for the list of rectangles.
  // This is a placeholder to satisfy the interface.
  
  useImperativeHandle(
    formRef,
    () => ({
      getValues: () => ({
        attributes: {},
      }),
    }),
    []
  );

  return (
    <div className="p-4 text-sm text-gray-500 italic text-center">
      This product is configured via the project settings above.
    </div>
  );
}
