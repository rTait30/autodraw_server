import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

function getPointLabel(i) {
  return String.fromCharCode(65 + i); // A, B, C...
}

const SailForm = forwardRef(({ role }, ref) => {
  const [formData, setFormData] = useState({
    fabricType: 'ShadeCloth',
    colour: 'Black',
    exitPoint: 'A',
    logo: 'A',
    pointCount: 4,
    dimensions: {},
    points: {},
  });



  useImperativeHandle(ref, () => ({
    getData: () => formData,
  }));

  const pointCount = formData.pointCount || 4;
  const points = Array.from({ length: pointCount }, (_, i) => getPointLabel(i));
  const edges = points.map((p, i) => `${p}${points[(i + 1) % pointCount]}`);

    useEffect(() => {
    setFormData((prev) => {
      const updatedPoints = { ...prev.points };
      const pointLabels = Array.from({ length: pointCount }, (_, i) => getPointLabel(i));
      for (const p of pointLabels) {
        if (!updatedPoints[p]) {
          updatedPoints[p] = {
            height: 0,
            fixingType: 'M8 Bowshackle',
            tensionAllowance: 50,
          };
        }
      }
      return {
        ...prev,
        points: updatedPoints,
      };
    });
  }, [pointCount]);

  const diagonals = [];
  for (let i = 0; i < pointCount; i++) {
    for (let j = i + 1; j < pointCount; j++) {
      if ((j === (i + 1) % pointCount) || (i === 0 && j === pointCount - 1)) continue;
      diagonals.push(`${points[i]}${points[j]}`);
    }
  }

  const getPoint = (p) => formData.points?.[p] || {};

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateDimension = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [key]: value === '' ? '' : Number(value),
      },
    }));
  };

  const handlePointChange = (point, field, value) => {
    setFormData((prev) => {
      const currentPoint = prev.points?.[point] || {};
      const updatedPoint = {
        ...currentPoint,
        [field]: value,
      };

      if (field === 'fixingType') {
        const newDefault = defaultTensionAllowances[value] ?? 50;

        // Try to get the previous default for the old fixingType
        const oldFixingType = currentPoint.fixingType;
        const oldDefault = defaultTensionAllowances[oldFixingType] ?? 50;

        const isStillDefault =
          typeof currentPoint.tensionAllowance !== 'number' || // hasn't been touched
          currentPoint.tensionAllowance === oldDefault;

        if (isStillDefault) {
          updatedPoint.tensionAllowance = newDefault;
        }
      }


      return {
        ...prev,
        points: {
          ...prev.points,
          [point]: updatedPoint,
        },
      };
    });
  };

  const defaultTensionAllowances = {
    M8B: 50,
    M10B: 50,
    M12B: 50,
    M8T: 300,
    M10T: 350,
    M12T: 450,
    Plate: 150,
  };

  return (
    <div>
      <div className=" gap-4">
        <label>
          Fabric Type:
          <select
            className="inputStyle"
            value={formData.fabricType}
            onChange={(e) => updateFormData('fabricType', e.target.value)}
          >
            <option value="PVC">PVC</option>
            <option value="ShadeCloth">Shade Cloth</option>
          </select>
        </label>

        <label>
          Colour:
          <input
            className="inputStyle"
            value={formData.colour}
            onChange={(e) => updateFormData('colour', e.target.value)}
          />
        </label>

        <label>
          Exit Point:
          <input
            className="inputStyle"
            value={formData.exitPoint}
            onChange={(e) => updateFormData('exitPoint', e.target.value)}
          />
        </label>

        <label>
          Logo:
          <input
            className="inputStyle"
            value={formData.logo}
            onChange={(e) => updateFormData('logo', e.target.value)}
          />
        </label>

        <label>
          Point Count:
          <select
            className="inputStyle"
            value={pointCount}
            onChange={(e) => updateFormData('pointCount', Number(e.target.value))}
          >
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <div></div>

      <div>
        <b>Edges (mm)</b>
        <div className="space-y-1 mt-1">
          {edges.map((id) => (
            <div key={id} className="flex items-center gap-2">
              <label className="text-sm">{id}:</label>
              <input
                type="number"
                className="inputCompact"
                value={formData.dimensions[id] || ''}
                onChange={(e) => updateDimension(id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div></div>

      <div>
        <b>Diagonals (mm)</b>
        <div className="space-y-1 mt-1">
          {diagonals.map((id) => (
            <div key={id} className="flex items-center gap-2">
              <label className="text-sm">{id}:</label>
              <input
                type="number"
                className="inputCompact"
                value={formData.dimensions[id] || ''}
                onChange={(e) => updateDimension(id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <b>Point Properties</b>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="font-semibold border-b">
                <th className="text-left p-1">Point</th>
                <th className="text-left p-1">Height</th>
                <th className="text-left p-1">Fixing</th>
                <th className="text-left p-1">Tension (mm)</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p} className="border-b">
                  <td className="p-1 font-medium">{p}</td>
                  <td>
                    <input
                      type="number"
                      className="inputCompact"
                      value={getPoint(p).height || ''}
                      onChange={(e) => handlePointChange(p, 'height', Number(e.target.value))}
                    />
                  </td>
                  <td>
                    <select
                      className="inputCompact"
                      value={getPoint(p).fixingType || 'Wall Plate'}
                      onChange={(e) => handlePointChange(p, 'fixingType', e.target.value)}
                    >
                      
                      <option value="M8B">M8 Bowshackle</option>
                      <option value="M10B">M10 Bowshackle</option>
                      <option value="M12B">M12 Bowshackle</option>

                      <option value="M8T">M8 Turnbuckle</option>
                      <option value="M10T">M10 Turnbuckle</option>
                      <option value="M12T">M12 Turnbuckle</option>

                      <option value="Plate">Plate</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="inputCompact"
                      value={getPoint(p).tensionAllowance || 50}
                      onChange={(e) => handlePointChange(p, 'tensionAllowance', Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default SailForm;
