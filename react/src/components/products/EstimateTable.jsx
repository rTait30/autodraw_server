import React, { useEffect, useState } from 'react';

import { apiFetch } from '../../services/auth';

import SchemaEditor from './SchemaEditor';

// Default fallback values if schema does not provide constants
const DEFAULT_CONTINGENCY_PERCENT = 3; // % added to base cost
const DEFAULT_MARGIN_PERCENT = 45; // gross margin %

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
  onTotalChange = () => {},
  products = [], // [{ attributes, calculated, productIndex, name }]
}) {
  
  const [rowState, setRowState] = useState({}); // keyed by productIndex then section
  const [inputState, setInputState] = useState({}); // keyed by productIndex
  const [skuProducts, setSkuProducts] = useState({});
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuFetchKey, setSkuFetchKey] = useState(0); // increment to force re-init
  // Per-product financial parameters
  const initialContingency = schema?._constants?.contingencyPercent ?? DEFAULT_CONTINGENCY_PERCENT;
  const initialMargin = schema?._constants?.marginPercent ?? DEFAULT_MARGIN_PERCENT;
  const [contingencyPercents, setContingencyPercents] = useState({}); // { [productIndex]: value }
  const [marginPercents, setMarginPercents] = useState({}); // { [productIndex]: value }

  const [toggleSchemaEditor, setToggleSchemaEditor] = useState(false);

  // --- Fetch SKUs from schema, then load products from API ---
  
  useEffect(() => {
    const allSkus = [];

    // Only iterate array sections (skip _constants or any non-array entries)
    Object.values(schema)
      .filter((rows) => Array.isArray(rows))
      .forEach((rows) => {
        rows.forEach((row) => {
          if (row.type === "sku" && row.sku) {
            allSkus.push(row.sku);
          }
        });
      });

    if (allSkus.length === 0) {
      setSkuProducts({});
      setSkuLoading(false);
      return;
    }

    setSkuLoading(true);
    apiFetch("/database/get_by_sku", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus: allSkus }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Response JSON:", data);

        // Backend format: { missing: [], newly_added: [], skus: [...] }
        const list = Array.isArray(data && data.skus) ? data.skus : [];

        const bySku = {};
        list.forEach((p) => {
          if (p && p.sku) {
            bySku[p.sku] = {
              sku: p.sku,
              name: p.name,
              costPrice: p.costPrice,
              sellPrice: p.sellPrice,
              data: p.data || {},
            };
          }
        });

        setSkuProducts(bySku);
        setSkuLoading(false);
        setSkuFetchKey(prev => prev + 1); // Force re-initialization
      })
      .catch((err) => {
        console.error("Error loading SKU products", err);
        setSkuProducts({});
        setSkuLoading(false);
      });
  }, [schema]);

  // --- Initialize row + input state for ALL products ---
  useEffect(() => {
    // Don't initialize until SKU data is loaded
    if (skuLoading) return;

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
        if (!Array.isArray(rows)) return; // skip _constants or non-array entries
        // Build computation context - use functional state getter to avoid stale closure
        newRowState[productIndex][section] = rows
          .filter((r) => r.type === 'row' || r.type === 'sku')
          .map((row) => {
            const evalContext = {
              ...attrs,
              inputs: newInputState[productIndex],
              rows: newRowState[productIndex],
              global: {
                contingencyPercent: initialContingency,
                marginPercent: initialMargin,
              },
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
                unitCost: skuProduct.costPrice || 0,
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

        // Default values for custom input rows (not margin/contingency which are global)
        rows.forEach((row) => {
          if (row.type === 'input') {
            newInputState[productIndex][row.key] = row.default;
          }
        });
      });
    });

    setRowState(newRowState);
    setInputState(newInputState);
    
    // Initialize per-product margin/contingency ONLY if product indexes changed
    const productIndexes = sortedProducts.map(p => p.productIndex || 0);
    setContingencyPercents((prev) => {
      const existingIndexes = Object.keys(prev).map(Number).sort();
      const newIndexes = [...productIndexes].sort();
      
      // Only update if indexes actually changed
      if (existingIndexes.length === newIndexes.length && 
          existingIndexes.every((val, i) => val === newIndexes[i])) {
        return prev;
      }
      
      const updated = {};
      productIndexes.forEach((productIndex) => {
        updated[productIndex] = prev[productIndex] ?? initialContingency;
      });
      return updated;
    });
    
    setMarginPercents((prev) => {
      const existingIndexes = Object.keys(prev).map(Number).sort();
      const newIndexes = [...productIndexes].sort();
      
      // Only update if indexes actually changed
      if (existingIndexes.length === newIndexes.length && 
          existingIndexes.every((val, i) => val === newIndexes[i])) {
        return prev;
      }
      
      const updated = {};
      productIndexes.forEach((productIndex) => {
        updated[productIndex] = prev[productIndex] ?? initialMargin;
      });
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, skuProducts, skuLoading, skuFetchKey, products.length]);

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
    const marginPercent = marginPercents[productIndex] ?? initialMargin;
    const contingencyPercent = contingencyPercents[productIndex] ?? initialContingency;

    const sectionTotals = {};
    Object.entries(productRows).forEach(([section, rows]) => {
      sectionTotals[`${section.toLowerCase()}Total`] = rows.reduce(
        (sum, row) => sum + Number(row.quantity) * Number(row.unitCost),
        0
      );
    });

    const baseCost = Object.values(sectionTotals).reduce((a, b) => a + b, 0);
    const contingencyAmount = baseCost * (contingencyPercent / 100);
    const suggestedPrice = (baseCost + contingencyAmount) / (1 - marginPercent / 100);

    // Context for calc expressions (schema calc rows can reference context.sectionTotal & global.*)
    const context = {
      ...sectionTotals,
      baseCost,
    };
    const global = {
      contingencyPercent,
      marginPercent,
      contingencyAmount,
      suggestedPrice,
    };

    return {
      productIndex,
      name: product.name || `Product ${productIndex + 1}`,
      attributes: attrs,
      inputs: productInputs,
      rows: productRows,
      context,
      global,
      baseCost,
      marginPercent,
      contingencyPercent,
    };
  });

  // Grand total should reflect fully loaded product pricing (base + contingency + margin)
  const grandTotal = productTotals.reduce((sum, pt) => sum + (pt.global?.suggestedPrice || 0), 0);

  // Notify parent of total changes
  useEffect(() => {
    onTotalChange(grandTotal);
  }, [grandTotal, onTotalChange]);

  // Show loading state while SKUs are being fetched
  if (skuLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading SKU data from database/CRM...</p>
        <p style={{ fontSize: '14px', color: '#666' }}>This may take a moment for new items.</p>
      </div>
    );
  }

  return (
    <div>
      {productTotals.map((productData) => {
        const { productIndex, name, attributes, inputs, rows, context, global, marginPercent, contingencyPercent } = productData;

        // Handlers for per-product margin/contingency
        const handleContingencyChange = (e) => {
          const value = Number(e.target.value) || 0;
          setContingencyPercents((prev) => ({ ...prev, [productIndex]: value }));
        };
        const handleMarginChange = (e) => {
          const value = Number(e.target.value) || 0;
          setMarginPercents((prev) => ({ ...prev, [productIndex]: value }));
        };

        return (
          <div key={productIndex}>
            {/* Product Header */}
            <h3 className="headingStyle mt-5 text-red-800">
              {name}
            </h3>

            {/* Per-product margin/contingency controls */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                Contingency %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={contingencyPercent}
                  onChange={handleContingencyChange}
                  className="inputCompact"
                  style={{ width: '100px' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                Gross Margin %
                <input
                  type="number"
                  min={0}
                  max={99.9}
                  value={marginPercent}
                  onChange={handleMarginChange}
                  className="inputCompact"
                  style={{ width: '100px' }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setContingencyPercents((prev) => ({ ...prev, [productIndex]: initialContingency }));
                  setMarginPercents((prev) => ({ ...prev, [productIndex]: initialMargin }));
                }}
              >
                Reset Defaults
              </button>
            </div>

            <table className="tableBase">
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th className="tableCell" style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Item</th>
                  <th className="tableCell" style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Qty</th>
                  <th className="tableCell" style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Unit Cost</th>
                  <th className="tableCell text-right" style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(schema)
                  .filter(([, schemaRows]) => Array.isArray(schemaRows))
                  .map(([section, schemaRows]) => {
                    return (
                      <React.Fragment key={section}>
                        <tr>
                          <td colSpan={4} style={{ fontSize: '18px', fontWeight: 'bold' }}>
                            {section}
                          </td>
                        </tr>
                        {schemaRows.map((row, idx) => {
                          const productRows = rows[section] || [];
                          const item = productRows[idx] || {};

                          // Display only populated row/sku entries
                          if (row.type === 'row' || row.type === 'sku') {
                            if (!item || Number(item.quantity) === 0 || isNaN(Number(item.quantity))) return null;
                            return (
                              <tr key={idx} className="tableRowHover">
                                <td className="tableCell">{item.description}</td>
                                <td className="tableCell">
                                  <input
                                    type="number"
                                    value={item.quantity ?? ''}
                                    onChange={(e) => handleRowChange(productIndex, section, idx, 'quantity', e.target.value)}
                                    className="inputCompact"
                                  />
                                </td>
                                <td className="tableCell">
                                  <input
                                    type="number"
                                    value={item.unitCost ?? ''}
                                    onChange={(e) => handleRowChange(productIndex, section, idx, 'unitCost', e.target.value)}
                                    className="inputCompact"
                                  />
                                </td>
                                <td className="tableCell text-right font-mono">
                                  {(Number(item.quantity) * Number(item.unitCost)).toFixed(2)}
                                </td>
                              </tr>
                            );
                          }

                          // Custom input rows (other than global margin/contingency)
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
                            const evalContext = {
                              ...attributes,
                              inputs,
                              rows,
                              context,
                              global,
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

                          // Ignore legacy subtotal rows (auto total shown below)
                          return null;
                        })}
                        {/* Automatic section total */}
                        <tr className="tableCalc" style={{ backgroundColor: '#f3f4f6' }}>
                          <td className="tableCell" colSpan={3}>{section} Total</td>
                          <td className="tableCell text-right">{(context[`${section.toLowerCase()}Total`] || 0).toFixed(2)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}

                {/* Per-Product Total */}
                <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold' }}>
                  <td className="tableCell" colSpan={3}>{name} Base Cost</td>
                  <td className="tableCell text-right">${context.baseCost.toFixed(2)}</td>
                </tr>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <td className="tableCell" colSpan={3}>Contingency ({contingencyPercent}%)</td>
                  <td className="tableCell text-right">${global.contingencyAmount.toFixed(2)}</td>
                </tr>
                <tr style={{ backgroundColor: '#eef2ff', fontWeight: 'bold' }}>
                  <td className="tableCell" colSpan={3}>Suggested Price (Margin {marginPercent}%)</td>
                  <td className="tableCell text-right">${global.suggestedPrice.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Grand Total Section */}
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

// Placeholder for future integration
async function submitQuote(projectId, value) {
  console.log(`Submitting quote for project ${projectId} with value ${value}`);
}
