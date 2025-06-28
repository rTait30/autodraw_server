import React from 'react';
import SailForm from './SailForm';
import SailCanvas from './SailCanvas';

export default function SailEdit() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2>Edit Shade Sail Project</h2>
      <SailForm isEdit />
      <SailCanvas />
    </div>
  );
}