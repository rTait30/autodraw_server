

//-----------------------------------------------------------------------------------------------------------

//                                STEP 0: VISUALISE COVERS

//-----------------------------------------------------------------------------------------------------------



export const zeroVisualise = {
    title: 'Step 0: Visualise covers',
    initialData: { length: 1, width: 1, height: 1 },
    dependencies: [],
    isLive: false,
    isAsync: false,



    // ----------------------------------- CALC -------------------------------------------



    // Calculation step: does nothing for this step
    calcFunction: (data) => {
        // No calculation, just return data as-is
        return data;
    },



    // ----------------------------------- DRAW -------------------------------------------



    drawFunction: (ctx, virtualWidth, virtualHeight, data) => {

        const quantity = Math.max(1, data.quantity || 1);
        const width = data.width || 1;
        const height = data.height || 1;
        const length = data.length || 1;
        const hem = data.hem || 0;

        const padding = 100;
        const spacing = width / 4;

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
        
        return data;

    }        
        
    
    
    //------------------------------------- END DRAW ----------------------------------------


};





//-----------------------------------------------------------------------------------------------------------

//                                      STEP 1: FLAT PATTERN

//-----------------------------------------------------------------------------------------------------------



export const oneFlatten = {
    title: 'Step 1: Flatten Panels',
    initialData: { length: 1, width: 1, height: 1 },
    dependencies: [],
    isLive: false,
    isAsync: false,



    // ----------------------------------- CALC -------------------------------------------
    


    calcFunction: (data) => {
        // ...all your calculation logic here...
        let flatMainHeight = data.width + 2 * data.seam;
        let flatMainWidth = 2 * data.hem + data.height * 2 + data.length;
        let flatSideWidth = data.width + data.seam * 2;
        let flatSideHeight = data.height + data.hem + data.seam;
        let totalSeamLength =
            2 * flatMainWidth +
            2 * flatSideWidth +
            4 * flatSideHeight;

        data.totalSeamLength = totalSeamLength;
        data.flatMainHeight = flatMainHeight;
        data.flatMainWidth = flatMainWidth;
        data.flatSideHeight = flatSideHeight;
        data.flatSideWidth = flatSideWidth;

        const areaMainMM = flatMainWidth * flatMainHeight;
        const areaSideMM = flatSideWidth * flatSideHeight;
        const areaMainM2 = areaMainMM / 1e6;
        const areaSideM2 = areaSideMM / 1e6;
        const totalFabricArea = areaMainM2 + 2 * areaSideM2;

        data.areaMainM2 = areaMainM2;
        data.areaSideM2 = areaSideM2;
        data.totalFabricArea = totalFabricArea;

        return data;
    },



    // ----------------------------------- DRAW -------------------------------------------



    drawFunction: (ctx, virtualWidth, virtualHeight, data) => {

        data = oneFlatten.calcFunction(data);


        let flatMainHeight = data.width + 2 * data.seam;
        let flatMainWidth = 2 * data.hem + data.height * 2 + data.length;

        let flatSideWidth = data.width + data.seam * 2;
        let flatSideHeight = data.height + data.hem + data.seam;

        // Calculate total seam length
        let totalSeamLength =
            2 * flatMainWidth +        // Top and bottom of main panel
            2 * flatSideWidth +       // Top of both side panels
            4 * flatSideHeight;       // Left and right of both side panels

        let i = 0;

        data.totalSeamLength = totalSeamLength;

        data.flatMainHeight = flatMainHeight;
        data.flatMainWidth = flatMainWidth;

        data.flatSideHeight = flatSideHeight;
        data.flatSideWidth = flatSideWidth;

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
    
        ctx.fillText(`totalFabricArea: ${totalFabricArea} m²`, 800, 900);






        // ----------------------------------- END DRAW --------------------------------------

        return data;

    }
};





//-----------------------------------------------------------------------------------------------------------

//                                      STEP 2: TWO EXTRA PANELS

//-----------------------------------------------------------------------------------------------------------



function splitPanelIfNeeded(width, height, fabricWidth, minAllowance, seam) {
    // Always treat the shorter side as height
    if (width < height) {
        let temp = width;  // store original width
        width = height;    // assign height to width
        height = temp;     // assign original width to height
    }
    


    // Case: No seam needed
    if (height <= fabricWidth) {
        return [{
            width,
            height,
            hasSeam: "no"
        }];
    }

    let panels = [];

    if (height > fabricWidth - seam + minAllowance) {
        // Case: One full-width panel and a remainder
        const firstHeight = fabricWidth;
        const secondHeight = height - fabricWidth + seam * 2;

        console.log(firstHeight);
        console.log(secondHeight);

        panels.push({
            width: width,
            height: firstHeight,
            hasSeam: "top"
        });

        panels.push({
            width: width,
            height: secondHeight,
            hasSeam: "bottom"
        });

    } else {
        // Case: central seam, two equal parts with seam
        const half = height / 2;

        console.log("central")

        if (half < minAllowance) {
            throw new Error("Split halves are too small.");
        }

        const pieceHeight = half + seam;

        panels.push({
            width: width,
            height: pieceHeight,
            hasSeam: "top"
        });

        panels.push({
            width: width,
            height: pieceHeight,
            hasSeam: "bottom"
        });
    }

    console.log(panels);

    // Rotate back if original panel was rotated
    return panels;
}

export const twoExtra = {
    title: 'Step 2: Create extra seams if wider than fabric',
    initialData: { },
    dependencies: [],
    isLive: false,
    isAsync: false,



    // ----------------------------------- CALC -------------------------------------------



    calcFunction: (data) => {

        

    },



    // ----------------------------------- DRAW -------------------------------------------



    drawFunction: (ctx, virtualWidth, virtualHeight, data) => {



        ctx.save();  // Save canvas state at start

        let mainPanels = splitPanelIfNeeded(data.flatMainWidth, data.flatMainHeight, data.fabricWidth, 1, data.seam);
        let sidePanels = splitPanelIfNeeded(data.flatSideWidth, data.flatSideHeight, data.fabricWidth, 1, data.seam);
    
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
        //ctx.fillText(`Total Area: ${totalArea.toFixed(3)} m²`, width - 100, height - 20);
    
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

        return data;
        
    } 

    // ----------------------------------- END DRAW --------------------------------------

};