import React, { useState } from 'react';

export default function SchemaEditor({ schema, setSchema }) {
  const [text, setText] = React.useState(JSON.stringify(schema, null, 2));
  const [error, setError] = React.useState(null);

  // Only update textarea if schema changes from outside (not on every keystroke)
  React.useEffect(() => {
    // Replace \\n and \\t with real characters for editing
    const pretty = JSON.stringify(schema, null, 2)
      //.replace(/\\n/g, '\n')
      //.replace(/\\t/g, '\t');
    setText(pretty);
  }, [schema]);

  const handleChange = (e) => {
    setText(e.target.value);
    setError(null);
  };

  const handleUpdate = () => {
    try {
      // Convert real newlines/tabs back to escaped for JSON.parse
      const safe = text
        //.replace(/\n/g, '\\n')
        //.replace(/\t/g, '\\t');
      const newSchema = JSON.parse(safe);
      setSchema(newSchema);
      setError(null);
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 'none',
        minWidth: 0,
        display: 'block',
        padding: 0,
        margin: 0,
      }}
    >
      <textarea
        value={text}
        onChange={handleChange}
        rows={20}
        style={{
          width: '100%',
          maxWidth: 'none',
          minWidth: 0,
          display: 'block',
          fontFamily: 'monospace',
          fontSize: 13,
          boxSizing: 'border-box',
          padding: 8,
          margin: 0,
          resize: 'vertical'
        }}
      />
      <div style={{ marginTop: 8 }}>
        <button onClick={handleUpdate}>Update Schema</button>
        {error && <span style={{ color: 'red', marginLeft: 16 }}>{error}</span>}
      </div>
    </div>
  );
}