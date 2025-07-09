import React, { useImperativeHandle, forwardRef, useState, useEffect } from 'react';

const SimpleBoxForm = forwardRef((props, ref) => {
  const [formData, setFormData] = useState({
    width: 100,
    height: 100,
    depth: 100,
  });

  useImperativeHandle(ref, () => ({
    getData: () => formData,
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: Number(value) }));
  };

  return (
    <div>
      <label>
        Width (mm):
        <input type="number" className="inputStyle" name="width" value={formData.width} onChange={handleChange} />
      </label>
      <label>
        Height (mm):
        <input type="number" className="inputStyle" name="height" value={formData.height} onChange={handleChange} />
      </label>
      <label>
        Depth (mm):
        <input type="number" className="inputStyle" name="depth" value={formData.depth} onChange={handleChange} />
      </label>
    </div>
  );
});

export default SimpleBoxForm;
