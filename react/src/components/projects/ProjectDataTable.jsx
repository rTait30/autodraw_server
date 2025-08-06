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
  attributes,
  setAttributes,
  calculated,
  onCheck,
  onSubmit,
  onReset,
  setProject,
}) {
  if (!project) return null;

  // Editable for all fields, including nested JSON
  const handleChange = (data, setData, path, value) => {
    const keys = path.split('.');
    const newData = { ...data };
    let obj = newData;
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof obj[keys[i]] !== 'object' || obj[keys[i]] === null) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setData(newData);
  };

  const renderEditableRows = (data, setData, section, parentKey = '') =>
    Object.entries(data).map(([key, value]) => (
      <tr key={`${section}-${parentKey}${key}`}>
        <td style={tdStyle}>{parentKey ? `${parentKey}.${key}` : key}</td>
        <td style={tdStyle}>
          {typeof value === 'object' && value !== null ? (
            <table style={{ width: '100%', background: '#f9f9f9', margin: '2px 0' }}>
              <tbody>
                {renderEditableRows(value, setData, section, parentKey ? `${parentKey}.${key}.` : `${key}.`)}
              </tbody>
            </table>
          ) : (
            <input
              type="text"
              value={value ?? ''}
              onChange={e => handleChange(data, setData, parentKey ? `${parentKey}${key}` : key, e.target.value)}
              style={{ width: '80%', padding: '4px', border: '1px solid #ccc' }}
            />
          )}
        </td>
      </tr>
    ));

  // Non-editable rows for calculated fields
  const renderReadOnlyRows = (data, parentKey = '') =>
    Object.entries(data).map(([key, value]) => (
      <tr key={`calculated-${parentKey}${key}`}>
        <td style={tdStyle}>{parentKey ? `${parentKey}.${key}` : key}</td>
        <td style={tdStyle}>
          {typeof value === 'object' && value !== null ? (
            <table style={{ width: '100%', background: '#f9f9f9', margin: '2px 0' }}>
              <tbody>
                {renderReadOnlyRows(value, parentKey ? `${parentKey}.${key}.` : `${key}.`)}
              </tbody>
            </table>
          ) : (
            <span>{value ?? ''}</span>
          )}
        </td>
      </tr>
    ));

  // Project data (excluding attributes and calculated)
  const projectData = {};
  for (const [key, value] of Object.entries(project)) {
    if (key !== 'attributes' && key !== 'calculated') {
      projectData[key] = value;
    }
  }

  return (
    <div style={{ maxWidth: '800px', overflowX: "auto" }}>
      <table className="tableBase">
        <tbody>
          <tr><td style={headingStyle} colSpan="2">Project Data</td></tr>
          {renderEditableRows(projectData, setProject, 'project')}

          <tr><td style={headingStyle} colSpan="2">Project Attributes</td></tr>
          {renderEditableRows(attributes, setAttributes, 'attributes')}

          <tr><td style={headingStyle} colSpan="2">Calculated</td></tr>
          {renderReadOnlyRows(calculated)}

          <tr>
            <td colSpan="2" style={{ textAlign: 'right', padding: '8px' }}>
              <button onClick={onReset} style={{ marginRight: '8px' }}>Return</button>
              <button onClick={onCheck} style={{ marginRight: '8px' }}>Check</button>
              <button onClick={onSubmit}>Submit</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
