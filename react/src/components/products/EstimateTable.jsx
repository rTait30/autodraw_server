import React, { useEffect, useState } from 'react';

import { apiFetch } from '../../services/auth';

import SchemaEditor from './SchemaEditor';

// Small, safe-ish evaluator that passes named params into the expression.
// Usage inside schema: e.g. "attributes.width * 2" or "calculated.panelCount * inputs.markup"
function evalExpr(expr, named = {}) {
  try {
    const argNames = Object.keys(named);
    const argValues = Object.values(named);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...argNames, `"use strict"; return (${expr});`);
    return fn(...argValues);
  } catch {
    return '';
  }
}

export default function EstimateTable({
  
  schema = {},
  editedSchema = {},
  onCheck = () => {},
  onReturn = () => {},
  onSubmit = () => {},
  attributes = {},
  calculated = {},

}) {
  
  const [rowState, setRowState] = useState({});
  const [inputState, setInputState] = useState({});
  const [products, setProducts] = useState({});

  const [toggleSchemaEditor, setToggleSchemaEditor] = useState(false);

  // --- Fetch SKUs from schema, then load products from API ---
  useEffect(() => {
    const allSkus = [];
    Object.values(schema).forEach((rows) => {
      rows.forEach((row) => {
        if (row.type === 'sku' && row.sku) allSkus.push(row.sku);
      });
    });

    if (allSkus.length === 0) {
      setProducts({});
      return;
    }

    apiFetch('/database/get_by_sku', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus: allSkus }),
    })
      .then((res) => res.json())
      .then((productList) => {
        const bySku = {};
        productList.forEach((p) => {
          bySku[p.sku] = p;
        });
        setProducts(bySku);
      })
      .catch(console.error);
  }, [schema]);

  // --- Initialize row + input state whenever inputs/products/schema change ---
  useEffect(() => {

    console.log("schema:", schema);
    console.log("attributes:", attributes);
    console.log("calculated:", calculated);

    const newRowState = {};
    const newInputState = {};

    Object.entries(schema).forEach(([section, rows]) => {
      newRowState[section] = rows
        .filter((r) => r.type === 'row' || r.type === 'sku')
        .map((row) => {
          // Build the minimal context available at row init
          const baseNamed = {
            attributes,
            calculated,
            inputs: newInputState,     // may be sparsely filled (ok)
            rows: newRowState,         // section rows will fill as we map
          };

          if (row.type === 'sku') {
            const product = products[row.sku] || {};
            return {
              sku: row.sku,
              description: product.name || row.sku,
              quantity:
                typeof row.quantity === 'string'
                  ? evalExpr(row.quantity, baseNamed)
                  : row.quantity,
              unitCost: product.price || 0,
            };
          }

          return {
            description: row.description,
            quantity:
              typeof row.quantity === 'string'
                ? evalExpr(row.quantity, baseNamed)
                : row.quantity,
            unitCost:
              typeof row.unitCost === 'string'
                ? evalExpr(row.unitCost, baseNamed)
                : row.unitCost,
          };
        });

      // default values for input rows
      rows.forEach((row) => {
        if (row.type === 'input') {
          newInputState[row.key] = row.default;
        }
      });
    });

    setRowState(newRowState);
    setInputState(newInputState);
  }, [schema, attributes, calculated, products]);

  // --- Handlers ---
  const handleRowChange = (section, idx, field, value) => {
    setRowState((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === idx
          ? { ...item, [field]: field === 'description' ? value : Number(value) }
          : item
      ),
    }));
  };

  const handleInputChange = (key, value) => {
    setInputState((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  // --- Calculate totals and derived values (exposed to expressions as `context`) ---
  // Per-section totals + baseCost
  const sectionTotals = {};
  Object.entries(rowState).forEach(([section, rows]) => {
    sectionTotals[`${section.toLowerCase()}Total`] = rows.reduce(
      (sum, row) => sum + Number(row.quantity) * Number(row.unitCost),
      0
    );
  });

  const baseCost = Object.values(sectionTotals).reduce((a, b) => a + b, 0);

  // Full context accessible to "calc" expressions
  const context = {
    ...sectionTotals,
    baseCost,
  };

  return (
    <div>
      <table className="tableBase">
        <tbody>
          {Object.entries(schema).map(([section, rows]) => (
            <React.Fragment key={section}>
              {/* Column Headings */}
              <tr className="tableHeader">
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total</th>
              </tr>

              {/* Section Header */}
              <tr>
                <td colSpan={4} className="tableSection">
                  {section}
                </td>
              </tr>

              {/* Dynamic Rows */}
              {rows.map((row, idx) => {
                const item = rowState[section]?.[idx] || {};

                if (row.type === 'row' || row.type === 'sku') {
                  if (Number(item.quantity) === 0) return null;
                  return (
                    <tr key={idx} className="tableRowHover">
                      <td className="tableCell">{item.description}</td>
                      <td className="tableCell">
                        <input
                          type="number"
                          value={item.quantity ?? ''}
                          onChange={(e) =>
                            handleRowChange(section, idx, 'quantity', e.target.value)
                          }
                          className="inputCompact"
                        />
                      </td>
                      <td className="tableCell">
                        <input
                          type="number"
                          value={item.unitCost ?? ''}
                          onChange={(e) =>
                            handleRowChange(section, idx, 'unitCost', e.target.value)
                          }
                          className="inputCompact"
                        />
                      </td>
                      <td className="tableCell text-right font-mono">
                        {(Number(item.quantity) * Number(item.unitCost)).toFixed(2)}
                      </td>
                    </tr>
                  );
                }

                if (row.type === 'subtotal') {
                  const subtotalValue = context[`${section.toLowerCase()}Total`] || 0;
                  return (
                    <tr key={idx} className="tableCalc">
                      <td className="tableCell" colSpan={3}>
                        {row.label}
                      </td>
                      <td className="tableCell text-right">
                        {subtotalValue.toFixed(2)}
                      </td>
                    </tr>
                  );
                }

                if (row.type === 'input') {
                  return (
                    <tr key={idx} className="bg-gray-50">
                      <td className="tableCell">{row.label}</td>
                      <td className="tableCell">
                        <input
                          type="number"
                          value={inputState[row.key] ?? ''}
                          onChange={(e) => handleInputChange(row.key, e.target.value)}
                          className="inputCompact"
                        />
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  );
                }

                if (row.type === 'calc') {
                  // Expressions can reference:
                  //  - attributes.*, calculated.*, inputs.*, rows.*, context.*
                  const value = evalExpr(row.expr, {
                    attributes,
                    calculated,
                    inputs: inputState,
                    rows: rowState,
                    context,
                  });

                  return (
                    <tr key={idx} className="tableCalc">
                      <td className="tableCell">{row.label}</td>
                      <td colSpan={2}></td>
                      <td className="tableCell text-right font-bold">
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

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>

        <button onClick={() => submitQuote(project.id, value)} className="buttonStyle">
          Use Suggested Price
        </button>

        <button onClick={() => submitQuote(project.id, value)} className="buttonStyle">
          Use price: todo
        </button>

      </div>

      <div>

        <button
          className="mt-4 underline text-sm text-blue-600"
          onClick={() => setToggleSchemaEditor(!toggleSchemaEditor)}
        >
          {toggleSchemaEditor ? 'Close Schema Editor' : 'Edit Estimate Schema'}
        </button>

        {toggleSchemaEditor && (
          <SchemaEditor
            schema={schema}
            editedSchema={editedSchema}
            onCheck={onCheck}
            onReturn={onReturn}
            onSubmit={onSubmit}
          />
        )}
      </div>
   </div>
  );
}

async function submitQuote(projectId, value) {
  // Implement the function to submit the quote
  console.log(`Submitting quote for project ${projectId} with value ${value}`);
}
