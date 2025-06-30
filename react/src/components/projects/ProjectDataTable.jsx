import React, { useState } from 'react';

// Table styles
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "15px",
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

export default function ProjectDataTable({ project, role }) {
  if (!project) return null;

  const isEstimator = role === 'estimator';

  // Separate fields
  const projectData = {};
  const attributes = project.attributes || {};
  const calculated = project.calculated || {};

  for (const [key, value] of Object.entries(project)) {
    if (key !== 'attributes' && key !== 'calculated') {
      projectData[key] = value;
    }
  }

  // Render section rows
  const renderRows = (data, section, editable = false) =>
    Object.entries(data).map(([key, value]) => (
      <tr key={`${section}-${key}`}>
        <td style={tdStyle}>{key}</td>
        <td style={tdStyle}>
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </td>
      </tr>
    ));

  return (
    <table style={tableStyle}>
      <tbody>
        <tr>
          <td style={headingStyle}>Project Data</td>
        </tr>
        {renderRows(projectData, 'project', false)}

        <tr>
          <td style={headingStyle}>Project Attributes</td>
        </tr>
        {renderRows(attributes, 'attributes', false)}

        {isEstimator && (
          <>
            <tr>
              <td style={headingStyle}>Calculations</td>
            </tr>
            {renderRows(calculated, 'calculations', false)}
          </>
        )}
      </tbody>
    </table>
  );
}