import React, { useImperativeHandle, forwardRef, useEffect, useMemo, useState } from 'react';

/**
 * Field schema item shape:
 * {
 *   name: 'width',
 *   label: 'Width',
 *   type: 'number' | 'text' | 'select' | 'textarea' | 'custom',
 *   options?: [{label, value}], // for select
 *   placeholder?: string,
 *   defaultValue?: any,
 *   visible?: (formData) => boolean, // optional visibility rule
 *   readOnly?: boolean,
 *   disabled?: boolean,
 *   min?: number, max?: number, step?: number, // number inputs
 *   transformOut?: (value, formData) => any,  // run on getData()
 *   render?: (props) => ReactNode,            // type === 'custom'
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
    className: "inputCompact w-full",
    placeholder,
    readOnly,
    disabled,
  };

  

  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}

      {type === 'number' && <input type="number" {...common} min={min} max={max} step={step} />}
      {type === 'text'   && <input type="text" {...common} />}
      {type === 'textarea' && <textarea {...common} rows={3} />}
      {type === 'select' && (
        <select {...common}>
          {options.map((opt) => (
            <option key={opt.value ?? opt.label} value={opt.value ?? opt.label}>
              {opt.label ?? String(opt.value)}
            </option>
          ))}
        </select>
      )}

      {type === 'custom' && render && render({
        name,
        value,
        onChange,      // <-- updates THIS field's value
        formData,
        setField,      // <-- lets custom blocks set ANY field (e.g., pointCount)
      })}
    </div>
  );
}



const FormBase = forwardRef(({
  title = 'Form',
  fields = [],
  defaults = {},
  attributes = {},
  calculated = {},
  showCalculated = true,
  onReturn,
  onCheck,
  onSubmit,
  debug = false,        // keep your console logs opt-in
}, ref) => {
  // derive initial values once from defaults + attributes + field defaults
  const initial = useMemo(() => {
    const byFieldDefaults = fields.reduce((acc, f) => {
      if (f.defaultValue !== undefined) acc[f.name] = f.defaultValue;
      return acc;
    }, {});
    return { ...byFieldDefaults, ...defaults, ...attributes };
  }, [fields, defaults, attributes]);

  

  const [formData, setFormData] = useState(initial);

  useEffect(() => {
    // If attributes change from the parent, merge into state (do not blow away user edits blindly).
    setFormData((prev) => ({ ...prev, ...attributes }));
    if (debug) console.log('[FormBase] attributes received:', attributes);
  }, [attributes, debug]);

  useEffect(() => {
    if (debug) console.log('[FormBase] calculated received:', calculated);
  }, [calculated, debug]);

  // expose getData() like your current API, with per-field transformOut support
  useImperativeHandle(ref, () => ({
    getData: () => {
      const out = { ...formData };
      for (const f of fields) {
        if (!(f.name in out)) continue;
        const raw = out[f.name];
        // Apply transformOut if provided, otherwise coerce numbers for number type
        out[f.name] = f.transformOut
          ? f.transformOut(raw, formData)
          : (f.type === 'number' ? (Number(raw) || 0) : raw);
      }
      return out;
    },
    setData: (partial) => setFormData((prev) => ({ ...prev, ...partial })),
    resetToInitial: () => setFormData(initial),
  }));

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheck = () => {
    const data = ref && typeof ref !== 'function' && ref.current?.getData?.()
      ? ref.current.getData()
      : formData;
    onCheck?.(data);
  };

  const handleSubmit = () => {
    const data = ref && typeof ref !== 'function' && ref.current?.getData?.()
      ? ref.current.getData()
      : formData;
    onSubmit?.(data);
  };

  // compute visible fields
  const visibleFields = fields.filter(f => (typeof f.visible === 'function' ? f.visible(formData) : true));

    const setField = (key, val) =>
        setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-4 w-100%">
      <h3 className="headingStyle">{title}</h3>



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
            <button type="button" className="btnSecondary" onClick={onReturn}>
              Return
            </button>
          )}
          {onCheck && (
            <button type="button" className="btnPrimary" onClick={handleCheck}>
              Check
            </button>
          )}
          {onSubmit && (
            <button type="button" className="btnAccent" onClick={handleSubmit}>
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
