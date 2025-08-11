import React, { useEffect, useState } from 'react';

/**
 * SchemaEditor
 * - schema: the saved (server) schema
 * - editedSchema: the working copy currently in use for preview
 * - onCheck(next): validate & promote textarea JSON -> editedSchema
 * - onReturn(): restore editedSchema back to saved schema
 * - onSubmit(next): (stub ok) persist editedSchema (server not implemented yet)
 */
export default function SchemaEditor({
  schema,
  editedSchema,
  onCheck,
  onReturn,
  onSubmit,
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  // Keep textarea aligned to latest editedSchema (fallback to saved)
  useEffect(() => {
    const src = editedSchema ?? schema ?? {};
    try {
      setDraft(JSON.stringify(src, null, 2));
      setError('');
    } catch {
      setDraft('');
    }
    // only when incoming schema objects change identity
  }, [schema, editedSchema]);

  const handleCheck = () => {
    try {
      const parsed = JSON.parse(draft);
      setError('');
      onCheck?.(parsed);
    } catch (e) {
      setError('Invalid JSON: ' + (e?.message || e));
    }
  };

  const handleReturn = () => {
    setError('');
    onReturn?.();
  };

  const handleSubmit = () => {
    // backend not implemented — still call through for future wiring
    try {
      const parsed = JSON.parse(draft);
      onSubmit?.(parsed);
    } catch (e) {
      setError('Invalid JSON: ' + (e?.message || e));
    }
  };

  return (
    <div style={{ width: '100%', display: 'block' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Estimate Schema (JSON)</div>

      <textarea
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setError(''); }}
        rows={20}
        style={{
          width: '100%',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace',
          fontSize: 13,
          boxSizing: 'border-box',
          padding: 8,
          resize: 'vertical',
          border: '1px solid #ccc',
          borderRadius: 6,
          background: '#fff',
        }}
        spellCheck={false}
      />

      {error ? (
        <div style={{ color: '#b91c1c', marginTop: 6, fontSize: 12 }}>{error}</div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn" onClick={handleCheck}>Check</button>
        <button className="btnSecondary" onClick={handleReturn}>Return</button>
        <button className="btnPrimary" onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  );
}