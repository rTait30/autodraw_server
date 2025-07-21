import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';

const FABRIC_OPTIONS = {
  ShadeCloth: [
    { value: 'Rainbow Z16', label: 'Rainbow Z16',
      colours: [
        'Cinnamon',
        'Desert Sand',
        'Silver',
        'Charcoal',
        'Black',
        'Navy Blue',
        'Laguna Blue',
        'Royal Blue',
        'Turquoise',
        'Rainforest',
        'Red Earth',
        'Terracotta',
        'Rust Gold',
        'Mulberry',
        'Chocolate',
        'Ice White',
        'Zesty Lime',
        'Electric Purple',
        'Atomic Orange',
        'Sunset Red',
        'Sunflower Yellow',
        'Eucalyptus',
        'Olive',
        'Gumleaf'
      ]
    
    },
    { value: 'Monotec 370', label: 'Monotec 370',
      
      colours: [
        'Chino',
        'Karloo',
        'Bundena',
        'Graphite',
        'Marrocan',
        'Abaroo',
        'Sheba',
        'Koonunga',
        'Domino',
        'Titanium',
        'Lime Fizz',
        'Mellow Haze',
        'Sherbet',
        'Bubblegum',
        'Jazzberry',
        'Candy'
      ]
    
    },
    { value: 'Parasol', label: 'Parasol', colours: ['Charcoal'] },
  ],
  PVC: [
    { value: 'Ferrari 502', label: 'Ferrari 502',
      
      colours: 
        [
        'Night Blue',
        'Porcelain Green',
        'Garden Green',
        'Marine',
        'Pacific Blue',
        'Revival Blue',
        'Alphine',
        'Lagoon',
        'Spring Green',
        'Victoria Blue',
        'Tin Green',
        'Tennis Green',
        'Raspberry',
        'Pepper',
        'Orange',
        'Poppy',
        'Black',
        'Titanium',
        'Enamel White',
        'Anthracite',
        'Aluminium',
        'Pearl White',
        'Concrete',
        'Boulder',
        'White',
        'Champagne',
        'Lemon',
        'Peach',
        'Hemp',
        'Buttercup',
        'Burgundy',
        'Rust',
        'Taupe'
      ]
    },
    { value: 'Mehler', label: 'Mehler', colours: ['Black', 'White'] },
  ]
};

// --- Helper to get colours for selected material ---
function getColoursForMaterial(category, material) {
  const brand = FABRIC_OPTIONS[category]?.find(opt => opt.value === material);
  return brand?.colours || [];
}


function getPointLabel(i) {
  return String.fromCharCode(65 + i); // A, B, C...
}

const SailForm = forwardRef(({ role }, ref) => {
  const [formData, setFormData] = useState({
    fabricCategory: 'ShadeCloth',
    fabricType: 'Rainbow Z16',
    colour: 'Charcoal',
    exitPoint: 'A',
    logo: 'A',
    pointCount: 4,
    dimensions: {},
    points: {},
    sailtracks: [],
  });

  // === Derived values ===
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

  const getSailtrackPoints = (sailtrackEdges) => {
    const pointSet = new Set();
    sailtrackEdges.forEach(edge => {
      if (edge.length === 2) {
        pointSet.add(edge[0]);
        pointSet.add(edge[1]);
      }
    });
    return pointSet;
  };

  const sailtrackPoints = getSailtrackPoints(formData.sailtracks);

  // === Calculate live edge meter ===
  const edgeMeter = useMemo(() => {
    let total = 0;
    edges.forEach(edge => {
      const val = Number(formData.dimensions[edge]);
      if (!isNaN(val) && val > 0) total += val;
    });
    return total; // in mm (or raw unit)
  }, [formData.dimensions, edges]);

  // Also derive ceiling in meters (e.g. 14744 mm => 15 m)
  const edgeMeterCeilMeters = Math.max(1, Math.ceil(edgeMeter / 1000));

  // === Expose data via ref ===
  useImperativeHandle(ref, () => ({
    getData: () => ({
      ...formData,
      edgeMeter,
      edgeMeterCeilMeters
    }),
  }));

  // === Effects for point setup ===
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
        if (sailtrackPoints.has(p)) {
          updatedPoints[p].fixingType = 'sailtrack';
          updatedPoints[p].tensionAllowance = 0;
        }
      }
      return {
        ...prev,
        points: updatedPoints,
      };
    });
  }, [pointCount, formData.sailtracks]);

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

  const updateSailtrack = (edge) => {
    setFormData((prev) => {
      const updated = new Set(prev.sailtracks);
      if (updated.has(edge)) {
        updated.delete(edge);
      } else {
        updated.add(edge);
      }
      return { ...prev, sailtracks: Array.from(updated) };
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

  const handlePointChange = (point, field, value) => {
    if (sailtrackPoints.has(point) && (field === 'fixingType' || field === 'tensionAllowance')) {
      return; // Ignore updates for locked fields
    }
    setFormData((prev) => {
      const currentPoint = prev.points?.[point] || {};
      const updatedPoint = {
        ...currentPoint,
        [field]: value,
      };

      if (field === 'fixingType') {
        const newDefault = defaultTensionAllowances[value] ?? 50;
        const oldFixingType = currentPoint.fixingType;
        const oldDefault = defaultTensionAllowances[oldFixingType] ?? 50;
        const isStillDefault =
          typeof currentPoint.tensionAllowance !== 'number' ||
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

  return (
    <div>
      <div className="gap-4">
        <label>
          Fabric Category:
          <select
            className="inputStyle"
            value={formData.fabricCategory}
            onChange={e => {
              const newCat = e.target.value;
              updateFormData('fabricCategory', newCat);
              // Set default fabricType for new category
              const defaultType = FABRIC_OPTIONS[newCat][0]?.value || '';
              updateFormData('fabricType', defaultType);
            }}
          >
            {Object.keys(FABRIC_OPTIONS).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>

        <label>
          Brand:
          <select
            className="inputStyle"
            value={formData.fabricType}
            onChange={e => updateFormData('fabricType', e.target.value)}
          >
            {FABRIC_OPTIONS[formData.fabricCategory].map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <label>
          Colour:
          <select
            className="inputStyle"
            value={formData.colour}
            onChange={e => updateFormData('colour', e.target.value)}
          >
            {getColoursForMaterial(formData.fabricCategory, formData.fabricType).map(colour => (
              <option key={colour} value={colour}>{colour}</option>
            ))}
          </select>
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
            {[3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

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
              <label className="text-sm">
                <input
                  type="checkbox"
                  checked={formData.sailtracks.includes(id)}
                  onChange={() => updateSailtrack(id)}
                /> Sailtrack
              </label>
            </div>
          ))}
        </div>

        {/* LIVE total edge length */}
        <div className="mt-2 font-semibold">
          Total Edge Length: {edgeMeter.toLocaleString()} mm ({edgeMeterCeilMeters} m rounded up)
        </div>
      </div>

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
                      disabled={sailtrackPoints.has(p)}
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
                      value={getPoint(p).tensionAllowance || 0}
                      onChange={(e) => handlePointChange(p, 'tensionAllowance', Number(e.target.value))}
                      disabled={sailtrackPoints.has(p)}
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
