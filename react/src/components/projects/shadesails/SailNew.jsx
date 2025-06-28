import React from 'react';
import SailForm from './SailForm';
import SailCanvas from './SailCanvas';

export default function SailNew() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2>Create New Shade Sail Project</h2>
      <SailForm />
      <SailCanvas />
    </div>
  );
}
