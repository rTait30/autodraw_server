import React from 'react';

export default function CoverForm({ formData, onChange, showFabricWidth = false }) {
  const handleInput = (e) => {
    const { name, value, type } = e.target;
    let newValue = value;
    if (type === 'number' && value !== '') {
      newValue = Number(value);
    }
    onChange({ ...formData, [name]: newValue });
  };

  return (
    <div style={{ width: '200px' }}>
      <h3>Cover Form</h3>
      <label>
        Project Name:
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInput}
          style={{ width: '100%', marginTop: '8px' }}
        />
      </label>
      <label>
        Width (mm):
        <input
          type="number"
          name="width"
          value={formData.width}
          onChange={handleInput}
          style={{ width: '100%', marginTop: '8px' }}
        />
      </label>
      <label>
        Height (mm):
        <input
          type="number"
          name="height"
          value={formData.height}
          onChange={handleInput}
          style={{ width: '100%', marginTop: '8px' }}
        />
      </label>
      <label>
        Length (mm):
        <input
          type="number"
          name="length"
          value={formData.length}
          onChange={handleInput}
          style={{ width: '100%', marginTop: '8px' }}
        />
      </label>
      <label>
        Quantity:
        <input
          type="number"
          name="quantity"
          value={formData.quantity}
          onChange={handleInput}
          style={{ width: '100%', marginTop: '8px' }}
        />
      </label>
      {showFabricWidth && (
        <label>
          Fabric Width (mm):
          <input
            type="number"
            name="fabricWidth"
            value={formData.fabricWidth || ''}
            onChange={handleInput}
            style={{ width: '100%', marginTop: '8px' }}
          />
        </label>
      )}
      <p style={{ fontSize: '0.9em', color: '#666' }}>
        Updates canvas after 2 seconds of no typing.
      </p>
    </div>
  );
}
