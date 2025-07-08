import React from 'react';

export default function SimpleBoxForm({ formData, onChange }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...formData, [name]: Number(value) });
  };

  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
      <label>
        Width (mm):
        <input type="number" name="width" value={formData.width || ''} onChange={handleChange} />
      </label>
      <label>
        Height (mm):
        <input type="number" name="height" value={formData.height || ''} onChange={handleChange} />
      </label>
      <label>
        Depth (mm):
        <input type="number" name="depth" value={formData.depth || ''} onChange={handleChange} />
      </label>
    </form>
  );
}
