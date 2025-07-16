import React from 'react';

const tableStyle = {
  width: "auto",
  borderCollapse: "collapse",
  maxWidth: "800px",
  fontSize: "15px",
  tableLayout: "fixed"
};
const thStyle = {
  background: "#f7f7f7",
  fontWeight: "bold",
  padding: "8px",
  borderBottom: "1px solid #ccc",
  textAlign: "left",
};
const tdStyle = {
  padding: "8px",
  borderBottom: "1px solid #eee",
  textAlign: "left",
};
const headingStyle = {
  padding: "8px",
  borderBottom: "1px solid #eee",
  textAlign: "left",
  fontWeight: "bold",
  fontSize: "18px",
};

export default function ProjectDataTable({
  project,
  role,
  attributes,
  setAttributes,
  calculated,
  onCheck,
  onSubmit,
  onReset
}) {
  if (!project) return null;

  const isEstimator = role !== 'client';

  const projectData = {};
  for (const [key, value] of Object.entries(project)) {
    if (key !== 'attributes' && key !== 'calculated') {
      projectData[key] = value;
    }
  }

  const renderStaticRows = (data, section) =>
    Object.entries(data).map(([key, value]) => (
      <tr key={`${section}-${key}`}>
        <td style={tdStyle}>{key}</td>
        <td style={tdStyle}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
      </tr>
    ));

  const renderEditableRows = (data) =>
    Object.entries(data).map(([key, value]) => (
      <tr key={`attributes-${key}`}>
        <td style={tdStyle}>{key}</td>
        <td style={tdStyle}>
          {isEstimator ? (
            <input
              type="text"
              value={value ?? ''}
              onChange={e => setAttributes(prev => ({ ...prev, [key]: e.target.value }))}
              style={{ width: '20%', padding: '4px', border: '1px solid #ccc' }}
            />
          ) : (
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          )}
        </td>
      </tr>
    ));

  return (
    <div style={{ maxWidth: '800px', overflowX: "auto" }}>
    <table style={tableStyle}>
      <tbody>
        <tr><td style={headingStyle} colSpan="2">Project Data</td></tr>
        {renderStaticRows(projectData, 'project')}

        <tr><td style={headingStyle} colSpan="2">Project Attributes</td></tr>
        {renderEditableRows(attributes)}

        {isEstimator && (
          <tr>
            <td colSpan="2" style={{ textAlign: 'right', padding: '8px' }}>
              <button onClick={onReset} style={{ marginRight: '8px' }}>Return</button>
              <button onClick={onCheck} style={{ marginRight: '8px' }}>Check</button>
              <button onClick={onSubmit}>Submit</button>
            </td>
          </tr>
        )}

        {isEstimator && calculated && Object.keys(calculated).length > 0 && (
          <>
            <tr><td style={headingStyle} colSpan="2">Calculated</td></tr>
            {renderStaticRows(calculated, 'calculated')}
          </>
        )}
      </tbody>
    </table>
    </div>
  );
}
