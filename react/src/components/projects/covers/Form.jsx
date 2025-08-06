import React, { useImperativeHandle, forwardRef, useState, useEffect } from 'react';

const numericFields = ['width', 'height', 'length', 'quantity', 'hem', 'seam', 'fabricWidth'];

const CoverForm = forwardRef(({ showFabricWidth = false }, ref) => {
  const [formData, setFormData] = useState(() => ({
    length: 1000,
    width: 1000,
    height: 1000,
    quantity: 2,
    hem: 20,
    seam: 20,
    fabricWidth: 1370,
  }));

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
      <h3 className="text-lg font-semibold mb-2">Cover Form</h3>
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
              className="inputStyle w-full"
            />
          </div>
        );
      })}
    </div>
  );
});

export default CoverForm;
