import React, { useImperativeHandle, forwardRef, useEffect, useMemo, useState, useRef } from 'react';
import { apiFetch } from '../../services/auth';
import { GeneralSection } from './GeneralSection';

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


const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: "",
  due_date: "",
  info: "",
});

export default function FormBase({
  ref,
  role = 'client',                  // <-- pass role so General can decide visibility
  generalDataHydrate = {
    name: '',
    client_id: '',
    due_date: '',
    info: ''
  },
  formConfig = {},
  attributesHydrate = {},
  calculatedHydrate = {},
  onReturn = null,
  onCheck = null,
  onSubmit = null,                  // function to get calculated data from stepper
  showCalculated = false,
  debug = false,
  }) {

  const generalRef = useRef(null);

  const [config, setConfig] = useState(formConfig);

  const [generalData, setGeneralData] = useState(() => ({
    ...GENERAL_DEFAULTS,
    ...(generalDataHydrate ?? {}),
  }));
  
  const [attributes, setAttributes] = useState(attributesHydrate);
  const [calculated, setCalculated] = useState(calculatedHydrate);

  console.log("generalData (FormBase):", generalData);

  useImperativeHandle(ref, () => ({
    getValues: () => ({ general: generalData }),
  }), [generalData]);

  return (
    <div className="space-y-4 w-100%">
    
      <h4 className="headingStyle text-red-400">General</h4>
      <GeneralSection data={generalData} setData={setGeneralData} />

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
};
