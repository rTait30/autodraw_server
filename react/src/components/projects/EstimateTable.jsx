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

export default function EstimateTable({ schema, data }) {
  // Helper to evaluate expressions
  function evalExpr(expr, context = {}) {

    console.log('Evaluating:', expr, 'with context:', context);
    try {
      return Function("data", `"use strict"; return (${expr});`)(context.data);
    } catch {
      return '';
    }
  }

  // State for editable rows and inputs
  const [rowState, setRowState] = React.useState({});
  const [inputState, setInputState] = React.useState({});

  // Initialize state from schema and data
  React.useEffect(() => {
    const newRowState = {};
    const newInputState = {};
    Object.entries(schema).forEach(([section, rows]) => {
      newRowState[section] = rows
        .filter(r => r.type === 'row')
        .map(row => ({
          description: row.description,
          quantity: typeof row.quantity === 'string'
            ? evalExpr(row.quantity, { data })
            : row.quantity,
          unitCost: typeof row.unitCost === 'string'
            ? evalExpr(row.unitCost, { data })
            : row.unitCost
        }));
      rows.forEach(row => {
        if (row.type === 'input') {
          newInputState[row.key] = row.default;
        }
      });
    });
    setRowState(newRowState);
    setInputState(newInputState);
  }, [schema, data]);

  // Handlers
  const handleRowChange = (section, idx, field, value) => {
    setRowState(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === idx ? { ...item, [field]: field === "description" ? value : Number(value) } : item
      )
    }));
  };
  const handleInputChange = (key, value) => {
    setInputState(prev => ({
      ...prev,
      [key]: Number(value)
    }));
  };

  // Calculate totals and context for calcs
  const calcContext = {};
  Object.entries(rowState).forEach(([section, rows]) => {
    calcContext[section] = rows;
    calcContext[`${section.toLowerCase()}Total`] = rows.reduce(
      (sum, row) => sum + (Number(row.quantity) * Number(row.unitCost)), 0
    );
  });
  calcContext.baseCost = Object.keys(rowState).reduce(
    (sum, section) => sum + (calcContext[`${section.toLowerCase()}Total`] || 0), 0
  );
  Object.assign(calcContext, inputState);

  return (
    <table style={tableStyle}>
      <tbody>
        {Object.entries(schema).map(([section, rows]) => (
          <React.Fragment key={section}>
            <tr>
              <td colSpan={4} style={headingStyle}>{section}</td>
            </tr>
            {rows.map((row, idx) => {
              if (row.type === 'row') {
                const item = rowState[section]?.[idx] || {};
                return (
                  <tr key={idx}>
                    <td>{item.description}</td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity !== undefined && item.quantity !== null ? item.quantity : ''}
                        onChange={e => handleRowChange(section, idx, 'quantity', e.target.value)}
                        style={{ width: "80px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.unitCost !== undefined && item.unitCost !== null ? item.unitCost : ''}
                        onChange={e => handleRowChange(section, idx, 'unitCost', e.target.value)}
                        style={{ width: "80px" }}
                      />
                    </td>
                    <td>
                      {(Number(item.quantity) * Number(item.unitCost)).toFixed(2)}
                    </td>
                  </tr>
                );
              }
              if (row.type === 'subtotal') {
                const subtotalValue = calcContext[`${section.toLowerCase()}Total`] || 0;
                // If a key is provided, store the subtotal in calcContext
                if (row.key) {
                  calcContext[row.key] = subtotalValue;
                }
                return (
                  <tr key={idx}>
                    <td style={tdStyle}><b>{row.label}</b></td>
                    <td colSpan={3}><b>{subtotalValue.toFixed(2)}</b></td>
                  </tr>
                );
              }
              if (row.type === 'input') {
                return (
                  <tr key={idx}>
                    <td style={tdStyle}>{row.label}</td>
                    <td>
                      <input
                        type="number"
                        value={inputState[row.key] !== undefined && inputState[row.key] !== null ? inputState[row.key] : ''}
                        onChange={e => handleInputChange(row.key, e.target.value)}
                        style={{ width: "60px" }}
                      />
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                );
              }
              if (row.type === 'calc') {
                let value = '';
                try {
                  value = evalExpr(row.expr, { data: calcContext });
                } catch {
                  value = '';
                }
                // Always store the result if there's a key
                if (row.key) {
                  calcContext[row.key] = value;
                  console.log(`Calculated ${row.key}:`, value);
                }
                return (
                  <tr key={idx}>
                    <td style={tdStyle}><b>{row.label}</b></td>
                    <td colSpan={2}></td>
                    <td style={{ textAlign: 'right' }}>
                      <b>{typeof value === 'number' ? value.toFixed(2) : value}</b>
                    </td>
                  </tr>
                );
              }
              return null;
            })}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}
