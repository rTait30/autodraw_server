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
  cable: 4,
  foldSide: 'underside',
  UFC: [],
};

const defaultTensionAllowances = {
  M8B: 50,  M10B: 50,  M12B: 50,
  M8T: 300, M10T: 350, M12T: 450,
  Plate: 150,
};

function getDimensionForPair(dimensions = {}, a, b) {
  // Edges/diagonals are keyed like "AB" already; try both orders
  return dimensions[`${a}${b}`] ?? dimensions[`${b}${a}`] ?? null;
}

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
        <span className="block text-sm font-medium mb-1">Cable size (mm):</span>
        <select
          className="inputStyle"
          value={formData.cable ?? 4}
          onChange={(e) => setField('cable', Number(e.target.value))}
        >
          {[4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">Fold Side</span>
        <select
          className="inputStyle"
          value={formData.foldSide ?? 'topside'}
          onChange={(e) => setField('foldSide', e.target.value)}
        >
          <option value="topside">Topside</option>
          <option value="underside">Underside</option>
        </select>
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


// Minimal heights-only table
function PointsHeightsTable({ formData, setPoints }) {
  const pointCount = formData.pointCount ?? 4;
  const points = useMemo(
    () => Array.from({ length: pointCount }, (_, i) => getPointLabel(i)),
    [pointCount]
  );

  const getPoint = (p) => (formData.points ?? {})[p] ?? {};

  const setHeight = (p, height) => {
    const all = { ...(formData.points ?? {}) };
    all[p] = { ...getPoint(p), height };
    setPoints(all);
  };

  return (
    <div className="mt-4">
      <b>Point Heights</b>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-semibold border-b">
              <th className="text-left p-1">Point</th>
              <th className="text-left p-1">Height (mm)</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => {
              const pt = getPoint(p);
              return (
                <tr key={p} className="border-b">
                  <td className="p-1 font-medium">{p}</td>
                  <td>
                    <input
                      type="number"
                      className="inputCompact"
                      value={pt.height ?? 0}
                      onChange={(e) => setHeight(p, Number(e.target.value))}
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
  { name: 'foldSide',       label: 'Fold Side',      type: 'text', visible: () => false },
  { 
    name: 'cable',
    label: 'Cable',
    type: 'number',
    visible: () => false,
    min: 4, max: 6, step: 1,
    transformOut: (_v, formData) => Number(formData.cable ?? 4),
  },
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



  // Points table
  {
    name: 'points',
    label: null,
    type: 'custom',
    render: ({ formData, onChange }) => (
      <PointsTable formData={formData} setPoints={(next) => onChange(next)} />
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

  
  // 👇 NEW: Under-Fabric Cables
  { name: 'ufc', label: null, type: 'custom',
    render: ({ formData, onChange }) => (
      <UnderfabricCablesEditor formData={formData} onChange={onChange} />
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

// Minimal field set for quick discrepancy checks
// Minimal field set for quick discrepancy checks
const buildDiscrepancyFields = () => [
  // Fabric Category: dropdown only (no side-effects on brand/colour)
  {
    name: 'fabricCategory',
    label: null,
    type: 'custom',
    render: ({ formData, setField }) => {
      const categories = Object.keys(FABRIC_OPTIONS || {});
      return (
        <label className="block">
          <span className="block text-sm font-medium mb-1">Fabric Category</span>
          <select
            className="inputStyle"
            value={formData.fabricCategory ?? ''}
            onChange={(e) => setField('fabricCategory', e.target.value)}
          >
            <option value="" disabled>Choose a category…</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>
      );
    },
  },

  // Keep the rest of the discrepancy inputs

  {
    name: 'pointCount',
    label: 'Point Count',
    type: 'number',
    min: 3,
    max: 11,
    step: 1,
  },
  {
    name: 'dimensions',
    label: null,
    type: 'custom',
    render: ({ formData, onChange }) => (
      <EdgesAndDiagonals
        formData={formData}
        setDimensions={(next) => onChange(next)}
      />
    ),
  },
  {
    name: 'points',
    label: null,
    type: 'custom',
    render: ({ formData, onChange }) => (
      <PointsHeightsTable
        formData={formData}
        setPoints={(next) => onChange(next)}
      />
    ),
  },
];


/* ============================================================================
 * SailForm component
 * ==========================================================================*/
const SailForm = forwardRef(function SailForm(
   {
    compact = false,
    general = {},
    attributes = {},
    calculated = {},
    onReturn,
    onCheck,
    onSubmit,
  },
  ref
) {
  const fields = useMemo(
    () => (compact ? buildDiscrepancyFields() : buildFields()),
    [compact]
  );
  return (
    <FormBase
      ref={ref}
      title="Shade Sail"
      fields={fields}
      defaults={DEFAULTS}
      general={{ enabled: !compact, ...general }}
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



















function UnderfabricCablesEditor({ formData, onChange }) {
  const pointCount = formData.pointCount ?? 4;
  const points = React.useMemo(
    () => Array.from({ length: pointCount }, (_, i) => getPointLabel(i)),
    [pointCount]
  );

  const allowedPairs = React.useMemo(() => makeDiagonals(pointCount), [pointCount]);
  const norm = (a, b) => [a, b].sort().join("");

  const rows = formData.ufc ?? [];
  const setRows = (next) => onChange(next);

  // Draft stays put after "Add"
  const firstAllowed =
    allowedPairs.find(([a, b]) => !rows.some(r => norm(r.from, r.to) === norm(a, b)));
  const [draft, setDraft] = React.useState(() => ({
    from: firstAllowed?.[0] ?? points[0],
    to: firstAllowed?.[1] ?? points[0],
    size: formData.cable ?? 4,
    pocket: false,
  }));

  // Valid targets helper (prevents non-diagonals + duplicates)
  const validTargets = React.useCallback(
    (from, excludeIdx = -1) =>
      points.filter((t) => {
        if (t === from) return false;
        const k = norm(from, t);
        const isAllowed = allowedPairs.some(([a, b]) => norm(a, b) === k);
        const dup = rows.some((r, i) => i !== excludeIdx && norm(r.from, r.to) === k);
        return isAllowed && !dup;
      }),
    [points, allowedPairs, rows]
  );

  const canAdd = draft.from && draft.to && validTargets(draft.from).includes(draft.to);

  const addRow = () => {
    if (!canAdd) return;
    setRows([...rows, { ...draft }]); // keep draft unchanged (per your request)
  };

  const updateRow = (idx, patch) => {
    const next = [...rows];
    next[idx] = { ...next[idx], ...patch };
    setRows(next);
  };

  const removeRow = (idx) => {
    const next = [...rows];
    next.splice(idx, 1);
    setRows(next);
  };

  const totalLen = rows.reduce((acc, r) => {
    const v = getDimensionForPair(formData.dimensions, r.from, r.to);
    return acc + (typeof v === "number" ? v : 0);
  }, 0);

  return (
    <div className="mt-4">
      <b>Under-Fabric Cables (UFC)</b>

      {/* Add new */}
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="block text-sm mb-1">From</span>
          <select
            className="inputCompact"
            value={draft.from}
            onChange={(e) => {
              const from = e.target.value;
              // If current "to" becomes invalid, nudge it to first valid (or empty)
              const valids = validTargets(from);
              setDraft((d) => ({ ...d, from, to: valids.includes(d.to) ? d.to : (valids[0] ?? "") }));
            }}
          >
            {points.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm mb-1">To</span>
          <select
            className="inputCompact"
            value={draft.to}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
          >
            {validTargets(draft.from).length === 0 ? (
              <option value="">No valid target</option>
            ) : (
              validTargets(draft.from).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))
            )}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm mb-1">Size (mm)</span>
          <select
            className="inputCompact"
            value={draft.size}
            onChange={(e) => setDraft((d) => ({ ...d, size: Number(e.target.value) }))}
          >
            {[4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 mb-1">
          <input
            type="checkbox"
            checked={!!draft.pocket}
            onChange={(e) => setDraft((d) => ({ ...d, pocket: e.target.checked }))}
          />
          <span className="text-sm">Internal pocket</span>
        </label>

        <button
          type="button"
          className="px-3 py-1 rounded border"
          onClick={addRow}
          disabled={!canAdd}
        >
          Add UFC
        </button>
      </div>

      {/* Existing rows */}
      <div className="overflow-auto mt-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-semibold border-b">
              <th className="text-left p-1">From</th>
              <th className="text-left p-1">To</th>
              <th className="text-left p-1">Size</th>
              <th className="text-left p-1">Pocket</th>
              <th className="text-left p-1">Length</th>
              <th className="text-left p-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-2 text-sm text-gray-500" colSpan={6}>
                  {pointCount <= 3
                    ? "No valid UFC pairs for triangles."
                    : "No under-fabric cables yet. Add one above."}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const len = getDimensionForPair(formData.dimensions, row.from, row.to);
                const toOptions = validTargets(row.from, idx);
                return (
                  <tr key={idx} className="border-b">
                    <td className="p-1">
                      <select
                        className="inputCompact"
                        value={row.from}
                        onChange={(e) => {
                          const from = e.target.value;
                          const valids = validTargets(from, idx);
                          const nextTo = valids.includes(row.to) ? row.to : (valids[0] ?? "");
                          updateRow(idx, { from, to: nextTo });
                        }}
                      >
                        {points.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1">
                      <select
                        className="inputCompact"
                        value={row.to}
                        onChange={(e) => updateRow(idx, { to: e.target.value })}
                      >
                        {toOptions.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1">
                      <select
                        className="inputCompact"
                        value={row.size ?? 4}
                        onChange={(e) => updateRow(idx, { size: Number(e.target.value) })}
                      >
                        {[4, 5, 6].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1">
                      <input
                        type="checkbox"
                        checked={!!row.pocket}
                        onChange={(e) => updateRow(idx, { pocket: e.target.checked })}
                      />
                    </td>
                    <td className="p-1">{typeof len === "number" ? len.toLocaleString() : "-"}</td>
                    <td className="p-1">
                      <button
                        type="button"
                        className="px-2 py-1 rounded border"
                        aria-label="Remove row"
                        title="Remove"
                        onClick={() => removeRow(idx)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="p-1 font-semibold" colSpan={4}>
                Total UFC Length (from dimensions)
              </td>
              <td className="p-1 font-semibold">
                {totalLen ? totalLen.toLocaleString() : "-"}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
