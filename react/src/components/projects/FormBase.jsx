import React, {
  useImperativeHandle, forwardRef, useEffect, useMemo, useState
} from 'react';
import { apiFetch } from '../../services/auth';

/**
 * Field schema item shape:
 * {
 *   name: 'width',
 *   label: 'Width',
 *   type: 'number' | 'text' | 'select' | 'textarea' | 'custom',
 *   options?: [{label, value}],
 *   placeholder?: string,
 *   defaultValue?: any,
 *   visible?: (formData) => boolean,
 *   readOnly?: boolean,
 *   disabled?: boolean,
 *   min?: number, max?: number, step?: number,
 *   transformOut?: (value, formData) => any,
 *   render?: (props, field) => ReactNode, // type === 'custom'
 * }
 */

function FieldRenderer({ field, value, onChange, formData, setField }) {
  const {
    name, label, type = 'text', options = [], placeholder,
    readOnly, disabled, min, max, step, render
  } = field;

  const common = {
    name,
    value: value ?? '',
    onChange: (e) => onChange(
      type === 'number' ? Number(e.target.value) : e.target.value
    ),
    className: 'inputCompact w-full',
    placeholder,
    readOnly,
    disabled,
  };

  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}

      {type === 'number'   && <input type="number" {...common} min={min} max={max} step={step} />}
      {type === 'text'     && <input type="text" {...common} />}
      {type === 'textarea' && <textarea {...common} rows={3} />}
      {type === 'select'   && (
        <select {...common}>
          {options.map((opt) => (
            <option key={opt.value ?? opt.label} value={opt.value ?? opt.label}>
              {opt.label ?? String(opt.value)}
            </option>
          ))}
        </select>
      )}
      {type === 'checkbox' && (
        <input
          type="checkbox"
          name={name}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          // keep styling simple; override if you have a checkbox utility class
          className="h-4 w-4 align-middle"
        />
      )}
      {type === 'custom' && render && render(
        { name, value, onChange, formData, setField },
        field
      )}
    </div>
  );
}

/* -------------------- Built-in General Section -------------------- */
function GeneralSection({ config, formData, setField }) {
  const {
    clientsEndpoint = '/clients',
    showClientForRoles, // if omitted: shown for all non-client roles
  } = config || {};

  const [clients, setClients] = useState([]);

  const role = localStorage.getItem('role')

  const shouldShowClient =
    role && role !== 'client' &&
    (Array.isArray(showClientForRoles) ? showClientForRoles.includes(role) : true);

  useEffect(() => {
    let ignore = false;
    if (!shouldShowClient) {
      setClients([]);
      return;
    }
    (async () => {
      try {
        const res = await apiFetch(clientsEndpoint);
        if (!res.ok) throw new Error('Failed to load clients');
        const data = await res.json();
        if (!ignore) setClients(Array.isArray(data) ? data : []);
      } catch {
        if (!ignore) setClients([]);
      }
    })();
    return () => { ignore = true; };
  }, [shouldShowClient, clientsEndpoint]);

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium mb-1">Project Name</label>
        <input
          type="text"
          className="inputStyle"
          value={formData.name ?? ''}
          onChange={(e) => setField('name', e.target.value)}
        />
      </div>

      {shouldShowClient && (
        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
          <select
            className="inputStyle"
            value={formData.client_id ?? ''}
            onChange={(e) => setField('client_id', e.target.value)}
          >
            <option value="">Select client</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Due Date</label>
        <input
          type="date"
          className="inputStyle"
          value={formData.due_date ?? ''}
          onChange={(e) => setField('due_date', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Info</label>
        <input
          type="text"
          className="inputStyle"
          value={formData.info ?? ''}
          onChange={(e) => setField('info', e.target.value)}
          placeholder="Notes or special instructions"
        />
      </div>
    </div>
  );
}

const GENERAL_DEFAULTS = {
  name: '',
  client_id: '',
  due_date: '',
  info: '',
};

const handleSubmit = async (nextAttributes) => {
  // keep UI state in sync
  setEditedAttributes(nextAttributes);

  // decide which calculated to send
  let calcs;
  // staff: recompute synchronously here so payload is fresh
  calcs = await recalcCalculated(nextAttributes);
  setEditedCalculated(calcs);

  // now submit the exact snapshot you want
  await apiFetch(`/projects/edit/${project.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      editedAttributes: nextAttributes, // use the param, not (possibly stale) state
      editedCalculated: calcs,
    }),
  });
};

const FormBase = forwardRef(({
  title = 'Form',
  role,                  // <-- pass role so General can decide visibility
  fields = [],
  defaults = {},
  general = {},        // optional hydration for General (name/client/due_date/info)
  attributes = {},
  calculated = {},
  showCalculated = true,
  onSubmit,
  onReturn,
  onCheck,
  debug = false,
}, ref) => {
  // Enabled by default unless explicitly disabled
  const generalEnabled = general?.enabled !== false;

  // derive initial values once from field defaults + provided defaults + attributes
  const initial = useMemo(() => {
    const byFieldDefaults = fields.reduce((acc, f) => {
      if (f?.defaultValue !== undefined) acc[f.name] = f.defaultValue;
      return acc;
    }, {});
    // include built-in general defaults so getData() always has those keys
    const base = generalEnabled ? { ...GENERAL_DEFAULTS } : {};
    return { ...base, ...byFieldDefaults, ...defaults, ...general, ...attributes };
  }, [fields, defaults, general, attributes, generalEnabled]);

  const [formData, setFormData] = useState(initial);

  // Rehydrate when `general` changes (same pattern as attributes)
  useEffect(() => {
    if (general && Object.keys(general).length) {
      setFormData(prev => ({ ...prev, ...general }));
      if (debug) console.log('[FormBase] general received:', general);
    }
  }, [general, debug]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, ...attributes }));
    if (debug) console.log('[FormBase] attributes received:', attributes);
  }, [attributes, debug]);

  useEffect(() => {
    if (debug) console.log('[FormBase] calculated received:', calculated);
  }, [calculated, debug]);

  // getData applies transformOut and also coerces client_id to number if present
  useImperativeHandle(ref, () => ({
    getData: () => {
      const out = { ...formData };

      // Coerce client_id
      if ('client_id' in out) {
        const raw = out.client_id;
        out.client_id =
          raw === '' || raw == null ? undefined :
          (Number(raw) || undefined);
      }

      // Per-field transformOut / number coercion
      for (const f of fields) {
        if (!(f.name in out)) continue;
        const raw = out[f.name];
        out[f.name] = f.transformOut
          ? f.transformOut(raw, formData)
          : (f.type === 'number' ? (Number(raw) || 0) : raw);
      }
      
      return out;
    },
    setData: (partial) => setFormData((prev) => ({ ...prev, ...partial })),
    resetToInitial: () => setFormData(initial),
  }));

  const visibleFields = fields.filter(f => (typeof f.visible === 'function' ? f.visible(formData) : true));

  const setField = (key, val) =>
    setFormData(prev => ({ ...prev, [key]: val }));

  const handleCheck = () => {
    onCheck?.(ref?.current?.getData ? ref.current.getData() : formData);
  };
  const handleSubmit = () => {
    onSubmit?.(ref?.current?.getData ? ref.current.getData() : formData);
  };

  return (
    <div className="space-y-4 w-100%">
      <h3 className="headingStyle text-red-400 text-4xl">{title}</h3>

      {generalEnabled && (
        <>
          <h4 className="headingStyle">General</h4>
          <GeneralSection formData={formData} setField={setField} />
        </>
      )}

      <h4 className="headingStyle">Attributes</h4>

      {visibleFields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          value={formData[field.name]}
          onChange={(val) => setFormData(prev => ({ ...prev, [field.name]: val }))}
          formData={formData}
          setField={setField}
        />
      ))}

      {(onReturn || onCheck || onSubmit) && (
        <div className="flex items-center gap-2 pt-2">
          {onReturn && (
            <button type="button" className="buttonStyle" onClick={onReturn}>
              Return
            </button>
          )}
          {onCheck && (
            <button type="button" className="buttonStyle" onClick={handleCheck}>
              Check
            </button>
          )}
          {onSubmit && (
            <button type="button" className="buttonStyle" onClick={handleSubmit}>
              Submit
            </button>
          )}
        </div>
      )}

      {showCalculated && calculated && Object.keys(calculated).length > 0 && (
        <div className="space-y-3">
          <h4 className="headingStyle">Calculated</h4>
          <div className="space-y-2">
            {Object.entries(calculated).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1">{key}</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={String(value ?? '')}
                  className="inputCompact w-full"
                  aria-readonly="true"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default FormBase;
