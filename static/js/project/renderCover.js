import { renderBase } from './renderBase.js';
import CanvasManager from '/copelands/static/js/core/CanvasManager.js';
import zeroVisualise from '/copelands/static/js/steps/covers/zeroVisualise.js';
import oneFlatten from '/copelands/static/js/steps/covers/oneFlatten.js';
import twoExtra from '/copelands/static/js/steps/covers/twoExtra.js';
import threeNest from '/copelands/static/js/steps/covers/threeNest.js';

export function renderCover(project, role) {
    let html = renderBase(project, role);

    // Only show the estimator UI for estimators/admins
    if (role === "estimator" || role === "admin") {
        html += `
        <div style="display: flex; align-items: flex-start; margin-top: 24px;">
            <canvas id="coverCanvas" width="500" height="1000" style="border:1px solid #ccc;"></canvas>
            <div id="coverTableContainer" style="margin-left: 32px; min-width: 300px;"></div>
        </div>
        `;
        // The table will be rendered by JS after CanvasManager runs
    } else {
        html += `<h4>Cover Attributes</h4>
            <pre>${JSON.stringify(project.attributes, null, 2)}</pre>`;
    }
    return html;
}

export async function estimatorCoverUI(project, mode) {
    // Prepare input data (from project.attributes or defaults)
    const inputData = { ...project.attributes };

    // Show project.attributes and (later) canvas data above the canvas
    const detailDiv = document.getElementById('coverTableContainer')?.parentElement?.parentElement?.querySelector('#cover-attributes-data');
    if (!detailDiv) {
        // Insert a div above the canvas for displaying data
        const parent = document.getElementById('coverCanvas')?.parentElement?.parentElement;
        if (parent) {
            const infoDiv = document.createElement('div');
            infoDiv.id = 'cover-attributes-data';
            parent.insertBefore(infoDiv, parent.firstChild);
        }
    }

    // Adjust canvas height for estimator
    const canvas = document.getElementById('coverCanvas');
    if (canvas) {
        canvas.height = mode === 'estimator' ? 1200 : 500;
        canvas.width = mode === 'estimator' ? 700 : 500;
    }

    const manager = new CanvasManager('coverCanvas', {});
    manager.addStep(zeroVisualise);
    if (mode === 'estimator') {
        manager.addStep(oneFlatten);
        manager.addStep(twoExtra);
        manager.addStep(threeNest);
    }

    // Update canvas and table
    async function updateUI() {
        await manager.updateAll(inputData);

        const allStepData = manager.getData();
        const attributesHTML = `
            <div id="cover-attributes-data" style="min-width:300px;">
                <h4>Project Attributes</h4>
                <pre>${JSON.stringify(project.attributes, null, 2)}</pre>
                <h4>Calculation data (All Steps)</h4>
                <pre>${JSON.stringify(allStepData, null, 2)}</pre>
            </div>
        `;

        // For table, you can use the last step's data or any step you want
        const tableHTML = `
            <div id="cover-table-editable" style="min-width:300px;">
                ${renderEditableTable(allStepData.nestWidth)}
            </div>
        `;

        // Place both in a flex row above the canvas
        const parent = document.getElementById('coverCanvas')?.parentElement?.parentElement;
        if (parent) {
            let flexRow = parent.querySelector('.cover-flex-row');
            if (!flexRow) {
                flexRow = document.createElement('div');
                flexRow.className = 'cover-flex-row';
                flexRow.style.display = 'flex';
                flexRow.style.gap = '32px';
                parent.insertBefore(flexRow, parent.firstChild);
            }
            flexRow.innerHTML = attributesHTML + tableHTML;
        }

        // Table input listeners
        const tableContainer = document.getElementById('cover-table-editable');
        if (tableContainer) {
            tableContainer.querySelectorAll('input').forEach(input => {
                input.addEventListener('change', (e) => {
                    const key = e.target.name;
                    let value = e.target.value;
                    if (!isNaN(value)) value = Number(value);
                    inputData[key] = value;
                    updateUI();
                });
            });
        }
    }

    function renderEditableTable(nestWidth, costPerMm) {
        const totalCost = (Number(nestWidth) || 0) * (Number(costPerMm) || 0);
        return `<table border="1" style="margin-top:16px;">
            <tr><th>Field</th><th>Value</th></tr>
            <tr>
                <td>nestWidth</td>
                <td><input name="nestWidth" value="${nestWidth}" readonly></td>
            </tr>
            <tr>
                <td>costPerMm</td>
                <td><input name="costPerMm" value="${costPerMm}" type="number" step="any"></td>
            </tr>
            <tr>
                <td>totalCost</td>
                <td><input name="totalCost" value="${totalCost}" readonly></td>
            </tr>
        </table>`;
    }

    updateUI();
}