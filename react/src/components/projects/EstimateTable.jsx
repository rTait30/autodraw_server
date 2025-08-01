import React, { useEffect, useState } from 'react';
import { getBaseUrl } from '../../utils/baseUrl';

export default function EstimateTable({ schema, data }) {
  const [rowState, setRowState] = useState({});
  const [inputState, setInputState] = useState({});
  const [products, setProducts] = useState({});

  // Helper to evaluate expressions
  function evalExpr(expr, context = {}) {
    try {
      return Function("data", `"use strict"; return (${expr});`)(context.data);
    } catch {
      return '';
    }
  }

  // Fetch SKUs from schema, then load products from API
  useEffect(() => {
    const allSkus = [];
    Object.values(schema).forEach(rows => {
      rows.forEach(row => {
        if (row.type === 'sku' && row.sku) allSkus.push(row.sku);
      });
    });

    if (allSkus.length === 0) return;

    fetch(getBaseUrl('/api/database/get_by_sku'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus: allSkus })
    })
      .then(res => res.json())
      .then(productList => {
        const bySku = {};
        productList.forEach(p => {
          bySku[p.sku] = p;
        });
        setProducts(bySku);
      })
      .catch(console.error);
  }, [schema]);

  // Initialize row and input state
  useEffect(() => {
    const newRowState = {};
    const newInputState = {};

    Object.entries(schema).forEach(([section, rows]) => {
      newRowState[section] = rows
        .filter(r => r.type === 'row' || r.type === 'sku')
        .map(row => {
          if (row.type === 'sku') {
            const product = products[row.sku] || {};
            return {
              sku: row.sku,
              description: product.name || row.sku,
              quantity: typeof row.quantity === 'string' ? evalExpr(row.quantity, { data }) : row.quantity,
              unitCost: product.price || 0
            };
          } else {
            return {
              description: row.description,
              quantity: typeof row.quantity === 'string' ? evalExpr(row.quantity, { data }) : row.quantity,
              unitCost: typeof row.unitCost === 'string' ? evalExpr(row.unitCost, { data }) : row.unitCost
            };
          }
        });

      rows.forEach(row => {
        if (row.type === 'input') {
          newInputState[row.key] = row.default;
        }
      });
    });

    setRowState(newRowState);
    setInputState(newInputState);
  }, [schema, data, products]);

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

  // Calculate totals and derived values
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
                const subtotalValue = calcContext[`${section.toLowerCase()}Total`] || 0;
                if (row.key) calcContext[row.key] = subtotalValue;
                return (
                  <tr key={idx} className="tableCalc">
                    <td className="tableCell" colSpan={3}>{row.label}</td>
                    <td className="tableCell text-right">{subtotalValue.toFixed(2)}</td>
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
                let value = '';
                try {
                  value = evalExpr(row.expr, { data: calcContext });
                } catch {
                  value = '';
                }
                if (row.key) calcContext[row.key] = value;
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
  );

}
