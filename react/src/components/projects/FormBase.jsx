import React, { useImperativeHandle, useState } from 'react';
import { apiFetch } from '../../services/auth';
import { GeneralSection } from './GeneralSection';

function FieldRenderer({ label, type, value, onChange, min, max, step, placeholder, readOnly, disabled, options, render, field, name, formData, setField }) {
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
      {type === 'number' && <input type="number" {...common} min={min} max={max} step={step} />}
      {type === 'text' && <input type="text" {...common} />}
      {type === 'textarea' && <textarea {...common} rows={3} />}
      {type === 'select' && (
        <select {...common}>
          {options?.map((opt) => (
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

const GENERAL_DEFAULTS = Object.freeze({
  name: "",
  client_id: "winlloyd",
  due_date: "",
  info: "",
});

// helper: build { [name]: default } from schema
const makeAttrDefaults = (cfg) => {
  const fields = Array.isArray(cfg?.fields) ? cfg.fields : [];
  return Object.fromEntries(
    fields.map(f => {
      let def = f.default;
      if (f.type === 'checkbox') def = !!def;
      return [f.name, def];
    })
  );
};

function FormBase({
  formRef,
  role = 'client',
  generalDataHydrate = {
    name: '',
    client_id: 'winlloyd',
    due_date: '',
    info: ''
  },
  formConfig = { fields: [] }, // Default to empty fields array
  attributesHydrate = {},
  calculatedHydrate = {},
  onReturn = null,
  onCheck = null,
  onSubmit = null,
  showCalculated = false,
  debug = false,
}) {
  const [config, setConfig] = useState(formConfig);
  const [generalData, setGeneralData] = useState(() => ({
    ...GENERAL_DEFAULTS,
    ...(generalDataHydrate ?? {}),
  }));
  const [attributes, setAttributes] = useState(() => ({
    ...makeAttrDefaults(formConfig),
    ...attributesHydrate,
  }));
  const [calculated, setCalculated] = useState(calculatedHydrate);

  if (debug) {
    console.log("generalData (FormBase):", generalData);
    console.log("attributes (FormBase):", attributes);
  }

  useImperativeHandle(formRef, () => ({
    getValues: () => ({
      general: generalData,
      attributes: attributes
    }),
  }), [generalData, attributes]);

  const handleCheck = () => {
    if (onCheck) onCheck();
  };

  const handleSubmit = () => {
    if (onSubmit) onSubmit();
  };

  return (
    <div className="space-y-4 w-full">
      <h4 className="headingStyle text-red-400">General</h4>
      <GeneralSection data={generalData} setData={setGeneralData} />

      {Array.isArray(formConfig.fields) && formConfig.fields.length > 0 ? (
        formConfig.fields.map((field) => (
          <FieldRenderer
            key={field.name}
            {...field}
            value={attributes[field.name]}
            onChange={(val) =>
              setAttributes((prev) => ({ ...prev, [field.name]: val }))
            }
          />
        ))
      ) : (
        <p>No fields defined in form configuration.</p>
      )}

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
}

export default FormBase;
