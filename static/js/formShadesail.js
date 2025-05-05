import { saveConfig } from './api.js';
import { validate3DEdges } from './shadesailGeometry.js';
import { getShadeSailCoords } from './shadesailGeometry.js';

const FIXING_TYPES = ['Long Dee Shackle', 'Dee Shackle', 'Long Shackle', 'M8 Turnbuckle', 'M10 Turnbuckle', 'M12 Turnbuckle', 'M8 Toggle Bolt', 'M10 Toggle Bolt', 'M12 Toggle Bolt', 'Direct'];



function collectShadeSailData() {
    const data = {
        category: 'shadesail',
        company: document.getElementById('company')?.value || '',
        contact: document.getElementById('contact')?.value || '',
        name: document.getElementById('reference')?.value || '',
        date: document.getElementById('date')?.value || '',
        fabricType: document.getElementById('fabricType')?.value || '',
        fabricColour: document.getElementById('fabricColour')?.value || '',
        includeLabel: document.getElementById('includeLabel')?.checked || false,
        exit: document.getElementById('exit')?.value || '',
        logo: document.getElementById('logo')?.value || '',
        cableLength: parseFloat(document.getElementById('cableLength')?.value) || 0,
        webbingEdge: parseFloat(document.getElementById('webbingEdge')?.value) || 0,
        foldSide: document.getElementById('foldSide')?.value || '',
        cornerType: document.getElementById('cornerType')?.value || '',
        otherRequirements: document.getElementById('otherRequirements')?.value || ''
    };

    const cornerCount = parseInt(document.getElementById('cornerCount')?.value || '0');
    data.corners = cornerCount;

    data.edges = {};
    for (let i = 0; i < cornerCount; i++) {
        const from = String.fromCharCode(65 + i);
        const to = String.fromCharCode(65 + ((i + 1) % cornerCount));
        const key = `${from}-${to}`;
        const input = document.querySelector(`input[name="edge-${key}"]`);
        if (input?.value) {
            data.edges[key] = parseFloat(input.value);
        }
    }

    data.diagonals = {};
    for (let i = 0; i < cornerCount; i++) {
        for (let j = i + 2; j < cornerCount + (i > 0 ? 0 : -1); j++) {
            const from = String.fromCharCode(65 + i);
            const to = String.fromCharCode(65 + (j % cornerCount));
            const key = `${from}-${to}`;
            const input = document.querySelector(`input[name="diag-${key}"]`);
            if (input?.value) {
                data.diagonals[key] = parseFloat(input.value);
            }
        }
    }

    data.points = {};
    for (let i = 0; i < cornerCount; i++) {
        const label = String.fromCharCode(65 + i);
        const heightInput = document.querySelector(`input[name="height-${label}"]`);
        const fixingInput = document.querySelector(`select[name="fixing-${label}"]`);
        const tensionInput = document.querySelector(`input[name="tension-${label}"]`);
        if (heightInput && fixingInput && tensionInput) {
            data.points[label] = {
                height: parseFloat(heightInput.value) || 0,
                fixing: fixingInput.value,
                tensioningAllowance: parseFloat(tensionInput.value) || 0
            };
        }
    }

    return data;
}


function generateEdgeInputs() {
    const count = parseInt(document.getElementById('cornerCount').value);
    const cornerWarning = document.getElementById('cornerWarning');
    if (isNaN(count) || count < 3) {
        
        if (cornerWarning) cornerWarning.innerText = "Need at least 3 corners";
        return;
    }

    if (cornerWarning) cornerWarning.innerText = "";

    const edgeContainer = document.getElementById('edgesContainer');
    const diagContainer = document.getElementById('diagonalsContainer');
    const pointContainer = document.getElementById('pointsContainer');

    // Edges
    edgeContainer.innerHTML = `<h3>Edges</h3><table id="edgesTable"><tr><th>Edge</th><th>Length (m)</th></tr></table>`;
    const edgeTable = document.getElementById('edgesTable');
    for (let i = 0; i < count; i++) {
        const from = String.fromCharCode(65 + i);
        const to = String.fromCharCode(65 + ((i + 1) % count));
        edgeTable.insertRow().innerHTML = `<td>${from}-${to}</td><td><input type="number" name="edge-${from}-${to}" step="0.01" class="edge-input"></td>`;
    }

    // Diagonals
    diagContainer.innerHTML = `<h3>Diagonals</h3><table id="diagonalsTable"><tr><th>Diagonal</th><th>Length (m)</th></tr></table>`;
    const diagTable = document.getElementById('diagonalsTable');
    for (let i = 0; i < count; i++) {
        for (let j = i + 2; j < count + (i > 0 ? 0 : -1); j++) {
            const from = String.fromCharCode(65 + i);
            const to = String.fromCharCode(65 + (j % count));
            diagTable.insertRow().innerHTML = `<td>${from}-${to}</td><td><input type="number" name="diag-${from}-${to}" step="0.01" class="diag-input"></td>`;
        }
    }

    // Points
    pointContainer.innerHTML = `<h3>Points</h3><table id="pointsTable"><tr><th>Point</th><th>Height (m)</th><th>Fixing</th><th>Tensioning Allowance (mm)</th></tr></table>`;
    const pointTable = document.getElementById('pointsTable');
    for (let i = 0; i < count; i++) {
        const label = String.fromCharCode(65 + i);
        const selectOptions = FIXING_TYPES.map(f => `<option>${f}</option>`).join('');
        pointTable.insertRow().innerHTML = `
            <td>${label}</td>
            <td><input type="number" name="height-${label}" step="0.01"></td>
            <td><select name="fixing-${label}">${selectOptions}</select></td>
            <td><input type="number" name="tension-${label}" step="1"></td>
        `;
    }

    // Drawing logic — trigger on edge or diagonal input
    const triggerDraw = () => {
        const data = collectShadeSailData();

        // Log everything for debug
        console.log("=== Shade Sail Data ===");
        console.log("Company:", data.company);
        console.log("Job:", data.reference);
        console.log("Points:", data.points);
        console.log("Edges:", data.edges);
        console.log("Diagonals:", data.diagonals);
        console.log("========================");

        const edgeKeys = Object.keys(data.edges);
        const expectedEdges = parseInt(document.getElementById('cornerCount')?.value) || 0;

        validate3DEdges(data.points, data.edges);

        if (edgeKeys.length === expectedEdges) {
            drawShadeSail(data.points, data.edges, data.diagonals);
        }
    };

    document.querySelectorAll('.edge-input').forEach(input => {
        input.addEventListener('input', triggerDraw);
    });

    document.querySelectorAll('.diag-input').forEach(input => {
        input.addEventListener('input', triggerDraw);
    });

    document.querySelectorAll('#pointsTable input, #pointsTable select').forEach(input => {
        input.addEventListener('input', triggerDraw);
    });
}




function drawShadeSail(Points, Edges, Diagonals) {
    console.log("=== drawShadeSail START ===");
    console.log("Points:", Points);
    console.log("Edges:", Edges);
    console.log("Diagonals:", Diagonals);

    const warning = document.getElementById('warning');
    if (warning) warning.innerText = "";

    const coords = getShadeSailCoords(Points, Edges, Diagonals);
    if (!coords) {
        if (warning) warning.innerText = "⚠️ Could not calculate coordinates.";
        console.warn("⚠️ Could not calculate coordinates.");
        return;
    }

    console.log("Final coordinates:");
    for (const [label, pos] of Object.entries(coords)) {
        console.log(`${label}: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, z=${pos.z}`);
    }

    const canvas = document.getElementById("sailCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Determine bounds and scale
    const margin = 20;
    const xs = Object.values(coords).map(p => p.x);
    const ys = Object.values(coords).map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const scaleX = (canvas.width - 2 * margin) / (maxX - minX);
    const scaleY = (canvas.height - 2 * margin) / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);

    const toCanvasX = x => margin + (x - minX) * scale;
    const toCanvasY = y => canvas.height - margin - (y - minY) * scale;

    // Draw shape
    ctx.beginPath();
    const pointOrder = Object.keys(coords);
    for (let i = 0; i < pointOrder.length; i++) {
        const label = pointOrder[i];
        const p = coords[label];
        const canvasX = toCanvasX(p.x);
        const canvasY = toCanvasY(p.y);
        if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
        } else {
            ctx.lineTo(canvasX, canvasY);
        }
    }
    // Close the polygon
    const first = coords[pointOrder[0]];
    ctx.lineTo(toCanvasX(first.x), toCanvasY(first.y));
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw point labels
    ctx.fillStyle = "blue";
    ctx.font = "14px sans-serif";
    for (const label of pointOrder) {
        const p = coords[label];
        const canvasX = toCanvasX(p.x);
        const canvasY = toCanvasY(p.y);
        ctx.fillText(label, canvasX + 5, canvasY - 5);
    }

    // Draw edge distances with labels
    ctx.fillStyle = "black";
    ctx.font = "12px sans-serif";
    for (let i = 0; i < pointOrder.length; i++) {
        const p1 = pointOrder[i];
        const p2 = pointOrder[(i + 1) % pointOrder.length];
        const c1 = coords[p1];
        const c2 = coords[p2];
        const midX = (c1.x + c2.x) / 2;
        const midY = (c1.y + c2.y) / 2;
        const len = Math.sqrt((c1.x - c2.x)**2 + (c1.y - c2.y)**2 + (c1.z - c2.z)**2).toFixed(2);
        ctx.fillText(`${p1}-${p2}: ${len}`, toCanvasX(midX), toCanvasY(midY));
    }

    // Draw diagonals with labels
    ctx.strokeStyle = "#888";
    ctx.setLineDash([5, 3]);
    for (const key in Diagonals) {
        const [p1, p2] = key.split("-");
        if (!(coords[p1] && coords[p2])) continue;
        const c1 = coords[p1];
        const c2 = coords[p2];
        ctx.beginPath();
        ctx.moveTo(toCanvasX(c1.x), toCanvasY(c1.y));
        ctx.lineTo(toCanvasX(c2.x), toCanvasY(c2.y));
        ctx.stroke();

        // Label diagonal distance at midpoint
        const midX = (c1.x + c2.x) / 2;
        const midY = (c1.y + c2.y) / 2;
        const len = Diagonals[key].toFixed(2);
        ctx.fillText(`${p1}-${p2}: ${len}`, toCanvasX(midX), toCanvasY(midY));
    }
    ctx.setLineDash([]);

    console.log("=== drawShadeSail END ===");
    return coords;
}





export function setupShadesailForm() {
    console.log("🔧 setupShadesailForm called");

    const cornerCountInput = document.getElementById('cornerCount');
    if (cornerCountInput) {
        console.log("✅ Found cornerCountInput");
        cornerCountInput.addEventListener('input', generateEdgeInputs);
        if (parseInt(cornerCountInput.value) >= 3) {
            generateEdgeInputs();
        }
    } else {
        console.warn("❌ Did not find cornerCountInput");
    }

    const saveButton = document.getElementById("saveShadesailBtn");
    if (saveButton) {
        console.log("✅ Found saveShadesailBtn");

        saveButton.addEventListener("click", () => {
            console.log("🟢 Pressed Save Shade Sail Config Button");
            const data = collectShadeSailData();
            console.log("🟡 Collected Data:", data);
            //drawShadeSail(data.points, data.edges, data.diagonals);
            saveConfig(data, "shadesail").then(() => {
                
                window.loadConfigs?.();
            });
        });
    } else {
        console.warn("❌ Save button with ID 'saveShadesailBtn' not found");
    }
}