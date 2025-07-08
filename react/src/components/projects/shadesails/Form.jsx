import React from 'react';

function getPointLabel(i) {
  return String.fromCharCode(65 + i); // A, B, C...
}

export default function SailForm({ formData, onChange }) {
  const pointCount = formData.pointCount || 4;
  const points = Array.from({ length: pointCount }, (_, i) => getPointLabel(i));
  const edges = points.map((p, i) => `${p}${points[(i + 1) % pointCount]}`);

  const diagonals = [];
  for (let i = 0; i < pointCount; i++) {
    for (let j = i + 1; j < pointCount; j++) {
      if ((j === (i + 1) % pointCount) || (i === 0 && j === pointCount - 1)) continue;
      diagonals.push(`${points[i]}${points[j]}`);
    }
  }

  // Safe getter
  const getPoint = (p) => formData.points?.[p] || {};

  // Unified handler for point data
  const handlePointChange = (point, field, value) => {
    const updated = {
      ...formData,
      points: {
        ...formData.points,
        [point]: {
          ...formData.points?.[point],
          [field]: value,
        },
      },
    };
    onChange(updated);
  };

  // Flat fields like edge lengths and diagonals
  const handleFlatInput = (e) => {
    const { name, value } = e.target;
    onChange({ ...formData, [name]: value });
  };

  const handlePointCount = (e) => {
    const newCount = parseInt(e.target.value, 10);
    const newPoints = Array.from({ length: newCount }, (_, i) => getPointLabel(i));
    const newEdges = newPoints.map((p, i) => `${p}${newPoints[(i + 1) % newCount]}`);
    const newDiagonals = [];
    for (let i = 0; i < newCount; i++) {
      for (let j = i + 1; j < newCount; j++) {
        if ((j === (i + 1) % newCount) || (i === 0 && j === newCount - 1)) continue;
        newDiagonals.push(`${newPoints[i]}${newPoints[j]}`);
      }
    }

    // Reset formData but preserve known fields
    const newFormData = {
      pointCount: newCount,
      fabricType: formData.fabricType || 'PVC',
      points: {},
    };

    // Copy over valid edge/diagonal values
    for (const edge of newEdges) {
      if (formData[edge]) newFormData[edge] = formData[edge];
    }
    for (const diag of newDiagonals) {
      if (formData[diag]) newFormData[diag] = formData[diag];
    }

    onChange(newFormData);
  };

  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
      <label>
        Number of Points:
        <select name="pointCount" value={pointCount} onChange={handlePointCount}>
          {[3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      <label>
        Fabric Type:
        <select name="fabricType" value={formData.fabricType || 'PVC'} onChange={handleFlatInput}>
          <option value="PVC">PVC</option>
          <option value="ShadeCloth">Shade Cloth</option>
        </select>
      </label>

      <b>Point Details</b>
      {points.map((p) => (
        <fieldset key={p} style={{ border: '1px solid #ccc', padding: '10px' }}>
          <legend>Point {p}</legend>
          <label>
            Height (mm):
            <input
              type="number"
              value={getPoint(p).height || ''}
              onChange={(e) => handlePointChange(p, 'height', Number(e.target.value))}
            />
          </label>
          <label>
            Fixing Type:
            <select
              value={getPoint(p).fixingType || 'Wall Plate'}
              onChange={(e) => handlePointChange(p, 'fixingType', e.target.value)}
            >
              <option value="Wall Plate">Wall Plate</option>
              <option value="Post">Post</option>
              <option value="Turnbuckle">Turnbuckle</option>
              <option value="Eye Bolt">Eye Bolt</option>
            </select>
          </label>
          <label>
            Tensioning Allowance (mm):
            <input
              type="number"
              value={getPoint(p).tensionAllowance || ''}
              onChange={(e) => handlePointChange(p, 'tensionAllowance', Number(e.target.value))}
            />
          </label>
        </fieldset>
      ))}

      <b>Edge Lengths (mm)</b>
      {edges.map((id) => (
        <label key={id}>
          {id}:
          <input
            type="number"
            name={id}
            value={formData[id] || ''}
            onChange={handleFlatInput}
          />
        </label>
      ))}

      <b>Diagonals (mm)</b>
      {diagonals.map((id) => (
        <label key={id}>
          {id}:
          <input
            type="number"
            name={id}
            value={formData[id] || ''}
            onChange={handleFlatInput}
          />
        </label>
      ))}
    </form>
  );
}
