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
            length: parseFloat(document.getElementById('surgicalLength')?.value) || 0,
            width: parseFloat(document.getElementById('surgicalWidth')?.value) || 0,
            height: parseFloat(document.getElementById('surgicalHeight')?.value) || 0,
            seam: parseFloat(document.getElementById('surgicalSeam')?.value) || 0,
            hem: parseFloat(document.getElementById('surgicalHem')?.value) || 0,
            quantity: parseInt(document.getElementById('surgicalQuantity')?.value) || 0,
            fabricwidth: parseFloat(document.getElementById('surgicalFabricWidth')?.value) || 0,
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
        'surgicalFabricWidth'
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

function renderSurgicalSteps(ctx, canvasWidth, canvasHeight) {
    // Step 1: Setup virtual space
    const virtualWidth = 1000;
    const virtualHeight = 7000;

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

    for (let i = 0; i < 7; i++) {
        const y = i * 1000;
        ctx.strokeRect(0, y, 1000, 1000);
        ctx.fillText(`Step ${i + 1}`, 20, y + 40);
    }

    ctx.restore();
}

function renderSurgicalCanvas(canvas, data) {
    const vCanvas = new VirtualCanvas(canvas);
    vCanvas.resize();

    vCanvas.withStep(0, (ctx) => {

        ctx.strokeStyle = '#F00';
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, 1000, 1000);
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Step 1: 3D Box Panels", 20, 60);
        let i = 0;
        for (const [key, value] of Object.entries(data)) {
            ctx.fillText(`${key}: ${value}`, 20, 100 + i * 40);
            i++;
        }

    
        const quantity = Math.max(1, data.quantity || 1);
        const width = data.width || 1;
        const height = data.height || 1;
        const length = data.length || 1;
    
        const padding = 100;
        const spacing = 10;
    
        // Total visual space required includes forward face + projected depth
        const totalWidthUnits = quantity * width + (quantity - 1) * spacing + length; // rightward projection
        const totalHeightUnits = height + length; // upward projection
    
        const maxDrawWidth = 1000 - 2 * padding;
        const maxDrawHeight = 1000 - 2 * padding;
    
        const scale = Math.min(
            maxDrawWidth / totalWidthUnits,
            maxDrawHeight / totalHeightUnits
        );
    
        const boxW = width * scale;
        const boxH = height * scale;
        const boxD = length * scale;
        const unitSpacing = spacing * scale;
    
        // Account for depth when calculating available area
        const contentWidth = quantity * boxW + (quantity - 1) * unitSpacing + boxD;
        const contentHeight = boxH + boxD;
    
        const startX = (1000 - contentWidth) / 2;
        const startY = (1000 - contentHeight) / 2 + boxD; // shift down so top edge includes depth
    
        ctx.font = "18px sans-serif";
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
    
        for (let i = 0; i < quantity; i++) {
            const x = startX + i * (boxW + unitSpacing);
            const y = startY;
    
            // Draw front face
            ctx.strokeRect(x, y, boxW, boxH);
    
            // Draw 45° projection UP and RIGHT for depth
            ctx.beginPath();
            ctx.moveTo(x, y); // top-left
            ctx.lineTo(x + boxD, y - boxD); // back-top-left
            ctx.moveTo(x + boxW, y); // top-right
            ctx.lineTo(x + boxW + boxD, y - boxD); // back-top-right
            ctx.moveTo(x + boxW, y + boxH); // bottom-right
            ctx.lineTo(x + boxW + boxD, y + boxH - boxD); // back-bottom-right
            ctx.moveTo(x, y + boxH); // bottom-left
            ctx.lineTo(x + boxD, y + boxH - boxD); // back-bottom-left
            ctx.stroke();
    
            // Connect back panel
            ctx.beginPath();
            ctx.moveTo(x + boxD, y - boxD);
            ctx.lineTo(x + boxW + boxD, y - boxD);
            ctx.lineTo(x + boxW + boxD, y + boxH - boxD);
            ctx.lineTo(x + boxD, y + boxH - boxD);
            ctx.closePath();
            ctx.stroke();
    
            // Dimension label: width
            ctx.fillText(`${data.width} mm`, x + boxW / 2 - 30, y + boxH + 20);
    
            // Dimension label: height
            ctx.save();
            ctx.translate(x - 20, y + boxH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${data.height} mm`, -30, 0);
            ctx.restore();
    
            // Dimension label: depth
            ctx.save();
            ctx.translate(x + boxW + boxD + 10, y - boxD - 10);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(`${data.length} mm`, 0, 0);
            ctx.restore();
        }
    
    });
    
    // Step 1: Flat layout
    vCanvas.withStep(1, (ctx) => {
        ctx.strokeStyle = '#F70';
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, 1000, 1000);
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Step 2: FLAT", 20, 60);
        let i = 0;
        for (const [key, value] of Object.entries(data)) {
            ctx.fillText(`${key}: ${value}`, 20, 100 + i * 40);
            i++;
        }
    });

    // Step 2: Nesting layout
    vCanvas.withStep(2, (ctx) => {
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, 1000, 1000); // fabric background
        for (let i = 0; i < 4; i++) {
            ctx.strokeRect(50 + i * 220, 200, 200, 300); // pretend nested panels
        }
        ctx.fillText("Step 3: Fabric Nesting", 20, 40);
    });

    // Step 3: Multiply by quantity
    vCanvas.withStep(3, (ctx) => {
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 3; col++) {
                ctx.strokeRect(50 + col * 300, 150 + row * 350, 200, 200);
            }
        }
        ctx.fillText("Step 4: Repeated Layouts", 20, 40);
    });

    // Step 4: Show waste
    vCanvas.withStep(4, (ctx) => {
        ctx.fillStyle = '#eee';
        ctx.fillRect(0, 0, 1000, 1000);
        ctx.fillStyle = '#000';
        ctx.fillRect(100, 200, 800, 600); // fabric
        ctx.clearRect(150, 250, 200, 200); // holes = used panels
        ctx.clearRect(550, 250, 200, 200);
        ctx.fillText("Step 5: Waste Estimation", 20, 40);
    });

    // Step 5: Show cost breakdown
    vCanvas.withStep(5, (ctx) => {
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("Step 6: Cost Breakdown", 20, 40);
        ctx.font = "16px sans-serif";
        ctx.fillText("Fabric: $120", 50, 120);
        ctx.fillText("Labour: $60", 50, 160);
        ctx.fillText("Waste: $10", 50, 200);
        ctx.fillText("Total: $190", 50, 240);
    });

    // Step 6: Final summary
    vCanvas.withStep(6, (ctx) => {
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Step 7: Summary + Export", 20, 60);
        ctx.strokeRect(200, 200, 600, 600); // pretend to be final layout
        ctx.fillText("Preview Area", 400, 520);
    });

    vCanvas.finish();
}
