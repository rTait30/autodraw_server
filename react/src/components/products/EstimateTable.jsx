import React, { useEffect, useState } from 'react';

import { apiFetch } from '../../services/auth';

import SchemaEditor from './SchemaEditor';

// Small, safe-ish evaluator that passes named params into the expression.
// Usage inside schema: e.g. "attributes.width * 2" or "calculated.panelCount * inputs.markup"
function evalExpr(expr, named = {}) {
  try {
    const argNames = Object.keys(named);
    const argValues = Object.values(named);
    const fn = new Function(...argNames, `"use strict"; return (${expr});`);
    const result = fn(...argValues);
    return result;
  } catch (e) {
    console.warn('[EstimateTable] Expression eval error for:', expr, e);
    return 0; // numeric fallback avoids row suppression
  }
}

export default function EstimateTable({
  
  schema = {},
  editedSchema = {},
  onCheck = () => {},
  onReturn = () => {},
  onSubmit = () => {},
  products = [], // Now expects array of products: [{attributes, calculated}, ...]

}) {
  
  const [rowState, setRowState] = useState({}); // Now keyed by productIndex then section
  const [inputState, setInputState] = useState({}); // Now keyed by productIndex
  const [skuProducts, setSkuProducts] = useState({});

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
      setSkuProducts({});
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
        setSkuProducts(bySku);
      })
      .catch(console.error);
  }, [schema]);

  // --- Initialize row + input state for ALL products ---
  useEffect(() => {

    const newRowState = {}; // structure: { productIndex: { section: [rows...] } }
    const newInputState = {}; // structure: { productIndex: { key: value } }

    // Sort products by productIndex
    const sortedProducts = [...products].sort((a, b) => (a.productIndex || 0) - (b.productIndex || 0));

    sortedProducts.forEach((product) => {
      const productIndex = product.productIndex || 0;
      const attrs = product.attributes || {};

      newRowState[productIndex] = {};
      newInputState[productIndex] = {};

      Object.entries(schema).forEach(([section, rows]) => {
        newRowState[productIndex][section] = rows
          .filter((r) => r.type === 'row' || r.type === 'sku')
          .map((row) => {
            // Expressions can reference attributes directly (no "attributes." prefix needed)
            const evalContext = {
              ...attrs,
              inputs: newInputState[productIndex],
              rows: newRowState[productIndex],
            };

            if (row.type === 'sku') {
              const skuProduct = skuProducts[row.sku] || {};
              return {
                sku: row.sku,
                description: skuProduct.name || row.sku,
                quantity:
                  typeof row.quantity === 'string'
                    ? evalExpr(row.quantity, evalContext)
                    : row.quantity,
                unitCost: skuProduct.price || 0,
              };
            }

            return {
              description: row.description,
              quantity:
                typeof row.quantity === 'string'
                  ? evalExpr(row.quantity, evalContext)
                  : row.quantity,
              unitCost:
                typeof row.unitCost === 'string'
                  ? evalExpr(row.unitCost, evalContext)
                  : row.unitCost,
            };
          });

        // default values for input rows
        rows.forEach((row) => {
          if (row.type === 'input') {
            newInputState[productIndex][row.key] = row.default;
          }
        });
      });
    });

    setRowState(newRowState);
    setInputState(newInputState);
  }, [schema, products, skuProducts]);

  // --- Handlers (now take productIndex) ---
  const handleRowChange = (productIndex, section, idx, field, value) => {
    setRowState((prev) => ({
      ...prev,
      [productIndex]: {
        ...prev[productIndex],
        [section]: prev[productIndex][section].map((item, i) =>
          i === idx
            ? { ...item, [field]: field === 'description' ? value : Number(value) }
            : item
        ),
      },
    }));
  };

  const handleInputChange = (productIndex, key, value) => {
    setInputState((prev) => ({
      ...prev,
      [productIndex]: {
        ...prev[productIndex],
        [key]: Number(value),
      },
    }));
  };

  // --- Calculate per-product totals + grand total ---
  // Sort products by productIndex for display
  const sortedProducts = [...products].sort((a, b) => (a.productIndex || 0) - (b.productIndex || 0));

  const productTotals = sortedProducts.map((product) => {
    const productIndex = product.productIndex || 0;
    const attrs = product.attributes || {};
    const productRows = rowState[productIndex] || {};
    const productInputs = inputState[productIndex] || {};

    const sectionTotals = {};
    Object.entries(productRows).forEach(([section, rows]) => {
      sectionTotals[`${section.toLowerCase()}Total`] = rows.reduce(
        (sum, row) => sum + Number(row.quantity) * Number(row.unitCost),
        0
      );
    });

    const baseCost = Object.values(sectionTotals).reduce((a, b) => a + b, 0);

    // Context for calc expressions
    const context = {
      ...sectionTotals,
      baseCost,
    };

    return {
      productIndex,
      name: product.name || `Product ${productIndex + 1}`,
      attributes: attrs,
      inputs: productInputs,
      rows: productRows,
      context,
      baseCost,
    };
  });

  const grandTotal = productTotals.reduce((sum, pt) => sum + pt.baseCost, 0);

  return (
    <div>
      {productTotals.map((productData) => {
        const { productIndex, name, attributes, inputs, rows, context } = productData;

        return (
          <div key={productIndex} style={{ marginBottom: '40px' }}>
            {/* Product Header */}
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
              {name}
            </h3>

            <table className="tableBase">
              <tbody>
                {Object.entries(schema).map(([section, schemaRows]) => (
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
                    {schemaRows.map((row, idx) => {
                      const productRows = rows[section] || [];
                      const item = productRows[idx] || {};

                      if (row.type === 'row' || row.type === 'sku') {
                        // Hide rows with zero or NaN quantity
                        if (!item || Number(item.quantity) === 0 || isNaN(Number(item.quantity))) return null;
                        return (
                          <tr key={idx} className="tableRowHover">
                            <td className="tableCell">{item.description}</td>
                            <td className="tableCell">
                              <input
                                type="number"
                                value={item.quantity ?? ''}
                                onChange={(e) =>
                                  handleRowChange(productIndex, section, idx, 'quantity', e.target.value)
                                }
                                className="inputCompact"
                              />
                            </td>
                            <td className="tableCell">
                              <input
                                type="number"
                                value={item.unitCost ?? ''}
                                onChange={(e) =>
                                  handleRowChange(productIndex, section, idx, 'unitCost', e.target.value)
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
                                value={inputs[row.key] ?? ''}
                                onChange={(e) => handleInputChange(productIndex, row.key, e.target.value)}
                                className="inputCompact"
                              />
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        );
                      }

                      if (row.type === 'calc') {
                        // Expressions can reference attributes directly (all attrs are at top level)
                        const evalContext = {
                          ...attributes,
                          inputs,
                          rows,
                          context,
                        };

                        const value = evalExpr(row.expr, evalContext);

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

                {/* Per-Product Total */}
                <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold' }}>
                  <td className="tableCell" colSpan={3}>
                    {name} Total
                  </td>
                  <td className="tableCell text-right">
                    ${context.baseCost.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Grand Total Section */}
      {products.length > 1 && (
        <table className="tableBase" style={{ marginTop: '20px' }}>
          <tbody>
            <tr style={{ backgroundColor: '#1f2937', color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
              <td className="tableCell" colSpan={3}>
                GRAND TOTAL (All Products)
              </td>
              <td className="tableCell text-right">
                ${grandTotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      )}

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
