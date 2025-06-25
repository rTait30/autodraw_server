import { renderBase } from './renderBase.js';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

let materials = [];
let labour = [];

export function renderCover(project, role) {
    let html = renderBase(project, role);

    // Get default table data from project/calculated
    const defaults = getDefaultMaterialsAndLabour(project);


    materials = defaults.materials;
    labour = defaults.labour;

    ReactDOM.render(
        <EstimateTable defaultMaterials={materials} defaultLabour={labour} />,
        document.getElementById('cover-table-editable')
    );

    if (role === "estimator" || role === "admin") {
        html += `
        <div class="cover-flex-row" style="display: flex; gap: 32px; margin-top: 24px;">
            <div id="cover-attributes-data" style="min-width:300px;">
                <h4>Project Data</h4>
                <pre>${JSON.stringify(project || {}, null, 2)}</pre>
            </div>
        </div>
        `;
    } else {
        html += `<h4>Cover Attributes</h4>
            <pre>${JSON.stringify(project.attributes || {}, null, 2)}</pre>`;
    }
    return html;
}

function getDefaultMaterialsAndLabour(project) {
    const calc = project.calculated || project.attributes?.calculated || {};
    const attrs = project.attributes || {};

    // Parse numbers safely
    const nestWidth = Number(calc.nestWidth)/1000 || 0;
    const totalSeamLength = Number(calc.totalSeamLength)/1000 || 0;
    const height = Number(attrs.height)/1000 || 0;
    const length = Number(attrs.length)/1000 || 0;
    const width = Number(attrs.width)/1000 || 0;

    // Thread quantity formula
    const threadQty = (totalSeamLength + height * 2 + length * 2 + width * 2) * 2.5;

    const materials = [
        { description: "Fabric", quantity: nestWidth, unitCost: 12.5 },
        { description: "Thread", quantity: threadQty, unitCost: 3.0 }
    ];
    const labour = [
        { description: "Cutting", quantity: 1, unitCost: 20 },
        { description: "Sewing", quantity: 2, unitCost: 15 }
    ];
    return { materials, labour };
}

function renderEstimateTable(materials, labour) {
    function renderSection(title, items, section) {
        let rows = items.map((item, idx) => {
            const total = (item.quantity * item.unitCost).toFixed(2);
            return `
                <tr>
                    <td>${item.description}</td>
                    <td>
                        <input type="number" data-section="${section}" data-idx="${idx}" data-field="quantity" value="${item.quantity}" min="0" style="width:140px">
                    </td>
                    <td>
                        <input type="number" data-section="${section}" data-idx="${idx}" data-field="unitCost" value="${item.unitCost}" min="0" step="0.01" style="width:180px">
                    </td>
                    <td>
                        <input type="number" value="${total}" readonly style="width:200px">
                    </td>
                </tr>
            `;
        }).join('');
        return `
            <tr><th colspan="4" style="text-align:left;background:#f0f0f0">${title}</th></tr>
            ${rows}
        `;
    }

    // Calculate grand total
    const totalMaterials = materials.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    const totalLabour = labour.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    const grandTotal = (totalMaterials + totalLabour).toFixed(2);

    return `
        <table id="estimate-table" border="1" style="margin-top:16px;width:100%;border-collapse:collapse;">
            <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total Cost</th>
            </tr>
            ${renderSection("Materials", materials, "materials")}
            ${renderSection("Labour", labour, "labour")}
            <tr>
                <td colspan="3" style="text-align:right;font-weight:bold;">Grand Total</td>
                <td style="font-weight:bold;" id="grand-total">${grandTotal}</td>
            </tr>
        </table>
    `;
}

// Call this after rendering the table to set up listeners
export function setupEstimateTableListeners() {
    const table = document.getElementById('estimate-table');
    if (!table) return;

    table.querySelectorAll('input[type="number"]').forEach(input => {
        if (input.hasAttribute('readonly')) return;
        input.addEventListener('input', (e) => {
            const section = input.getAttribute('data-section');
            const idx = parseInt(input.getAttribute('data-idx'));
            const field = input.getAttribute('data-field');
            const value = parseFloat(input.value) || 0;

            if (section === "materials") {
                materials[idx][field] = value;
            } else if (section === "labour") {
                labour[idx][field] = value;
            }

            // Re-render the table and re-attach listeners
            document.getElementById('cover-table-editable').innerHTML = renderEstimateTable();
            setupEstimateTableListeners();
        });
    });
}

function EstimateTable({ defaultMaterials = [], defaultLabour = [] }) {
  const [materials, setMaterials] = useState(defaultMaterials);
  const [labour, setLabour] = useState(defaultLabour);

  const updateItem = (section, index, field, value) => {
    const parser = field === 'quantity' ? parseFloat : parseFloat;
    const parsedValue = parser(value) || 0;

    const update = (items, setItems) => {
      const updated = [...items];
      updated[index] = { ...updated[index], [field]: parsedValue };
      setItems(updated);
    };

    if (section === 'materials') {
      update(materials, setMaterials);
    } else if (section === 'labour') {
      update(labour, setLabour);
    }
  };

  const calculateTotal = (item) => (item.quantity * item.unitCost).toFixed(2);

  const renderSection = (title, items, section, updateFn) => (
    <>
      <tr>
        <th colSpan="4" style={{ textAlign: 'left', background: '#f0f0f0' }}>{title}</th>
      </tr>
      {items.map((item, idx) => (
        <tr key={`${section}-${idx}`}>
          <td>{item.description}</td>
          <td>
            <input
              type="number"
              value={item.quantity}
              min="0"
              style={{ width: 140 }}
              onChange={(e) => updateItem(section, idx, 'quantity', e.target.value)}
            />
          </td>
          <td>
            <input
              type="number"
              value={item.unitCost}
              min="0"
              step="0.01"
              style={{ width: 180 }}
              onChange={(e) => updateItem(section, idx, 'unitCost', e.target.value)}
            />
          </td>
          <td>
            <input type="number" value={calculateTotal(item)} readOnly style={{ width: 200 }} />
          </td>
        </tr>
      ))}
    </>
  );

  const totalMaterials = materials.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const totalLabour = labour.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const grandTotal = (totalMaterials + totalLabour).toFixed(2);

  return (
    <table border="1" style={{ marginTop: 16, width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Cost</th>
          <th>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        {renderSection('Materials', materials, 'materials')}
        {renderSection('Labour', labour, 'labour')}
        <tr>
          <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Grand Total</td>
          <td style={{ fontWeight: 'bold' }}>{grandTotal}</td>
        </tr>
      </tbody>
    </table>
  );
}







function drawNest(ctx, nestData, panels, fabricHeight) {
  const startX = 0;

  const nestWidth = nestData.total_width;
  const scale = Math.min(2000 / nestWidth, 0.1); // Scale X to fit 1000px
  const centerY = 200 + (fabricHeight / 2) * scale;

  ctx.save();

  // 📦 Draw each panel
  for (const [label, placement] of Object.entries(nestData.panels)) {
    const panelKey = label.split('_')[1];
    const panel = panels[panelKey];

    if (!panel) {
      console.warn(`Panel not found for label: ${label} (key: ${panelKey})`);
      continue;
    }

    const { width, height } = panel;
    const rotated = placement.rotated;
    const w = rotated ? height : width;
    const h = rotated ? width : height;

    // Apply scale to all spatial values
    const scaledX = startX + placement.x * scale;
    const scaledY = centerY - (placement.y + h) * scale;
    const scaledW = w * scale;
    const scaledH = h * scale;

    ctx.fillStyle = '#88ccee';
    ctx.strokeStyle = '#004466';
    ctx.lineWidth = 2;
    ctx.fillRect(scaledX, scaledY, scaledW, scaledH);
    ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);

    // 🏷 Draw label centered in the scaled rectangle
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, scaledX + scaledW / 2, scaledY + scaledH / 2);
  }

  // 🖼 Draw fabric height box
  const fabricBoxX = startX;
  const fabricBoxY = centerY - fabricHeight * scale;
  const fabricBoxWidth = nestWidth * scale;
  const fabricBoxHeight = fabricHeight * scale;

  ctx.setLineDash([]);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(fabricBoxX, fabricBoxY, fabricBoxWidth, fabricBoxHeight);

  // 📏 Draw dimension line under the whole thing
  const dimensionLineY = centerY + 20; // Slightly below the fabric box
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(fabricBoxX, dimensionLineY);
  ctx.lineTo(fabricBoxX + fabricBoxWidth, dimensionLineY);
  ctx.stroke();

  // Vertical ticks
  ctx.beginPath();
  ctx.moveTo(fabricBoxX, dimensionLineY - 5);
  ctx.lineTo(fabricBoxX, dimensionLineY + 5);
  ctx.moveTo(fabricBoxX + fabricBoxWidth, dimensionLineY - 5);
  ctx.lineTo(fabricBoxX + fabricBoxWidth, dimensionLineY + 5);
  ctx.stroke();

  // Dimension text
  ctx.fillStyle = 'black';
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${nestWidth.toFixed(2)} mm`, fabricBoxX + fabricBoxWidth / 2, dimensionLineY + 5);

  ctx.restore();
}