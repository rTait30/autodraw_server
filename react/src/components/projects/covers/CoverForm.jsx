import React, { useState, useEffect } from 'react';

export default function CoverForm({ width, setWidth }) {
  const [widthInput, setWidthInput] = useState(width ?? 1000);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setWidth(Number(widthInput));
    }, 2000);

    return () => clearTimeout(timeout);
  }, [widthInput, setWidth]);

  return (
    <div style={{ width: '200px' }}>
      <h3>Cover Form</h3>
      <label>
        Width (mm):
        <input
          type="number"
          value={widthInput}
          onChange={(e) => setWidthInput(e.target.value)}
          style={{ width: '100%', marginTop: '8px' }}
        />
      </label>
      <p style={{ fontSize: '0.9em', color: '#666' }}>
        Updates canvas after 2 seconds of no typing.
      </p>
    </div>
  );
}