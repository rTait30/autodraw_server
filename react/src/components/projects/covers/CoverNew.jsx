import React, { useState } from 'react';
import CoverForm from './CoverForm';
import CoverCanvas from './CoverCanvas';

export default function CoverNew() {
  const [width, setWidth] = useState(1000);
  const [mode, setMode] = useState('client'); // You can make this dynamic

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2>Create New Cover Project</h2>
      <div style={{ display: 'flex', gap: '40px' }}>
        <CoverForm width={width} setWidth={setWidth} />
        <CoverCanvas width={width} mode={mode} />
      </div>
    </div>
  );
}