import React, { useImperativeHandle, forwardRef, useState, useEffect } from 'react';

const numericFields = ['width', 'height', 'length', 'quantity', 'hem', 'seam', 'fabricWidth'];

const DEFAULTS = {
  length: 1000,
  width: 1000,
  height: 1000,
  quantity: 2,
  hem: 20,
  seam: 20,
  fabricWidth: 1370,
};

const Form = forwardRef((
  { 
    attributes = {}, 
    calculated = {}, 
    showFabricWidth = false,
    onReturn,      // optional
    onCheck,       // optional
    onSubmit,      // optional
  }, ref) => {
  const [formData, setFormData] = useState(() => ({
    ...DEFAULTS,
    ...attributes,
  }));

  // Log whenever props change
  useEffect(() => {
    console.log('[Form] attributes received:', attributes);
  }, [attributes]);

  useEffect(() => {
    console.log('[Form] calculated received:', calculated);
  }, [calculated]);

  useImperativeHandle(ref, () => ({
    getData: () => {
      const cleaned = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          numericFields.includes(key) ? Number(value) || 0 : value,
        ])
      );
      return cleaned;
    },
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = numericFields.includes(name);
    const newValue = isNumeric ? Number(value) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  

  return (
    <div className="space-y-4 w-[240px]">
      <h3 className="headingStyle">Cover Form</h3>
      {Object.keys(formData).map((key) => {
        if (key === 'fabricWidth') {
          // 👇 Insert internal logic here — covers needs it, others don't
          const shouldShow = true; // default, or make this dynamic

          if (!shouldShow) return null;
        }

        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase());

        return (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              type={numericFields.includes(key) ? 'number' : 'text'}
              name={key}
              value={formData[key]}
              onChange={handleChange}
              className="inputCompact w-full"
            />
          </div>
        );
      })}

      {/* Action buttons (only render if provided) */}
      {(onReturn || onCheck || onSubmit) && (
        <div className="flex items-center gap-2 pt-2">
          {onReturn && (
            <button type="button" className="btnSecondary" onClick={onReturn}>
              Return
            </button>
          )}
          {onCheck && (
            <button
              type="button"
              className="btnPrimary"
              onClick={() => {
                // Pass the latest edited form data up if parent wants it
                const data = (ref && typeof ref !== 'function' && ref.current?.getData?.()) || formData;
                onCheck(data);
              }}
            >
              Check
            </button>
          )}
          {onSubmit && (
            <button
              type="button"
              className="btnAccent"
              onClick={() => {
                const data = (ref && typeof ref !== 'function' && ref.current?.getData?.()) || formData;
                onSubmit(data);
              }}
            >
              Submit
            </button>
          )}
        </div>
      )}

      {calculated && Object.keys(calculated).length > 0 && (
        <div className="space-y-3">
          <h4 className="headingStyle">Calculated</h4>
          <div className="space-y-2">
            {Object.entries(calculated).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1">
                  {key}
                </label>
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

export default Form;
