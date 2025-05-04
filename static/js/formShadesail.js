import { saveConfig } from './api.js';

const FIXING_TYPES = ['Long Dee Shackle', 'Dee Shackle', 'Long Shackle', 'M8 Turnbuckle', 'M10 Turnbuckle', 'M12 Turnbuckle', 'M8 Toggle Bolt', 'M10 Toggle Bolt', 'M12 Toggle Bolt', 'Direct'];



function collectShadeSailData() {
    const data = {
        category: 'shadesail',
        company: document.getElementById('companyName')?.value || '',
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
    if (isNaN(count) || count < 3) return;

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
        console.log("Job:", data.job);
        console.log("Points:", data.points);
        console.log("Edges:", data.edges);
        console.log("Diagonals:", data.diagonals);
        console.log("========================");

        const edgeKeys = Object.keys(data.edges);
        const expectedEdges = parseInt(document.getElementById('cornerCount')?.value) || 0;

        validateEdges(data.edges, expectedEdges);

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





function getShadeSailCoords(Points, Edges, Diagonals) {
    const coords = {};
    const placed = new Set();
    const allPoints = Object.keys(Points);

    function getDistance(p1, p2) {
        return Edges[`${p1}-${p2}`] || Edges[`${p2}-${p1}`] ||
               Diagonals[`${p1}-${p2}`] || Diagonals[`${p2}-${p1}`];
    }

    function getEdge(p1, p2) {
        return Edges[`${p1}-${p2}`] || Edges[`${p2}-${p1}`];
    }

    function getDiagonal(p1, p2) {
        return Diagonals[`${p1}-${p2}`] || Diagonals[`${p2}-${p1}`];
    }

    function triangleCheck(r1, r2, base, tolerance = 0.02) {
        const min = Math.abs(r1 - r2) * (1 - tolerance);
        const max = (r1 + r2) * (1 + tolerance);
        return base > min && base < max;
    }

    if (allPoints.length < 2) return null;

    const A = allPoints[0];
    coords[A] = { x: 0, y: 0, z: Points[A]?.height ?? 0 };
    placed.add(A);

    const B = allPoints.find(p => p !== A && getDistance(A, p));
    if (!B) return null;

    const AB = getDistance(A, B);
    coords[B] = { x: AB, y: 0, z: Points[B]?.height ?? 0 };
    placed.add(B);

    let progressMade = true;
    while (placed.size < allPoints.length && progressMade) {
        progressMade = false;

        for (const P of allPoints) {
            if (placed.has(P)) continue;

            const knownPairs = Array.from(placed).flatMap(p1 =>
                Array.from(placed).filter(p2 => p2 !== p1).map(p2 => [p1, p2])
            );

            let bestPair = null;
            let bestD1 = null;
            let bestD2 = null;

            for (const [p1, p2] of knownPairs) {
                const edge1 = getEdge(p1, P);
                const edge2 = getEdge(p2, P);
                const diag1 = getDiagonal(p1, P);
                const diag2 = getDiagonal(p2, P);

                if (edge1 && edge2) {
                    bestPair = [p1, p2];
                    bestD1 = edge1;
                    bestD2 = edge2;
                    break;
                } else if ((edge1 && diag2) || (diag1 && edge2)) {
                    bestPair = [p1, p2];
                    bestD1 = edge1 || diag1;
                    bestD2 = edge2 || diag2;
                }
            }

            if (!bestPair) continue;

            const [p1, p2] = bestPair;
            const p1Coord = coords[p1];
            const p2Coord = coords[p2];

            const z1 = p1Coord.z ?? 0;
            const z2 = p2Coord.z ?? 0;
            const zP = Points[P]?.height ?? 0;

            const dz1 = zP - z1;
            const dz2 = zP - z2;

            const r1Squared = bestD1 ** 2 - dz1 ** 2;
            const r2Squared = bestD2 ** 2 - dz2 ** 2;
            if (r1Squared < 0 || r2Squared < 0) continue;

            const r1 = Math.sqrt(r1Squared);
            const r2 = Math.sqrt(r2Squared);

            const dx = p2Coord.x - p1Coord.x;
            const dy = p2Coord.y - p1Coord.y;
            const dz = p2Coord.z - p1Coord.z;
            const d3 = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (!triangleCheck(r1, r2, d3)) continue;

            const a = (r1 ** 2 - r2 ** 2 + d3 ** 2) / (2 * d3);
            const hSquared = r1 ** 2 - a ** 2;
            if (hSquared < 0) continue;

            const h = Math.sqrt(hSquared);
            const px = p1Coord.x + (a * dx) / d3;
            const py = p1Coord.y + (a * dy) / d3;

            const ox = h * (dy / d3);
            const oy = h * (dx / d3);

            const candidate1 = { x: px + ox, y: py - oy, z: zP };
            const candidate2 = { x: px - ox, y: py + oy, z: zP };

            // Always choose the candidate with lower average Y
            const avgY1 = (candidate1.y + p1Coord.y + p2Coord.y) / 3;
            const avgY2 = (candidate2.y + p1Coord.y + p2Coord.y) / 3;

            coords[P] = avgY1 < avgY2 ? candidate1 : candidate2;

            placed.add(P);
            progressMade = true;
            break;
        }
    }

    if (placed.size < allPoints.length) return null;
    return coords;
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


















function solveTriangle(A, B, dAC, dBC, preferClockwise = true) {
    if (!A || !B || !dAC || !dBC || isNaN(dAC) || isNaN(dBC)) return null;

    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const dAB = Math.hypot(dx, dy);
    if (dAB === 0) return null;

    // Law of Cosines
    const cosC = (dAB ** 2 + dAC ** 2 - dBC ** 2) / (2 * dAB * dAC);
    if (cosC < -1 || cosC > 1) return null;
    const angleC = Math.acos(cosC);

    const angleAB = Math.atan2(dy, dx);
    const angleAC = angleAB + (preferClockwise ? angleC : -angleC);

    return {
        x: A.x + dAC * Math.cos(angleAC),
        y: A.y + dAC * Math.sin(angleAC)
    };
}

function drawShadeSailOld(points, edges, diagonals) {
    const warningEl = document.getElementById('warning');
    if (warningEl) warningEl.textContent = '';

    const canvas = document.getElementById('sailCanvas');
    if (!canvas) {
        const msg = "❌ No canvas found.";
        console.warn(msg);
        if (warningEl) warningEl.textContent = msg;
        return;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const labels = Object.keys(points);
    if (labels.length < 3) {
        const msg = "At least 3 points are required.";
        console.warn(msg);
        if (warningEl) warningEl.textContent = msg;
        return;
    }

    const coords = {};
    const A = labels[0], B = labels[1], C = labels[2];

    const dAB = edges[`${A}-${B}`] || edges[`${B}-${A}`];
    const dAC = diagonals[`${A}-${C}`] || diagonals[`${C}-${A}`] ||
                edges[`${A}-${C}`] || edges[`${C}-${A}`];
    const dBC = diagonals[`${B}-${C}`] || diagonals[`${C}-${B}`] ||
                edges[`${B}-${C}`] || edges[`${C}-${B}`];

    console.log("Looking for:", `${A}-${B}`, dAB, `${A}-${C}`, dAC, `${B}-${C}`, dBC);

    if (!(dAB && dAC && dBC)) {
        const msg = "Missing required distances for triangle ABC.";
        console.warn(msg);
        if (warningEl) warningEl.textContent = msg;
        return;
    }

    coords[A] = { x: 0, y: 0 };
    coords[B] = { x: dAB, y: 0 };

    const try1 = solveTriangle(coords[A], coords[B], dAC, dBC, true);
    const try2 = solveTriangle(coords[A], coords[B], dAC, dBC, false);

    const isClockwise = (a, b, c) =>
        (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0;

    let Cpos = null;
    if (try1 && isFinite(try1.x) && isFinite(try1.y) && isClockwise(coords[A], coords[B], try1)) {
        Cpos = try1;
    } else if (try2 && isFinite(try2.x) && isFinite(try2.y)) {
        Cpos = try2;
    }

    if (!Cpos) {
        const msg = "Could not determine correct orientation for point C.";
        console.warn(msg);
        if (warningEl) warningEl.textContent = msg;
        return;
    }

    coords[C] = Cpos;
    const placedLabels = [A, B, C];

    // Generalized trilateration for remaining points
    for (let i = 3; i < labels.length; i++) {
        const curr = labels[i];
        let best = null;
        let lowestError = Infinity;

        for (const p1Label of placedLabels) {
            for (const p2Label of placedLabels) {
                if (p1Label === p2Label) continue;

                const p1 = coords[p1Label];
                const p2 = coords[p2Label];

                const d1 = edges[`${p1Label}-${curr}`] || edges[`${curr}-${p1Label}`] ||
                           diagonals[`${p1Label}-${curr}`] || diagonals[`${curr}-${p1Label}`];
                const d2 = edges[`${p2Label}-${curr}`] || edges[`${curr}-${p2Label}`] ||
                           diagonals[`${p2Label}-${curr}`] || diagonals[`${curr}-${p2Label}`];

                if (!(p1 && p2 && d1 && d2)) continue;

                for (const flip of [true, false]) {
                    const pt = solveTriangle(p1, p2, d1, d2, flip);
                    if (!pt || !isFinite(pt.x) || !isFinite(pt.y)) continue;

                    if (!isClockwise(p1, p2, pt)) continue;

                    let error = 0;
                    for (const label of placedLabels) {
                        const knownPt = coords[label];
                        const expected = edges[`${curr}-${label}`] || edges[`${label}-${curr}`] ||
                                         diagonals[`${curr}-${label}`] || diagonals[`${label}-${curr}`];
                        if (expected && knownPt) {
                            const dx = pt.x - knownPt.x;
                            const dy = pt.y - knownPt.y;
                            error += Math.abs(Math.hypot(dx, dy) - expected);
                        }
                    }

                    if (error < lowestError) {
                        lowestError = error;
                        best = pt;
                    }
                }
            }
        }

        if (!best) {
            const msg = `Could not place point ${curr}.`;
            console.warn(msg);
            if (warningEl) warningEl.textContent += msg + '\n';
            return;
        }

        coords[curr] = best;
        placedLabels.push(curr);
    }

    // Scaling and rendering
    const values = Object.values(coords);
    const padding = 40;
    const minX = Math.min(...values.map(p => p.x));
    const minY = Math.min(...values.map(p => p.y));
    const maxX = Math.max(...values.map(p => p.x));
    const maxY = Math.max(...values.map(p => p.y));
    const shapeWidth = Math.max(1e-6, maxX - minX);
    const shapeHeight = Math.max(1e-6, maxY - minY);
    const scale = Math.min(
        (canvas.width - 2 * padding) / shapeWidth,
        (canvas.height - 2 * padding) / shapeHeight
    );

    const offsetDirection = -1;
    const offsetX = offsetDirection * h * (dy / d3);
    const offsetY = offsetDirection * h * (dx / d3);

    ctx.beginPath();
    labels.forEach((label, i) => {
        const pt = coords[label];
        const x = pt.x * scale + offsetX;
        const y = pt.y * scale + offsetY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'black';
    ctx.font = '14px sans-serif';
    labels.forEach(label => {
        const pt = coords[label];
        const x = pt.x * scale + offsetX;
        const y = pt.y * scale + offsetY;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillText(label, x + 6, y - 6);
    });

    console.log("✅ Final Coordinates:", coords);
}









function validateEdges(edges, cornerCount) {
    const edgeKeys = [];
    for (let i = 0; i < cornerCount; i++) {
        const from = String.fromCharCode(65 + i);
        const to = String.fromCharCode(65 + ((i + 1) % cornerCount));
        edgeKeys.push(`edge-${from}-${to}`);
    }

    let invalid = false;
    let lengths = edgeKeys.map(name => {
        const input = document.querySelector(`input[name="${name}"]`);
        const val = parseFloat(input?.value);
        return isNaN(val) ? 0 : val;
    });

    // Simple validation: sum of any edge must be < sum of others
    for (let i = 0; i < lengths.length; i++) {
        const thisEdge = lengths[i];
        const others = lengths.reduce((sum, l, j) => i === j ? sum : sum + l, 0);
        if (thisEdge >= others) {
            invalid = true;
            const name = edgeKeys[i];
            const input = document.querySelector(`input[name="${name}"]`);
            if (input) input.classList.add('input-error');
        } else {
            const input = document.querySelector(`input[name="${edgeKeys[i]}"]`);
            if (input) input.classList.remove('input-error');
        }
    }

    const warning = document.getElementById('edgeWarning');
    if (warning) {
        warning.style.display = invalid ? 'block' : 'none';
    }
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