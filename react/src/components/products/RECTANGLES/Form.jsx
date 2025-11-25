import React, { useImperativeHandle, useState } from "react";

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

  return (
    <div className="space-y-6">
      <section className="space-y-4 p-4 bg-white rounded border">
        <h3 className="text-lg font-semibold">Nesting Configuration</h3>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Fabric Width (mm)</label>
          <input
            type="number"
            className="inputCompact"
            value={projectData.fabricWidth}
            onChange={(e) =>
              setProjectData((prev) => ({
                ...prev,
                fabricWidth: Number(e.target.value),
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Fabric Roll Length (mm)</label>
          <input
            type="number"
            className="inputCompact"
            value={projectData.fabricRollLength}
            onChange={(e) =>
              setProjectData((prev) => ({
                ...prev,
                fabricRollLength: Number(e.target.value),
              }))
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowRotation"
            checked={projectData.allowRotation}
            onChange={(e) =>
              setProjectData((prev) => ({
                ...prev,
                allowRotation: e.target.checked,
              }))
            }
          />
          <label htmlFor="allowRotation" className="text-sm font-medium">
            Allow Rotation
          </label>
        </div>
      </section>

      <section className="space-y-4 p-4 bg-white rounded border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Rectangles</h3>
          <button
            type="button"
            onClick={addRectangle}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            + Add Rectangle
          </button>
        </div>

        <div className="space-y-3">
          {projectData.rectangles.map((rect, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded"
            >
              <div className="col-span-2">
                <label className="text-xs opacity-70">Label</label>
                <input
                  type="text"
                  className="inputCompact w-full"
                  value={rect.label}
                  onChange={(e) => updateRectangle(index, "label", e.target.value)}
                />
              </div>

              <div className="col-span-3">
                <label className="text-xs opacity-70">Width (mm)</label>
                <input
                  type="number"
                  className="inputCompact w-full"
                  value={rect.width}
                  onChange={(e) =>
                    updateRectangle(index, "width", Number(e.target.value))
                  }
                />
              </div>

              <div className="col-span-3">
                <label className="text-xs opacity-70">Height (mm)</label>
                <input
                  type="number"
                  className="inputCompact w-full"
                  value={rect.height}
                  onChange={(e) =>
                    updateRectangle(index, "height", Number(e.target.value))
                  }
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs opacity-70">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="inputCompact w-full"
                  value={rect.quantity}
                  onChange={(e) =>
                    updateRectangle(index, "quantity", Number(e.target.value))
                  }
                />
              </div>

              <div className="col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={() => removeRectangle(index)}
                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm w-full"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
