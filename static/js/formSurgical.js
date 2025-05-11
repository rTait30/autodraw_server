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



function renderSurgicalCanvas(canvas, data) {
    const vCanvas = new VirtualCanvas(canvas);
    vCanvas.resize();


    vCanvas.withStep(0, (ctx) => {



        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, 1000, 1000);
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Step 0: Visualise  covers", 20, 60);
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
        const spacing = data.width / 5;
    
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

    let flatMainHeight = data.width + 2 * data.seam;
    let flatMainWidth = 2 * data.hem + data.height * 2 + data.length;

    let rightFlatWidth = data.length + data.hem;
    let rightFlatHeight = data.height + data.hem;
    
    // Step 1: Flat layout
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
        ctx.fillText(`flatMainWidth: ${flatMainWidth}`, 20, 100 + i * 40);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        // Draw front face
        ctx.strokeRect(50, 500, data.width / 10, data.height / 10);
    });

    // Step 2: Nesting layout
    //Show wastage, total length, total rolls
    vCanvas.withStep(2, (ctx) => {
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