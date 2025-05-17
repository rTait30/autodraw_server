function splitPanelIfNeeded(width, height, fabricWidth, minAllowance, seam) {
    // Always treat the shorter side as height
    const rotated = width < height;
    let panelWidth = rotated ? height : width;
    let panelHeight = rotated ? width : height;

    // Case: No seam needed
    if (panelHeight <= fabricWidth) {
        return [{
            width,
            height,
            hasSeam: "no"
        }];
    }

    let panels = [];

    if (panelHeight > fabricWidth - seam + minAllowance) {
        // Case: One full-width panel and a remainder
        const firstHeight = fabricWidth;
        const secondHeight = panelHeight - fabricWidth + seam * 2;

        console.log(firstHeight);
        console.log(secondHeight);

        panels.push({
            width: panelWidth,
            height: firstHeight,
            hasSeam: "top"
        });

        panels.push({
            width: panelWidth,
            height: secondHeight,
            hasSeam: "bottom"
        });

    } else {
        // Case: central seam, two equal parts with seam
        const half = panelHeight / 2;

        console.log("central")

        if (half < minAllowance) {
            throw new Error("Split halves are too small.");
        }

        const pieceHeight = half + seam;

        panels.push({
            width: panelWidth,
            height: pieceHeight,
            hasSeam: "top"
        });

        panels.push({
            width: panelWidth,
            height: pieceHeight,
            hasSeam: "bottom"
        });
    }

    console.log(panels);

    // Rotate back if original panel was rotated
    return panels;
}

function createPanelObject(flatMainWidth, flatMainHeight, flatSideWidth, flatSideHeight, fabricWidth, minAllowance, seam) {
    const result = {};

    const mainPanels = splitPanelIfNeeded(flatMainWidth, flatMainHeight, fabricWidth, minAllowance, seam);
    mainPanels.forEach((panel, i) => {
        result[`main${i + 1}`] = panel;
    });

    const sidePanels = splitPanelIfNeeded(flatSideWidth, flatSideHeight, fabricWidth, minAllowance, seam);
    sidePanels.forEach((panel, i) => {
        result[`side${i + 1}`] = panel;
    });

    return result;
}

const twoExtra = {
    title: 'Step 2: Create extra seams if wider than fabric',
    initialData: { },
    dependencies: [],
    isLive: false,



    drawFunction: (ctx, virtualWidth, virtualHeight, data) => {



        // ----------------------------------- DRAW -------------------------------------------



        ctx.save();  // Save canvas state at start

        let mainPanels = splitPanelIfNeeded(data.flatMainWidth, data.flatMainHeight, data.fabricwidth, 1, data.seam);
        let sidePanels = splitPanelIfNeeded(data.flatSideWidth, data.flatSideHeight, data.fabricwidth, 1, data.seam);
    
        let result = {};
    
        mainPanels.forEach((panel, i) => {
            result[`main${i + 1}`] = panel;
        });
    
        sidePanels.forEach((panel, i) => {
            result[`Rside${i + 1}`] = panel;
        });
    
        sidePanels.forEach((panel, i) => {
            result[`Lside${i + 1}`] = panel;
        });
    
        const width = 1000;
        const height = 1000;
    
        const padding = 100;
        const availableWidth = width - 2 * padding;
        const availableHeight = height - 2 * padding;
    
        const entries = Object.entries(result);
        let totalWidth = 0;
        let maxHeight = 0;
    
        for (const [, panel] of entries) {
            totalWidth += panel.width + 50;
            maxHeight = Math.max(maxHeight, panel.height);
        }
        totalWidth -= 50;
    
        const scale = Math.min(
            availableWidth / totalWidth,
            availableHeight / maxHeight
        );
    
        let cursorX = (width - totalWidth * scale) / 2;
        const originY = (height - maxHeight * scale) / 2;
    
        ctx.lineWidth = 2;
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
    
        let totalArea = 0;
    
        for (const [name, panel] of entries) {
            const w = panel.width * scale;
            const h = panel.height * scale;
            const x = cursorX;
            const y = originY;
    
            // Outline
            ctx.strokeStyle = "#000";
            ctx.setLineDash([]);
            ctx.strokeRect(x, y, w, h);
    
            // Seam (if present)
            if (panel.hasSeam === "top" || panel.hasSeam === "bottom") {
                const seamOffset = data.seam * scale;
                const seamY = panel.hasSeam === "top" ? y + seamOffset : y + h - seamOffset;
    
                ctx.strokeStyle = "#00f";
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(x, seamY);
                ctx.lineTo(x + w, seamY);
                ctx.stroke();
            }
    
            ctx.setLineDash([]);
            ctx.strokeStyle = "#000";
    
            // Area and name
            const area = (panel.width * panel.height) / 1e6;
            totalArea += area;
    
            ctx.fillText(name, x + w / 2, y + h / 2 - 18);
            ctx.fillText(`${area.toFixed(3)} m²`, x + w / 2, y + h / 2 + 2);
    
            // Dimensions
            ctx.fillText(`${panel.width} mm`, x + w / 2, y - 12);
            ctx.save();
            ctx.translate(x - 12, y + h / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${panel.height} mm`, 0, 0);
            ctx.restore();
    
            cursorX += w + 50;
        }

        // Total area (bottom right)
        ctx.fillText(`Total Area: ${totalArea.toFixed(3)} m²`, width - 100, height - 20);
    
        ctx.restore();  // Restore canvas state at end

        const finalPanels = {
            quantity: data.quantity,
            panels: {}
        };
        
        for (const [key, panel] of Object.entries(result)) {
        // Copy panel properties except hasSeam
        const { hasSeam, ...panelWithoutSeam } = panel;
        finalPanels.panels[key] = panelWithoutSeam;
        }

        data.finalPanels = finalPanels;

        // ----------------------------------- END DRAW --------------------------------------

        return data;
        
    } 
};

export default twoExtra;