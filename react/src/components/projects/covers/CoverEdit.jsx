import React from 'react';
import CoverForm from './CoverForm';

export default function CoverEdit() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2>Edit Cover Project</h2>
      <CoverForm isEdit />
    </div>
  );
}