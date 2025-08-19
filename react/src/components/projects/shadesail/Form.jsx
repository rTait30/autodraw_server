import React, { useMemo, forwardRef } from 'react';
import FormBase from '../FormBase';

/* ============================================================================
 * Local catalog + helpers (kept here so this file is self-contained).
 * You can move FABRIC_OPTIONS/getColoursForMaterial into a shared module later.
 * ==========================================================================*/
const FABRIC_OPTIONS = {
  ShadeCloth: [
    { value: 'Rainbow Z16', label: 'Rainbow Z16',
      colours: [
        'Cinnamon','Desert Sand','Silver','Charcoal','Black','Navy Blue','Laguna Blue',
        'Royal Blue','Turquoise','Rainforest','Red Earth','Terracotta','Rust Gold',
        'Mulberry','Chocolate','Ice White','Zesty Lime','Electric Purple','Atomic Orange',
        'Sunset Red','Sunflower Yellow','Eucalyptus','Olive','Gumleaf'
      ]
    },
    { value: 'Monotec 370', label: 'Monotec 370',
      colours: [
        'Chino','Karloo','Bundena','Graphite','Marrocan','Abaroo','Sheba','Koonunga',
        'Domino','Titanium','Lime Fizz','Mellow Haze','Sherbet','Bubblegum','Jazzberry',
        'Candy'
      ]
    },
    { value: 'Parasol', label: 'Parasol', colours: ['Charcoal'] },
  ],
  PVC: [
    { value: 'Ferrari 502', label: 'Ferrari 502',
      colours: [
        'Night Blue','Porcelain Green','Garden Green','Marine','Pacific Blue','Revival Blue',
        'Alphine','Lagoon','Spring Green','Victoria Blue','Tin Green','Tennis Green',
        'Raspberry','Pepper','Orange','Poppy','Black','Titanium','Enamel White',
        'Anthracite','Aluminium','Pearl White','Concrete','Boulder','White','Champagne',
        'Lemon','Peach','Hemp','Buttercup','Burgundy','Rust','Taupe'
      ]
    },
    { value: 'Mehler', label: 'Mehler', colours: ['Black','White'] },
  ]
};

function getColoursForMaterial(category, material) {
  const brand = FABRIC_OPTIONS[category]?.find(opt => opt.value === material);
  return brand?.colours || [];
}

function getPointLabel(i) {
  return String.fromCharCode(65 + i); // A, B, C...
}
function makeEdges(pointCount) {
  const pts = Array.from({ length: pointCount }, (_, i) => getPointLabel(i));
  return pts.map((p, i) => `${p}${pts[(i + 1) % pointCount]}`);
}
function makeDiagonals(pointCount) {
  const pts = Array.from({ length: pointCount }, (_, i) => getPointLabel(i));
  const diags = [];
  for (let i = 0; i < pointCount; i++) {
    for (let j = i + 1; j < pointCount; j++) {
      // skip adjacent and wrap-around edge
      if ((j === (i + 1) % pointCount) || (i === 0 && j === pointCount - 1)) continue;
      diags.push(`${pts[i]}${pts[j]}`);
    }
  }
  return diags;
}

const DEFAULTS = {
  fabricCategory: 'ShadeCloth',
  fabricType: 'Rainbow Z16',
  colour: 'Charcoal',
  exitPoint: 'A',
  logo: 'A',
  pointCount: 4,
  dimensions: {},
  points: {},
  sailtracks: [],
};

const defaultTensionAllowances = {
  M8B: 50,  M10B: 50,  M12B: 50,
  M8T: 300, M10T: 350, M12T: 450,
  Plate: 150,
};

/* ============================================================================
 * Custom render blocks that plug into FormBase as `type: 'custom'` fields
 * ==========================================================================*/

// Meta section: category/brand/colour/exit/logo/pointCount
function SailMetaFields({ formData, setField }) {
  const categories = Object.keys(FABRIC_OPTIONS);
  const types = FABRIC_OPTIONS[formData.fabricCategory] ?? [];
  const colours = getColoursForMaterial(formData.fabricCategory, formData.fabricType);

  return (
    <div className="gap-4 space-y-2">
      <label className="block">
        <span className="block text-sm font-medium mb-1">Fabric Category</span>
        <select
          className="inputStyle"
          value={formData.fabricCategory}
          onChange={(e) => {
            const newCat = e.target.value;
            const firstType = FABRIC_OPTIONS[newCat]?.[0]?.value ?? '';
            setField('fabricCategory', newCat);
            setField('fabricType', firstType);
            // reset colour to first of new type if exists
            const firstColour = getColoursForMaterial(newCat, firstType)[0] ?? '';
            if (firstColour) setField('colour', firstColour);
          }}
        >
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">Brand</span>
        <select
          className="inputStyle"
          value={formData.fabricType}
          onChange={(e) => {
            const newType = e.target.value;
            setField('fabricType', newType);
            const firstColour = getColoursForMaterial(formData.fabricCategory, newType)[0] ?? '';
            if (firstColour) setField('colour', firstColour);
          }}
        >
          {types.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">Colour</span>
        <select
          className="inputStyle"
          value={formData.colour}
          onChange={(e) => setField('colour', e.target.value)}
        >
          {colours.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">Exit Point</span>
        <input
          className="inputStyle"
          value={formData.exitPoint ?? ''}
          onChange={(e) => setField('exitPoint', e.target.value)}
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">Logo</span>
        <input
          className="inputStyle"
          value={formData.logo ?? ''}
          onChange={(e) => setField('logo', e.target.value)}
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">Point Count</span>
        <select
          className="inputStyle"
          value={formData.pointCount ?? 4}
          onChange={(e) => setField('pointCount', Number(e.target.value))}
        >
          {[3,4,5,6,7,8,9,10,11].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
    </div>
  );
}

// Edges + Diagonals editor (binds to `dimensions`)
function EdgesAndDiagonals({ formData, setDimensions }) {
  const pointCount = formData.pointCount ?? 4;
  const edges = useMemo(() => makeEdges(pointCount), [pointCount]);
  const diagonals = useMemo(() => makeDiagonals(pointCount), [pointCount]);

  const updateDimension = (key, raw) => {
    const value = raw === '' ? '' : Number(raw);
    const next = { ...(formData.dimensions ?? {}) };
    next[key] = value;
    setDimensions(next);
  };

  const edgeMeter = edges.reduce((acc, id) => {
    const v = Number((formData.dimensions ?? {})[id]);
    return acc + (isNaN(v) ? 0 : v);
  }, 0);
  const edgeMeterCeilMeters = Math.max(1, Math.ceil(edgeMeter / 1000));

  return (
    <div>
      <b>Edges (mm)</b>
      <div className="space-y-1 mt-1">
        {edges.map((id) => (
          <div key={id} className="flex items-center gap-2">
            <label className="text-sm">{id}:</label>
            <input
              type="number"
              className="inputCompact"
              value={(formData.dimensions ?? {})[id] ?? ''}
              onChange={(e) => updateDimension(id, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* LIVE total edge length */}
      <div className="mt-2 font-semibold">
        Total Edge Length: {edgeMeter.toLocaleString()} mm ({edgeMeterCeilMeters} m rounded up)
      </div>

      <div className="mt-4">
        <b>Diagonals (mm)</b>
        <div className="space-y-1 mt-1">
          {diagonals.map((id) => (
            <div key={id} className="flex items-center gap-2">
              <label className="text-sm">{id}:</label>
              <input
                type="number"
                className="inputCompact"
                value={(formData.dimensions ?? {})[id] ?? ''}
                onChange={(e) => updateDimension(id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Sailtracks checkboxes (binds to `sailtracks`)
function SailtracksEditor({ formData, setSailtracks }) {
  const pointCount = formData.pointCount ?? 4;
  const edges = useMemo(() => makeEdges(pointCount), [pointCount]);

  const toggle = (edgeId) => {
    const cur = new Set(formData.sailtracks ?? []);
    if (cur.has(edgeId)) cur.delete(edgeId);
    else cur.add(edgeId);
    setSailtracks(Array.from(cur));
  };

  return (
    <div className="mt-2">
      <b>Sailtracks</b>
      <div className="space-y-1 mt-1">
        {edges.map((id) => (
          <label key={id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(formData.sailtracks ?? []).includes(id)}
              onChange={() => toggle(id)}
            />
            {id}
          </label>
        ))}
      </div>
    </div>
  );
}


const fixingOptions = [
  { value: "M8B", label: "M8 Bowshackle" },
  { value: "M10B", label: "M10 Bowshackle" },
  { value: "M12B", label: "M12 Bowshackle" },
  { value: "M8T", label: "M8 Turnbuckle" },
  { value: "M10T", label: "M10 Turnbuckle" },
  { value: "M12T", label: "M12 Turnbuckle" },
  { value: "Plate", label: "Plate" }
  // Do NOT include "sailtrack" here
];

const cornerOptions = [
  { value: "PR", label: "Prorig" },
  { value: "PRP", label: "Prorig with pipe" },
  { value: "EZ", label: "Ezy slide" },
  { value: "Plate", label: "Plate" },
  { value: "ST", label: "Sailtrack" }
  // Do NOT include "sailtrack" here
];

// Points table (binds to `points`), with sailtrack locks and default tension rules
function PointsTable({ formData, setPoints }) {
  const pointCount = formData.pointCount ?? 4;
  const points = useMemo(
    () => Array.from({ length: pointCount }, (_, i) => getPointLabel(i)),
    [pointCount]
  );

  // Find points that are on any sailtrack edge (lock fixing/tension)
  const sailtrackPoints = useMemo(() => {
    const set = new Set();
    const edges = makeEdges(pointCount);
    const st = new Set(formData.sailtracks ?? []);
    edges.forEach((e) => {
      if (st.has(e) && e.length === 2) {
        set.add(e[0]); set.add(e[1]);
      }
    });
    return set;
  }, [formData.sailtracks, pointCount]);

  const getPoint = (p) => (formData.points ?? {})[p] ?? {};

  const setPoint = (p, updated) => {
    const all = { ...(formData.points ?? {}) };
    all[p] = updated;
    setPoints(all);
  };

  const handlePointChange = (p, field, value) => {
    const locked = sailtrackPoints.has(p) && (field === 'fixingType' || field === 'tensionAllowance');
    if (locked) return;

    const current = getPoint(p);
    const next = { ...current, [field]: value };

    if (field === 'fixingType') {
      const newDefault = defaultTensionAllowances[value] ?? 50;
      const oldFix = current.fixingType;
      const oldDefault = defaultTensionAllowances[oldFix] ?? 50;
      const isStillDefault =
        typeof current.tensionAllowance !== 'number' ||
        current.tensionAllowance === oldDefault;

      if (isStillDefault) {
        next.tensionAllowance = newDefault;
      }
    }

    // Seed sensible defaults
    if (!('cornerType' in next)) next.cornerType = 'PR';
    if (!('height' in next)) next.height = 0;
    if (!('fixingType' in next)) next.fixingType = 'M8B';
    if (!('tensionAllowance' in next)) next.tensionAllowance = 50;

    // Enforce lock for sailtrack points
    if (sailtrackPoints.has(p)) {
      next.fixingType = 'sailtrack';
      next.cornerType = 'sailtrack';
      next.tensionAllowance = 0;
    }

    setPoint(p, next);
  };

  return (
    <div className="mt-4">
      <b>Point Properties</b>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-semibold border-b">
              <th className="text-left p-1">Point</th>
              <th className="text-left p-1">Height</th>
              <th className="text-left p-1">Corner Type</th>
              <th className="text-left p-1">Fixing</th>
              <th className="text-left p-1">Tension (mm)</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => {
              const pt = getPoint(p);
              const locked = sailtrackPoints.has(p);
              return (
                <tr key={p} className="border-b">
                  <td className="p-1 font-medium">{p}</td>
                  <td>
                    <input
                      type="number"
                      className="inputCompact"
                      value={pt.height ?? 0}
                      onChange={(e) => handlePointChange(p, 'height', Number(e.target.value))}
                    />
                  </td>
                  <td>
                    <select
                      className="inputCompact"
                      value={locked ? "sailtrack" : pt.cornerType ?? "PR"}
                      onChange={e => handlePointChange(p, "cornerType", e.target.value)}
                      disabled={locked}
                    >
                      {cornerOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                      {/* When locked, show sailtrack as the only option */}
                      {locked && <option value="sailtrack">Sailtrack Corner</option>}
                    </select>
                  </td>
                  <td>
                    <select
                      className="inputCompact"
                      value={locked ? "sailtrack" : pt.fixingType ?? "M8B"}
                      onChange={e => handlePointChange(p, "fixingType", e.target.value)}
                      disabled={locked}
                    >
                      {fixingOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                      {/* When locked, show sailtrack as the only option */}
                      {locked && <option value="sailtrack">Sailtrack</option>}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="inputCompact"
                      value={locked ? 0 : pt.tensionAllowance ?? 0}
                      onChange={e => handlePointChange(p, "tensionAllowance", Number(e.target.value))}
                      disabled={locked}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================================
 * Fields schema for FormBase
 * - We use a small custom “meta” block to coordinate category→brand→colour resets.
 * - Real data fields are the normal keys (so serialization is clean).
 * - dimensions / sailtracks / points are custom blocks bound to their keys.
 * - edge totals are computed via transformOut so ref.getData() includes them.
 * ==========================================================================*/
const buildFields = () => [
  // Meta UI (custom) — updates multiple underlying fields
  {
    name: '__meta__',
    label: null,
    type: 'custom',
    render: ({ formData, onChange, setField }) => (
      <SailMetaFields formData={formData} setField={setField} />
    ),
  },

  // Underlying real data fields for meta (hidden — kept for clean serialization)
  { name: 'fabricCategory', label: 'Fabric Category', type: 'text', visible: () => false },
  { name: 'fabricType',     label: 'Brand',          type: 'text', visible: () => false },
  { name: 'colour',         label: 'Colour',         type: 'text', visible: () => false },
  { name: 'exitPoint',      label: 'Exit Point',     type: 'text', visible: () => false },
  { name: 'logo',           label: 'Logo',           type: 'text', visible: () => false },
  { name: 'pointCount',     label: 'Point Count',    type: 'number', visible: () => false, min: 3, max: 11, step: 1 },

  // Dimensions editor
  {
    name: 'dimensions',
    label: null,
    type: 'custom',
    render: ({ formData, onChange }) => (
      <EdgesAndDiagonals formData={formData} setDimensions={(next) => onChange(next)} />
    ),
  },

  // Sailtracks editor
  {
    name: 'sailtracks',
    label: null,
    type: 'custom',
    render: ({ formData, onChange }) => (
      <SailtracksEditor formData={formData} setSailtracks={(next) => onChange(next)} />
    ),
  },

  // Points table
  {
    name: 'points',
    label: null,
    type: 'custom',
    render: ({ formData, onChange }) => (
      <PointsTable formData={formData} setPoints={(next) => onChange(next)} />
    ),
  },

  // Computed totals included in getData()
  {
    name: 'edgeMeter',
    label: null,
    type: 'custom',
    render: ({ formData }) => {
      const edges = makeEdges(formData.pointCount ?? 4);
      const total = edges.reduce((acc, id) => {
        const v = Number((formData.dimensions ?? {})[id]);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      const ceilM = Math.max(1, Math.ceil(total / 1000));
      return (
        <div className="mt-2 font-semibold">
          Total Edge Length: {total.toLocaleString()} mm ({ceilM} m rounded up)
        </div>
      );
    },
    transformOut: (_v, formData) => {
      const edges = makeEdges(formData.pointCount ?? 4);
      return edges.reduce((acc, id) => {
        const v = Number((formData.dimensions ?? {})[id]);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
    },
  },
  {
    name: 'edgeMeterCeilMeters',
    label: null,
    type: 'custom',
    render: () => null,
    transformOut: (_v, formData) => {
      const edges = makeEdges(formData.pointCount ?? 4);
      const total = edges.reduce((acc, id) => {
        const v = Number((formData.dimensions ?? {})[id]);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      return Math.max(1, Math.ceil(total / 1000));
    },
  },
];

/* ============================================================================
 * SailForm component
 * ==========================================================================*/
const SailForm = forwardRef(function SailForm(
  { attributes = {}, calculated = {}, role, onReturn, onCheck, onSubmit },
  ref
) {
  const fields = useMemo(() => buildFields(), []);
  return (
    <FormBase
      ref={ref}
      title="Shade Sail Form"
      fields={fields}
      defaults={DEFAULTS}
      attributes={attributes}
      calculated={calculated}       // sails don’t use the generic calculated panel here
      onReturn={onReturn}
      onCheck={onCheck}
      onSubmit={onSubmit}
      showCalculated={true}
      debug={true}
    />
  );
});

export default SailForm;
