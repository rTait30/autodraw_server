import { saveConfig } from './api.js';
import { VirtualCanvas } from './virtualCanvas.js';

export function setupSurgicalForm() {
    console.log("🔧 setupSurgicalForm called");

    const canvas = document.getElementById('surgicalCanvas');
    

    // 🔁 Debounce helper
    function debounce(func, delay = 300) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    }

    // 🧠 Shared function to get current form values
    function getLiveSurgicalData() {
        return {
            company: document.getElementById('surgicalCompany')?.value || '',
            name: document.getElementById('surgicalName')?.value || '',
            length: parseFloat(document.getElementById('surgicalLength')?.value) || 1,
            width: parseFloat(document.getElementById('surgicalWidth')?.value) || 1,
            height: parseFloat(document.getElementById('surgicalHeight')?.value) || 1,
            seam: parseFloat(document.getElementById('surgicalSeam')?.value) || 1,
            hem: parseFloat(document.getElementById('surgicalHem')?.value) || 1,
            quantity: parseInt(document.getElementById('surgicalQuantity')?.value) || 1,
            fabricwidth: parseFloat(document.getElementById('surgicalFabricWidth')?.value) || 1,
            iterations: parseInt(document.getElementById('surgicalIterations')?.value) || 1
        };
    }

    resizeCanvasToDisplaySize(canvas, getLiveSurgicalData());

    // 👂 Debounced live log listener
    const handleLiveUpdate = debounce(() => {
        const liveData = getLiveSurgicalData();
        console.log("📦 Live Surgical Config Updated:", liveData);
        resizeCanvasToDisplaySize(canvas, liveData);
    }, 500);

    // 🎯 Attach live update to relevant inputs
    [
        'surgicalCompany',
        'surgicalName',
        'surgicalLength',
        'surgicalWidth',
        'surgicalHeight',
        'surgicalSeam',
        'surgicalHem',
        'surgicalQuantity',
        'surgicalFabricWidth',
        'surgicalIterations'
    ].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', handleLiveUpdate);
        }
    });

    // 🖱️ Save button logic
    const saveButton = document.getElementById("saveSurgicalBtn");
    if (saveButton) {
        console.log("✅ Found Save Surgical Covers Config Button");

        saveButton.addEventListener('click', () => {
            console.log("🟢 Pressed Save Surgical Covers Config Button");

            const data = {
                category: 'surgical',
                ...getLiveSurgicalData()
            };

            console.log("🟡 Collected Data:", data);

            saveConfig(data, "surgical").then(() => {
                window.loadConfigs?.();
            });
        });
    } else {
        console.warn("❌ Save button inside #formSurgical not found");
    }

    window.addEventListener('resize', () => {
        resizeCanvasToDisplaySize(canvas);
    });
}



export function resizeCanvasToDisplaySize(canvas, data) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    const ctx = canvas.getContext('2d'); // ✅ Get context here
    renderSurgicalCanvas(canvas, data); // ✅ Pass context, not canvas

    return { width, height };
}

let currentIdleCallback = null;
let currentTimeout = null;
let isRunning = false;
let currentRunId = 0;

function renderSurgicalCanvas(canvas, data) {
    const vCanvas = new VirtualCanvas(canvas);
    vCanvas.resize();


    vCanvas.withStep(0, (ctx) => {
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, 1000, 1000);
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Step 0: Visualise covers", 20, 60);
    
        let i = 0;
        for (const [key, value] of Object.entries(data)) {
            ctx.fillText(`${key}: ${value}`, 20, 100 + i * 40);
            i++;
        }
    
        const quantity = Math.max(1, data.quantity || 1);
        const width = data.width || 1;
        const height = data.height || 1;
        const length = data.length || 1;
        const hem = data.hem || 0;
    
        const padding = 100;
        const spacing = data.width / 4;
    
        // Total visual space required includes hem and projection
        const totalWidthUnits = quantity * width + (quantity - 1) * spacing + length;
        const totalHeightUnits = height + hem + length;
    
        const maxDrawWidth = 1000 - 2 * padding;
        const maxDrawHeight = 1000 - 2 * padding;
    
        const scale = Math.min(
            maxDrawWidth / totalWidthUnits,
            maxDrawHeight / totalHeightUnits
        );
    
        const boxW = width * scale;
        const boxH = height * scale;
        const boxD = length * scale;
        const boxHem = hem * scale;
        const unitSpacing = spacing * scale;
    
        // Include hem height in vertical offset
        const contentWidth = quantity * boxW + (quantity - 1) * unitSpacing + boxD;
        const contentHeight = boxH + boxHem + boxD;
    
        const startX = (1000 - contentWidth) / 2;
        const startY = (1000 - contentHeight) / 2 + boxD;
    
        ctx.font = "18px sans-serif";
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
    
        for (let i = 0; i < quantity; i++) {
            const x = startX + i * (boxW + unitSpacing);
            const y = startY;
    
            // Draw front face
            ctx.strokeRect(x, y, boxW, boxH);
    
            // Draw hem
            if (hem > 0) {
                ctx.fillStyle = '#ccc';
                ctx.fillRect(x, y + boxH, boxW, boxHem);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(x, y + boxH, boxW, boxHem);
    
                ctx.fillStyle = '#000';
                ctx.font = "14px sans-serif";
                ctx.fillText(`${hem} mm hem`, x + boxW / 2 - 30, y + boxH + boxHem / 2 + 5);
            }
    
            // 3D box projection
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + boxD, y - boxD);
            ctx.moveTo(x + boxW, y);
            ctx.lineTo(x + boxW + boxD, y - boxD);
            ctx.moveTo(x + boxW, y + boxH);
            ctx.lineTo(x + boxW + boxD, y + boxH - boxD);
            ctx.moveTo(x, y + boxH);
            ctx.lineTo(x + boxD, y + boxH - boxD);
            ctx.stroke();
    
            // Back panel
            ctx.beginPath();
            ctx.moveTo(x + boxD, y - boxD);
            ctx.lineTo(x + boxW + boxD, y - boxD);
            ctx.lineTo(x + boxW + boxD, y + boxH - boxD);
            ctx.lineTo(x + boxD, y + boxH - boxD);
            ctx.closePath();
            ctx.stroke();
    
            // Projected hem (if any)
            if (hem > 0) {
                ctx.beginPath();
                ctx.moveTo(x, y + boxH + boxHem);
                ctx.lineTo(x + boxD, y + boxH + boxHem - boxD);
                ctx.moveTo(x + boxW, y + boxH + boxHem);
                ctx.lineTo(x + boxW + boxD, y + boxH + boxHem - boxD);
    
                ctx.moveTo(x + boxD, y + boxH - boxD);
                ctx.lineTo(x + boxD, y + boxH + boxHem - boxD);
                ctx.moveTo(x + boxW + boxD, y + boxH - boxD);
                ctx.lineTo(x + boxW + boxD, y + boxH + boxHem - boxD);
    
                ctx.moveTo(x + boxD, y + boxH + boxHem - boxD);
                ctx.lineTo(x + boxW + boxD, y + boxH + boxHem - boxD);
                ctx.stroke();
            }
    
            // Dimension labels
            ctx.fillStyle = '#000';
            ctx.font = "18px sans-serif";
    
            // Width
            ctx.fillText(`${width} mm`, x + boxW / 2 - 30, y + boxH + boxHem + 20);
    
            // Height (excluding hem)
            ctx.save();
            ctx.translate(x - 20, y + boxH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${height} mm`, -30, 0);
            ctx.restore();
    
            // Total height (including hem)
            ctx.save();
            ctx.translate(x - 50, y + (boxH + boxHem) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${height + hem} mm total`, -40, 0);
            ctx.restore();
    
            // Depth
            ctx.save();
            ctx.translate(x + boxW + boxD + 10, y - boxD - 10);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(`${length} mm`, 0, 0);
            ctx.restore();
        }
    });

    let flatMainHeight = data.width + 2 * data.seam;
    let flatMainWidth = 2 * data.hem + data.height * 2 + data.length;

    let flatSideWidth = data.length + data.hem;
    let flatSideHeight = data.height + data.hem;

    // Calculate total seam length
    let totalSeamLength =
        2 * flatMainWidth +        // Top and bottom of main panel
        2 * flatSideWidth +       // Top of both side panels
        4 * flatSideHeight;       // Left and right of both side panels

    vCanvas.withStep(1, (ctx) => {
        ctx.strokeStyle = '#f70';
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, 1000, 1000);
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Step 1: Flatten panels", 20, 60);
    
        let i = 0;
        for (const [key, value] of Object.entries(data)) {
            ctx.fillText(`${key}: ${value}`, 20, 100 + i * 40);
            i++;
        }
    
        ctx.fillText(`flatMainHeight: ${flatMainHeight}`, 20, 100 + i++ * 40);
        ctx.fillText(`flatMainWidth: ${flatMainWidth}`, 20, 100 + i++ * 40);
        ctx.fillText(`totalSeamLength: ${totalSeamLength} mm`, 20, 100 + i++ * 40);
    
        // Scaling
        const padding = 100;
        const availableWidth = 1000 - 2 * padding;
        const availableHeight = 1000 - 2 * padding;
        const layoutWidth = Math.max(flatMainWidth, flatSideWidth * 2 + 50);
        const layoutHeight = flatMainHeight + flatSideHeight + 50;
        const scale = Math.min(availableWidth / layoutWidth, availableHeight / layoutHeight);
    
        const mainW = flatMainWidth * scale;
        const mainH = flatMainHeight * scale;
        const sideW = flatSideWidth * scale;
        const sideH = flatSideHeight * scale;
    
        const originX = (1000 - layoutWidth * scale) / 2;
        const originY = (1000 - layoutHeight * scale) / 2;
    
        const mainX = originX + (layoutWidth * scale - mainW) / 2;
        const mainY = originY;
        const sideY = mainY + mainH + 50;
        const side1X = originX;
        const side2X = originX + sideW + 50;
    
        const seamOffset = data.seam * scale;
    
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
    
        // Main Panel
        ctx.strokeRect(mainX, mainY, mainW, mainH);
    
        // Hem lines (dotted) on left and right
        ctx.setLineDash([3, 5]);
        let hemW = data.hem * scale;
        ctx.beginPath();
        ctx.moveTo(mainX + hemW, mainY);
        ctx.lineTo(mainX + hemW, mainY + mainH);
        ctx.moveTo(mainX + mainW - hemW, mainY);
        ctx.lineTo(mainX + mainW - hemW, mainY + mainH);
        ctx.stroke();
    
        // Side lines (seam) in dashed style
        ctx.setLineDash([8, 6]);
        let seamLeft = hemW + data.height * scale;
        let seamRight = hemW + (data.height + data.length) * scale;
        ctx.beginPath();
        ctx.moveTo(mainX + seamLeft, mainY);
        ctx.lineTo(mainX + seamLeft, mainY + mainH);
        ctx.moveTo(mainX + seamRight, mainY);
        ctx.lineTo(mainX + seamRight, mainY + mainH);
        ctx.stroke();
        ctx.setLineDash([]);
    
        // Side panels
        ctx.strokeRect(side1X, sideY, sideW, sideH);
        ctx.strokeRect(side2X, sideY, sideW, sideH);
    
        // Dotted seam lines (accurate seam position)
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = '#00f';
    
        // Main panel: seam lines inside top and bottom edges
        ctx.beginPath();
        ctx.moveTo(mainX, mainY + seamOffset);
        ctx.lineTo(mainX + mainW, mainY + seamOffset);
        ctx.moveTo(mainX, mainY + mainH - seamOffset);
        ctx.lineTo(mainX + mainW, mainY + mainH - seamOffset);
        ctx.stroke();
    
        // Side panels: all seam lines
        ctx.beginPath();
        const seamXOffset = data.seam * scale;
    
        // First side panel
        ctx.moveTo(side1X, sideY + seamOffset);
        ctx.lineTo(side1X + sideW, sideY + seamOffset);
        ctx.moveTo(side1X + seamXOffset, sideY);
        ctx.lineTo(side1X + seamXOffset, sideY + sideH);
        ctx.moveTo(side1X + sideW - seamXOffset, sideY);
        ctx.lineTo(side1X + sideW - seamXOffset, sideY + sideH);
    
        // Second side panel
        ctx.moveTo(side2X, sideY + seamOffset);
        ctx.lineTo(side2X + sideW, sideY + seamOffset);
        ctx.moveTo(side2X + seamXOffset, sideY);
        ctx.lineTo(side2X + seamXOffset, sideY + sideH);
        ctx.moveTo(side2X + sideW - seamXOffset, sideY);
        ctx.lineTo(side2X + sideW - seamXOffset, sideY + sideH);
        ctx.stroke();
    
        ctx.setLineDash([]);
    
        // Hem bottom on side panels (dotted)
        ctx.setLineDash([3, 5]);
        let hemH = data.hem * scale;
        ctx.beginPath();
        ctx.moveTo(side1X, sideY + sideH - hemH);
        ctx.lineTo(side1X + sideW, sideY + sideH - hemH);
        ctx.moveTo(side2X, sideY + sideH - hemH);
        ctx.lineTo(side2X + sideW, sideY + sideH - hemH);
        ctx.stroke();
    
        // Dimension labels
        ctx.font = "16px sans-serif";
        ctx.fillStyle = '#000';
    
        ctx.fillText(`${flatMainWidth} mm`, mainX + mainW / 2 - 40, mainY - 10);
        ctx.save();
        ctx.translate(mainX - 10, mainY + mainH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${flatMainHeight} mm`, -40, 0);
        ctx.restore();
    
        ctx.fillText(`${flatSideWidth} mm`, side1X + sideW / 2 - 30, sideY - 10);
        ctx.save();
        ctx.translate(side1X - 10, sideY + sideH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${flatSideHeight} mm`, -35, 0);
        ctx.restore();
    
        ctx.save();
        ctx.translate(side2X - 10, sideY + sideH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${flatSideHeight} mm`, -35, 0);
        ctx.restore();
    
        const areaMainMM = flatMainWidth * flatMainHeight;
        const areaSideMM = flatSideWidth * flatSideHeight;
        const areaMainM2 = areaMainMM / 1e6;
        const areaSideM2 = areaSideMM / 1e6;
        const totalFabricArea = areaMainM2 + 2 * areaSideM2;
    
        ctx.font = "16px sans-serif";
        ctx.fillText(`Main Area: ${areaMainM2.toFixed(3)} m²`, mainX + mainW / 2 - 80, mainY + mainH / 2);
        ctx.fillText(`Side Area: ${areaSideM2.toFixed(3)} m²`, side1X + sideW / 2 - 80, sideY + sideH / 2);
        ctx.fillText(`Side Area: ${areaSideM2.toFixed(3)} m²`, side2X + sideW / 2 - 80, sideY + sideH / 2);
    
        ctx.font = "bold 28px sans-serif";
        ctx.fillText(`totalFabricArea: ${totalFabricArea} m²`, 20, 100 + i++ * 40);
    });
    

    const maxIterations = data.iterations;
    const showTestingLayouts = true;

    // Step 2: Nesting layout
    //Show wastage, total length, total rolls

    // Global variables to persist across runs


    vCanvas.withStep(2, (ctx) => {
        // Clear entire canvas at start
        //ctx.clearRect(10, 10, 990, 990);

    

    

        // Stop any previous processes
        function stopPreviousProcesses() {
            isRunning = false;
            currentRunId++;
            if (currentTimeout) {
                clearTimeout(currentTimeout);
                currentTimeout = null;
            }
            if (currentIdleCallback) {
                cancelIdleCallback(currentIdleCallback);
                currentIdleCallback = null;
            }
            // Clear canvas to remove old visuals
            //ctx.clearRect(10, 10, 990, 990);
        }

        // Call immediately to stop existing runs
        stopPreviousProcesses();

        // Local variables
        let iterationCount = 0;
        let bestLayout = null;
        let bestLength = Infinity;
        let lastBestLength = Infinity;

        // Canvas setup
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, 1000, 1000);
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Step 2: Nest in roll", 20, 60);

        let i = 0;
        for (const [key, value] of Object.entries(data)) {
            ctx.fillText(`${key}: ${value}`, 20, 100 + i * 40);
            i++;
        }

        // Create panels array
        const panels = [];
        for (let unit = 0; unit < data.quantity; unit++) {
            panels.push({ id: `main-${unit}`, w: flatMainWidth, h: flatMainHeight });
            panels.push({ id: `side-${unit}-1`, w: flatSideWidth, h: flatSideHeight, unit });
            panels.push({ id: `side-${unit}-2`, w: flatSideWidth, h: flatSideHeight, unit });
        }

        const rollWidth = data.fabricwidth;
        const stepIndex = 2;
        const offsetY = stepIndex * 1000 + 500;

        // Validate panels
        const invalid = panels.some(panel => Math.min(panel.w, panel.h) > rollWidth);
        if (invalid) {
            ctx.fillStyle = 'red';
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("⚠️ At least one panel requires seams. Nesting aborted.", 100, 600);
            return;
        }

        if (data.quantity > 4) {
            ctx.fillStyle = 'red';
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("⚠️ Too many panels. Nesting aborted.", 100, 600);
            return;
        }

        if (data.iterations > 100) {
            ctx.fillStyle = 'red';
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("⚠️ Too many iterations. Nesting aborted.", 100, 600);
            return;
        }

        // Calculate theoretical minimum length
        const totalArea = panels.reduce((sum, p) => sum + (p.w * p.h), 0);
        const theoreticalMinLength = totalArea / rollWidth;

        // Heuristic: Stack side panels vertically per unit
        const sortedHeuristic = [];
        for (let unit = 0; unit < data.quantity; unit++) {
            sortedHeuristic.push({ id: `main-${unit}`, w: flatMainWidth, h: flatMainHeight });
            const sideRotated = flatSideHeight <= rollWidth;
            sortedHeuristic.push({
                id: `side-${unit}-1`,
                w: sideRotated ? flatSideHeight : flatSideWidth,
                h: sideRotated ? flatSideWidth : flatSideHeight,
                rotated: sideRotated,
                unit
            });
            sortedHeuristic.push({
                id: `side-${unit}-2`,
                w: sideRotated ? flatSideHeight : flatSideWidth,
                h: sideRotated ? flatSideWidth : flatSideHeight,
                rotated: sideRotated,
                unit
            });
        }
        const heuristicResult = tryPlacement(sortedHeuristic);
        if (heuristicResult) {
            bestLayout = heuristicResult.placed;
            bestLength = heuristicResult.usedLength;
            lastBestLength = bestLength;
            console.log(`New best layout found with length: ${bestLength} mm`);
        }

        // Reset the simulation
        function resetSimulation() {
            iterationCount = 0;
            bestLayout = null;
            bestLength = Infinity;
            lastBestLength = Infinity;
            stopPreviousProcesses();
        }

        // Shuffle array function
        function shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }

        // Try placing panels with forced vertical stacking
        function tryPlacement(permutation) {
            const placed = [];
            const placedIds = new Set();
            let usedLength = 0;

            const toPlace = [...permutation];

            while (toPlace.length > 0) {
                let placedThis = false;
                const panel = toPlace[0];

                const orientations = [
                    { rotated: false, w: panel.w, h: panel.h },
                    { rotated: true, w: panel.h, h: panel.w }
                ].filter(o => o.w <= rollWidth);

                if (panel.id.includes('side-') && orientations.some(o => o.rotated)) {
                    orientations.sort((a, b) => (a.rotated ? -1 : 1));
                } else {
                    shuffleArray(orientations);
                }

                const isSidePanel = panel.id.includes('side-');
                let stackPartner = null;
                if (isSidePanel) {
                    const partnerId = panel.id.endsWith('-1') ? `side-${panel.unit}-2` : `side-${panel.unit}-1`;
                    const partnerIndex = toPlace.findIndex(p => p.id === partnerId);
                    if (partnerIndex !== -1) stackPartner = toPlace[partnerIndex];
                }

                for (const orient of orientations) {
                    for (let y = 0; y <= usedLength + orient.h; y++) {
                        for (let x = 0; x <= rollWidth - orient.w; x++) {
                            const overlaps = placed.some(p =>
                                x < p.x + p.w && x + orient.w > p.x &&
                                y < p.y + p.h && y + orient.h > p.y
                            );
                            if (!overlaps && !placedIds.has(panel.id)) {
                                placed.push({ ...panel, x, y, w: orient.w, h: orient.h, rotated: orient.rotated });
                                placedIds.add(panel.id);
                                usedLength = Math.max(usedLength, y + orient.h);
                                placedThis = true;

                                if (isSidePanel && stackPartner && !placedIds.has(stackPartner.id)) {
                                    const partnerOrient = orient;
                                    if (x + partnerOrient.w <= rollWidth) {
                                        const stackY = y + orient.h;
                                        const stackOverlaps = placed.some(p =>
                                            x < p.x + p.w && x + partnerOrient.w > p.x &&
                                            stackY < p.y + p.h && stackY + partnerOrient.h > p.y
                                        );
                                        if (!stackOverlaps) {
                                            placed.push({
                                                ...stackPartner,
                                                x,
                                                y: stackY,
                                                w: partnerOrient.w,
                                                h: partnerOrient.h,
                                                rotated: partnerOrient.rotated
                                            });
                                            placedIds.add(stackPartner.id);
                                            toPlace.splice(toPlace.findIndex(p => p.id === stackPartner.id), 1);
                                            usedLength = Math.max(usedLength, stackY + partnerOrient.h);
                                        }
                                    }
                                }

                                toPlace.splice(0, 1);
                                break;
                            }
                        }
                        if (placedThis) break;
                    }
                    if (placedThis) break;
                }

                if (!placedThis) return null;
            }

            if (placed.length !== panels.length) {
                console.warn(`Invalid layout: Expected ${panels.length} panels, got ${placed.length}`);
                return null;
            }

            return { placed, usedLength };
        }

        // Local search to improve layout
        function localSearch(currentLayout, usedLength) {
            let bestLocalLayout = currentLayout;
            let bestLocalLength = usedLength;

            for (let i = 0; i < currentLayout.length - 1; i++) {
                const newLayout = [...currentLayout];
                [newLayout[i], newLayout[i + 1]] = [newLayout[i + 1], newLayout[i]];
                const result = tryPlacement(newLayout.map(p => ({ ...p })));
                if (result && result.usedLength < bestLocalLength) {
                    bestLocalLayout = result.placed;
                    bestLocalLength = result.usedLength;
                }
            }

            for (let i = 0; i < currentLayout.length; i++) {
                const newLayout = [...currentLayout];
                newLayout[i] = { ...newLayout[i], rotated: !newLayout[i].rotated };
                const result = tryPlacement(newLayout.map(p => ({ ...p })));
                if (result && result.usedLength < bestLocalLength) {
                    bestLocalLayout = result.placed;
                    bestLocalLength = result.usedLength;
                }
            }

            for (let unit = 0; unit < data.quantity; unit++) {
                const side1 = currentLayout.find(p => p.id === `side-${unit}-1`);
                const side2 = currentLayout.find(p => p.id === `side-${unit}-2`);
                if (side1 && side2 && side1.x !== side2.x && side1.y !== side2.y + side1.h) {
                    const newLayout = [...currentLayout];
                    const idx1 = newLayout.findIndex(p => p.id === `side-${unit}-1`);
                    const idx2 = newLayout.findIndex(p => p.id === `side-${unit}-2`);
                    newLayout[idx1] = { ...side1, rotated: true };
                    newLayout[idx2] = { ...side2, rotated: true };
                    const result = tryPlacement(newLayout.map(p => ({ ...p })));
                    if (result && result.usedLength < bestLocalLength) {
                        bestLocalLayout = result.placed;
                        bestLocalLength = result.usedLength;
                    }
                }
            }

            if (bestLocalLayout.length !== panels.length) {
                console.warn(`Invalid local search layout: Expected ${panels.length} panels, got ${bestLocalLayout.length}`);
                return { placed: currentLayout, usedLength };
            }

            return { placed: bestLocalLayout, usedLength: bestLocalLength };
        }

        // Draw iteration count
        function drawIterationCount() {
            ctx.fillStyle = '#000';
            ctx.clearRect(800, offsetY - 30, 200, 50);
            ctx.font = "bold 28px sans-serif";
            ctx.fillText(`Iterations: ${iterationCount}`, 820, offsetY);
        }

        // Draw preview of current and best layouts
        function drawResultPreview(layout) {
            const previewOffsetXCurrent = 200;
            const previewOffsetXBest = 650;
            const previewOffsetY = offsetY + 100;
            const fabricHeight = rollWidth;
            const fabricLength = bestLength || 1000;
            const scale = Math.min(400 / fabricLength, 200 / fabricHeight);

            // Clear larger area to prevent overlap
            ctx.clearRect(0, offsetY - 30, 1000, 300);

            ctx.fillStyle = '#000';
            ctx.font = "bold 16px sans-serif";
            ctx.fillText("Current Layout", previewOffsetXCurrent, previewOffsetY - 10);

            layout.forEach(item => {
                const x = previewOffsetXCurrent + item.y * scale;
                const y = previewOffsetY + item.x * scale;
                const w = item.h * scale;
                const h = item.w * scale;

                ctx.fillStyle = item.id.includes('side-') ? '#afa' : (item.rotated ? '#aaf' : '#bbb');
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#888';
                ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = '#000';
                ctx.font = "10px sans-serif";
                ctx.fillText(item.rotated ? `${item.id} (R)` : item.id, x + 4, y + 12);
            });

            if (bestLayout) {
                ctx.fillStyle = '#000';
                ctx.font = "bold 16px sans-serif";
                ctx.fillText(`Best Layout (${bestLength.toFixed(0)} mm)`, previewOffsetXBest, previewOffsetY - 10);

                bestLayout.forEach(item => {
                    const x = previewOffsetXBest + item.y * scale;
                    const y = previewOffsetY + item.x * scale;
                    const w = item.h * scale;
                    const h = item.w * scale;

                    ctx.fillStyle = item.id.includes('side-') ? '#afa' : (item.rotated ? '#aaf' : '#bbb');
                    ctx.fillRect(x, y, w, h);
                    ctx.strokeStyle = '#888';
                    ctx.strokeRect(x, y, w, h);
                    ctx.fillStyle = '#000';
                    ctx.font = "10px sans-serif";
                    ctx.fillText(item.rotated ? `${item.id} (R)` : item.id, x + 4, y + 12);
                });
            }
        }

        // Draw final result
        function drawResult() {
            if (!bestLayout) {
                ctx.fillStyle = 'orange';
                ctx.font = "bold 18px sans-serif";
                ctx.fillText("⚠️ No valid layout found within iteration limit.", 100, 650);
                return;
            }

            const fabricHeight = rollWidth;
            const fabricLength = bestLength;
            const scale = Math.min(900 / fabricLength, 900 / fabricHeight);
            const offsetX = 50;
            const drawOffsetY = stepIndex * 1000 + 800;

            // Clear final layout area
            ctx.clearRect(0, drawOffsetY - 50, 1000, 300);

            ctx.strokeStyle = '#000';
            ctx.fillStyle = '#eee';
            ctx.lineWidth = 2;
            ctx.strokeRect(offsetX, drawOffsetY, fabricLength * scale, fabricHeight * scale );
            ctx.font = "32px sans-serif";
            ctx.fillStyle = '#000';
            ctx.fillText(`${fabricLength.toFixed(0)} mm`, offsetX + (fabricHeight * scale) / 2, drawOffsetY + fabricHeight * scale + 50);
            ctx.save();
            ctx.translate(offsetX - 20, drawOffsetY + (fabricHeight * scale) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${fabricHeight.toFixed(0)} mm`, -30, 0);
            ctx.restore();

            bestLayout.forEach(item => {
                const x = offsetX + item.y * scale;
                const y = drawOffsetY + item.x * scale;
                const w = item.h * scale;
                const h = item.w * scale;

                ctx.fillStyle = item.id.includes('side-') ? '#afa' : (item.rotated ? '#aaf' : '#ddd');
                ctx.fillRect(x, y, w, h);
                ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = '#000';
                ctx.font = "12px sans-serif";
                ctx.fillText(item.rotated ? `${item.id} (R)` : item.id, x + 4, y + 16);
            });
        }

        // Process batch of iterations
        function processBatch(deadline, runId) {
            if (runId !== currentRunId || !isRunning) return;

            while (deadline.timeRemaining() > 0 && iterationCount < maxIterations && isRunning) {
                iterationCount++;

                const permutation = [...panels];
                shuffleArray(permutation);

                if (iterationCount % 10 === 0) drawIterationCount();

                const result = tryPlacement(permutation);

                if (showTestingLayouts && result) {
                    drawResultPreview(result.placed);
                }

                if (result && result.usedLength < bestLength * 1.2) {
                    const localResult = localSearch(result.placed, result.usedLength);
                    if (localResult.usedLength < bestLength) {
                        bestLayout = localResult.placed;
                        bestLength = localResult.usedLength;
                        lastBestLength = bestLength;
                        console.log(`New best layout found with length: ${bestLength} mm`);
                    }
                    if (bestLength <= theoreticalMinLength * 1.05) {
                        drawIterationCount();
                        drawResult();
                        stopPreviousProcesses();
                        return;
                    }
                }
            }

            drawIterationCount();

            if (iterationCount < maxIterations && isRunning) {
                if ('requestIdleCallback' in window) {
                    currentIdleCallback = requestIdleCallback(deadline => processBatch(deadline, runId));
                } else {
                    currentTimeout = setTimeout(() => processBatch({ timeRemaining: () => 10, didTimeout: true }, runId), 0);
                }
            } else {
                drawResult();
                stopPreviousProcesses();
            }
        }

        // Start the process
        resetSimulation();
        isRunning = true;
        currentRunId++;
        const runId = currentRunId;
        if ('requestIdleCallback' in window) {
            currentIdleCallback = requestIdleCallback(deadline => processBatch(deadline, runId));
        } else {
            currentTimeout = setTimeout(() => processBatch({ timeRemaining: () => 10, didTimeout: true }, runId), 0);
        }
    });
    
        
        
    
    
    
    
    
    
    
    

    // Step 3: Show summary
    vCanvas.withStep(3, (ctx) => {
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, 1000, 1000);
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Step 3: Summary", 20, 60);
        let i = 0;
        for (const [key, value] of Object.entries(data)) {
            ctx.fillText(`${key}: ${value}`, 20, 100 + i * 40);
            i++;
        }
    });

    vCanvas.finish();
}





function startNewIteration() {
    // Reset iteration count and best layout
    iterationCount = 0;
    bestLayout = null;
    bestLength = Infinity;
    
    // Reinitialize the permutation generator
    permutationGen = permute(panels);
    
    // Redraw the iteration counter
    drawIterationCount();
    
    // Start the new process
    if ('requestIdleCallback' in window) {
        requestIdleCallback(processBatch);
    } else {
        setTimeout(() => processBatch({ timeRemaining: () => 10, didTimeout: true }), 0);
    }
}

function stopPreviousProcesses() {
    // Clear previous iteration or async tasks
    if (iterationCount > 0) {
        iterationCount = 0;
        permutationGen = null; // Stop the permutation generator
        // Optionally clear timeout or cancel any remaining requests
        // In most cases, you'd cancel previous async operations here
    }
}

// Function to call when the process is restarted
function restartNesting() {
    // Stop any ongoing process
    stopPreviousProcesses();

    // Start a fresh iteration with the current settings
    startNewIteration();
}






function renderSurgicalSteps(ctx, canvasWidth, canvasHeight) {
    // Step 1: Setup virtual space
    const virtualWidth = 1000;
    const virtualHeight = 4000;

    // Step 2: Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Step 3: Scale to fit entire virtual space into canvas
    const scaleX = canvasWidth / virtualWidth;
    const scaleY = canvasHeight / virtualHeight;
    const scale = Math.min(scaleX, scaleY);

    // Step 4: Center in canvas
    const offsetX = (canvasWidth - virtualWidth * scale) / 2;
    const offsetY = (canvasHeight - virtualHeight * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Step 5: Draw 7 stacked squares
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;

    for (let i = 0; i < 4; i++) {
        const y = i * 1000;
        ctx.strokeRect(0, y, 1000, 1000);
        ctx.fillText(`Step ${i + 1}`, 20, y + 40);
    }

    ctx.restore();
}