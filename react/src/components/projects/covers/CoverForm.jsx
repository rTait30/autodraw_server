import React, { useEffect, useState } from 'react';

export default function CoverForm({ onChange, showFabricWidth = false }) {
  const [formData, setFormData] = useState(() => ({
    name: '',
    width: 1000,
    height: 1000,
    length: 1000,
    quantity: 2,
    hem: 20,
    seam: 20,
    ...(showFabricWidth && { fabricWidth: 1370 }),
  }));

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const handleInput = (e) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' && value !== '' ? Number(value) : value;
    const updated = { ...formData, [name]: newValue };
    setFormData(updated);
  };

  return (
    <div style={{ width: '200px' }}>
      <h3>Cover Form</h3>
      {Object.keys(formData).map((key) => {
        if (key === 'fabricWidth' && !showFabricWidth) return null;
        const isNumber = typeof formData[key] === 'number';
        return (
          <label key={key} style={{ display: 'block', marginTop: '10px' }}>
            {key[0].toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
            <input
              type={isNumber ? 'number' : 'text'}
              name={key}
              value={formData[key]}
              onChange={handleInput}
              style={{ width: '100%', marginTop: '5px' }}
            />
          </label>
        );
      })}
      <p style={{ fontSize: '0.9em', color: '#666' }}>
        Updates canvas after 2 seconds of no typing.
      </p>
    </div>
  );
}
