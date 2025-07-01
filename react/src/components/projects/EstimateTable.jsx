import React, { useState } from 'react';

export default function EstimateTable({ schema, data }) {
  // Helper to evaluate expressions
  function evalExpr(expr, context = {}) {
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
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-300 rounded-lg shadow-sm bg-white">
        <tbody>
          {Object.entries(schema).map(([section, rows]) => (
            <React.Fragment key={section}>
              <tr>
                <td colSpan={4} className="bg-blue-50 text-blue-900 font-bold text-lg px-4 py-3 border-b border-gray-200 rounded-t">
                  {section}
                </td>
              </tr>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-4 py-2 text-left font-semibold">Description</th>
                <th className="px-4 py-2 text-left font-semibold">Quantity</th>
                <th className="px-4 py-2 text-left font-semibold">Unit Cost</th>
                <th className="px-4 py-2 text-left font-semibold">Total</th>
              </tr>
              {rows.map((row, idx) => {
                if (row.type === 'row') {
                  const item = rowState[section]?.[idx] || {};
                  return (
                    <tr key={idx} className="hover:bg-blue-50 transition">
                      <td className="px-4 py-2 border-b border-gray-100">{item.description}</td>
                      <td className="px-4 py-2 border-b border-gray-100">
                        <input
                          type="number"
                          value={item.quantity !== undefined && item.quantity !== null ? item.quantity : ''}
                          onChange={e => handleRowChange(section, idx, 'quantity', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </td>
                      <td className="px-4 py-2 border-b border-gray-100">
                        <input
                          type="number"
                          value={item.unitCost !== undefined && item.unitCost !== null ? item.unitCost : ''}
                          onChange={e => handleRowChange(section, idx, 'unitCost', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </td>
                      <td className="px-4 py-2 border-b border-gray-100 text-right font-mono">
                        {(Number(item.quantity) * Number(item.unitCost)).toFixed(2)}
                      </td>
                    </tr>
                  );
                }
                if (row.type === 'subtotal') {
                  const subtotalValue = calcContext[`${section.toLowerCase()}Total`] || 0;
                  if (row.key) {
                    calcContext[row.key] = subtotalValue;
                  }
                  return (
                    <tr key={idx} className="bg-blue-100">
                      <td className="px-4 py-2 font-semibold" colSpan={3}>{row.label}</td>
                      <td className="px-4 py-2 font-bold text-right">{subtotalValue.toFixed(2)}</td>
                    </tr>
                  );
                }
                if (row.type === 'input') {
                  return (
                    <tr key={idx} className="bg-gray-50">
                      <td className="px-4 py-2">{row.label}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={inputState[row.key] !== undefined && inputState[row.key] !== null ? inputState[row.key] : ''}
                          onChange={e => handleInputChange(row.key, e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                  if (row.key) {
                    calcContext[row.key] = value;
                  }
                  return (
                    <tr key={idx} className="bg-green-50">
                      <td className="px-4 py-2 font-semibold">{row.label}</td>
                      <td colSpan={2}></td>
                      <td className="px-4 py-2 text-right font-bold">
                        {typeof value === 'number' ? value.toFixed(2) : value}
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
    </div>
  );
}