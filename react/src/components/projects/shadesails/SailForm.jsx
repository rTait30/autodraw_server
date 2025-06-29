import React from 'react';

function getPointLabel(i) {
  // A, B, C, D, E, F, G, H
  return String.fromCharCode(65 + i);
}

export default function SailForm({ formData, onChange }) {
  const pointCount = formData.pointCount || 4;

  // Generate point labels
  const points = Array.from({ length: pointCount }, (_, i) => getPointLabel(i));

  // Generate edge fields (A-B, B-C, ..., last-A)
  const edges = points.map((p, i) => `${p}${points[(i + 1) % pointCount]}`);

  // Generate diagonal fields (all unique pairs not adjacent)
  const diagonals = [];
  for (let i = 0; i < pointCount; i++) {
    for (let j = i + 1; j < pointCount; j++) {
      // Skip adjacent pairs (already in edges)
      if ((j === (i + 1) % pointCount) || (i === 0 && j === pointCount - 1)) continue;
      diagonals.push(`${points[i]}${points[j]}`);
    }
  }

  // Generate height fields (HA, HB, ...)
  const heights = points.map((p) => `H${p}`);

  const handleInput = (e) => {
    const { name, value } = e.target;
    onChange({ ...formData, [name]: value });
  };

  const handlePointCount = (e) => {
    const newCount = parseInt(e.target.value, 10);
    // Reset fields that are not needed for new count
    const newPoints = Array.from({ length: newCount }, (_, i) => getPointLabel(i));
    const newEdges = newPoints.map((p, i) => `${p}${newPoints[(i + 1) % newCount]}`);
    const newDiagonals = [];
    for (let i = 0; i < newCount; i++) {
      for (let j = i + 1; j < newCount; j++) {
        if ((j === (i + 1) % newCount) || (i === 0 && j === newCount - 1)) continue;
        newDiagonals.push(`${newPoints[i]}${newPoints[j]}`);
      }
    }
    const newHeights = newPoints.map((p) => `H${p}`);

    // Remove old fields not needed
    const newFormData = { ...formData, pointCount: newCount };
    Object.keys(newFormData).forEach((k) => {
      if (
        (!newEdges.includes(k) && !newDiagonals.includes(k) && !newHeights.includes(k) && k !== 'fabricType' && k !== 'pointCount')
      ) {
        delete newFormData[k];
      }
    });
    onChange(newFormData);
  };

  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px' }}>
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
        <select name="fabricType" value={formData.fabricType || 'PVC'} onChange={handleInput}>
          <option value="PVC">PVC</option>
          <option value="ShadeCloth">Shade Cloth</option>
        </select>
      </label>
      <b>Edge Lengths (mm)</b>
      {edges.map((id) => (
        <label key={id}>
          {id}:
          <input
            type="number"
            name={id}
            value={formData[id] || ''}
            onChange={handleInput}
          />
        </label>
      ))}
      <b>Point Heights (mm)</b>
      {heights.map((id) => (
        <label key={id}>
          {id}:
          <input
            type="number"
            name={id}
            value={formData[id] || ''}
            onChange={handleInput}
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
            onChange={handleInput}
          />
        </label>
      ))}
    </form>
  );
}