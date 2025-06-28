import React, { useState } from 'react';

export default function SailForm({ isEdit = false }) {
  const [projectName, setProjectName] = useState('');

  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px' }}>
      <label>
        Project Name:
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={{ padding: '8px', fontSize: '14px' }}
        />
      </label>
    </form>
  );
}