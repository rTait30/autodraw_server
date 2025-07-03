

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
        const contentWidth = boxW;
        const contentHeight = boxH + boxHem + boxD;
    
        const startX = 100;
        const startY = (1000 - contentHeight) / 2 + boxD;

        ctx.font = "18px sans-serif";
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
    
        for (let i = 0; i < 1; i++) {
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

        const text = `x ${quantity}`;

        
        ctx.font = 'bold 48px Arial'; // You can adjust size and font
        ctx.fillStyle = 'black'; // Or any color you want
        ctx.textAlign = 'right'; // Right align so the text ends at the x-position
        ctx.textBaseline = 'middle';

        ctx.fillText(text, 800, 800);
        
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

        if (data.flatMainHeight) {
            // If flatMainHeight already exists calculations are already done, return data as-is
            return data;
        }
        // ...all your calculation logic here...
        let flatMainHeight = data.width + 2 * data.seam;
        let flatMainWidth = 2 * data.hem + data.height * 2 + data.length;
        let flatSideWidth = data.height + data.seam * 2;
        let flatSideHeight = data.length + data.hem + data.seam;
        let totalSeamLength =
            2 * flatMainWidth +
            2 * flatSideWidth +
            4 * flatSideHeight;

        
        data.flatMainHeight = flatMainHeight;
        data.flatMainWidth = flatMainWidth;
        data.flatSideHeight = flatSideHeight;
        data.flatSideWidth = flatSideWidth;
        data.totalSeamLength = totalSeamLength;

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

        console.log('Drawing flat pattern with data:', data);

        // Scaling
        const padding = 100;
        const availableWidth = 1000 - 2 * padding;
        const availableHeight = 1000 - 2 * padding;
        const layoutWidth = Math.max(data.flatMainWidth, data.flatSideWidth * 2 + 50);
        const layoutHeight = data.flatMainHeight + data.flatSideHeight + 50;
        const scale = Math.min(availableWidth / layoutWidth, availableHeight / layoutHeight);

        const mainW = data.flatMainWidth * scale;
        const mainH = data.flatMainHeight * scale;
        const sideW = data.flatSideWidth * scale;
        const sideH = data.flatSideHeight * scale;

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
    
        ctx.fillText(`${data.flatMainWidth} mm`, mainX + mainW / 2 - 40, mainY - 10);
        ctx.save();
        ctx.translate(mainX - 10, mainY + mainH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${data.flatMainHeight} mm`, -40, 0);
        ctx.restore();
    
        ctx.fillText(`${data.flatSideWidth} mm`, side1X + sideW / 2 - 30, sideY - 10);
        ctx.save();
        ctx.translate(side1X - 10, sideY + sideH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${data.flatSideHeight} mm`, -35, 0);
        ctx.restore();
    
        ctx.save();
        ctx.translate(side2X - 10, sideY + sideH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${data.flatSideHeight} mm`, -35, 0);
        ctx.restore();

        const areaMainMM = data.flatMainWidth * data.flatMainHeight;
        const areaSideMM = data.flatSideWidth * data.flatSideHeight;
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

    seam = 0;
    let rotated = false;

    // Normalize orientation: shorter side = height
    if (width < height) {
        [width, height] = [height, width];
        rotated = true;
    }

    // Case 1: Fits without split
    if (height <= fabricWidth) {
        return [{
            width: rotated ? height : width,
            height: rotated ? width : height,
            hasSeam: "no"
        }];
    }

    // Preferred: small panel gets minAllowance + seam
    const smallPanelTotal = minAllowance + seam;
    const mainPanel = height - minAllowance;

    if (mainPanel <= fabricWidth) {
        return [
            {
                width: rotated ? height : width,
                height: rotated ? mainPanel : mainPanel,
                hasSeam: "main"
            },
            {
                width: rotated ? height : width,
                height: rotated ? smallPanelTotal : smallPanelTotal,
                hasSeam: "small"
            }
        ];
    }

    // Fallback: main panel = fabricWidth, small gets rest + seam
    const mainFallback = fabricWidth;
    const smallPanelBody = height - mainFallback;
    const smallFallbackTotal = smallPanelBody + seam;

    if (smallPanelBody >= minAllowance) {
        return [
            {
                width: rotated ? height : width,
                height: rotated ? mainFallback : mainFallback,
                hasSeam: "main"
            },
            {
                width: rotated ? height : width,
                height: rotated ? smallFallbackTotal : smallFallbackTotal,
                hasSeam: "small"
            }
        ];
    }

    // If neither strategy works
    throw new Error("Cannot split panel with given constraints.");
}





export const twoExtra = {
    title: 'Step 2: Create extra seams if wider than fabric',
    initialData: { },
    dependencies: [],
    isLive: false,
    isAsync: false,



    // ----------------------------------- CALC -------------------------------------------



    calcFunction: (data) => {
        // ---- HARDCODED PANELS ----
        // Each panel should have width and height in mm

        //bowenville
        const hardcodedPanels2 = [
            { label: "A", width: 90000, height: 2030 },
        ];

        //Speedwell
        const hardcodedPanels = [
            { label: "B", width: 27000, height: 1230 },

            { label: "C", width: 25600, height: 1430 },

            { label: "D", width: 202800, height: 1530 },

            { label: "E", width: 62000, height: 1730 },

            { label: "F", width: 92440, height: 1830 },
            
            { label: "G", width: 30000, height: 1930 },

            { label: "h", width: 90000, height: 2030 },

            { label: "i", width: 61600, height: 2130 },

            { label: "j", width: 1123000, height: 2230 },

            { label: "k", width: 128300, height: 2430 },

            { label: "l", width: 284000, height: 2630 },

            { label: "m", width: 367000, height: 2730 },

            { label: "n", width: 196000, height: 3230 }

        ];

        const hardcodedPanels3 = [




            { label: "G", width: 12000, height: 2230 },
            { label: "H", width: 12500, height: 2230 },

            { label: "i", width: 12000, height: 2230 },
            { label: "j", width: 12500, height: 2230 },

            { label: "k", width: 12000, height: 2230 },
            { label: "l", width: 12500, height: 2230 },

            { label: "m", width: 27500, height: 2230 },

            { label: "n", width: 12000, height: 2230 },
            { label: "o", width: 12500, height: 2230 },

            { label: "p", width: 12000, height: 2230 },
            { label: "q", width: 12500, height: 2230 },

            { label: "r", width: 12000, height: 2230 },
            { label: "s", width: 12500, height: 2230 },

            { label: "t", width: 12000, height: 2230 },
            { label: "u", width: 12500, height: 2230 },
        ];

        const hardcodedPanels4 = [
            { label: "A", width: 1000, height: 2000 },
            { label: "B", width: 3000, height: 1000 },
            { label: "C", width: 200, height: 500 },
            { label: "D", width: 1000, height: 3000 },
        ];

        // Optionally, set fabricWidth and seam if not present
        data.fabricWidth = 3000;
        //data.seam = data.seam || 20;

        // Split panels if needed
        const result = {};
        for (const panel of hardcodedPanels) {
            // Use your existing splitPanelIfNeeded logic
            const splits = splitPanelIfNeeded(panel.width, panel.height, data.fabricWidth, 200, data.seam);
            splits.forEach((split, i) => {
                result[`${panel.label}${i + 1}`] = split;
            });
        }

        // Build finalPanels as before
        let finalArea = 0;
        const finalPanels = {
            quantity: 1,
            panels: {}
        };
        for (const [key, panel] of Object.entries(result)) {
            const { hasSeam, ...panelWithoutSeam } = panel;
            finalPanels.panels[key] = panelWithoutSeam;
            finalArea += (panel.width * panel.height);
        }

        data.finalArea = finalArea;
        data.finalPanels = finalPanels;
        data.rawPanels = result;
        // Optionally log for debugging
        console.log('Hardcoded panels, after split:', finalPanels);
    },



    // ----------------------------------- DRAW -------------------------------------------



  drawFunction: (ctx, virtualWidth, virtualHeight, data) => {
      const padding = 100;

      // Calculate total width and max height of all panels
      let totalWidth = 0;
      let maxHeight = 0;
      for (const [, panel] of Object.entries(data.rawPanels)) {
          totalWidth += panel.width;
          maxHeight = Math.max(maxHeight, panel.height);
      }

      const availableWidth = virtualWidth - 2 * padding;
      const availableHeight = virtualHeight - 2 * padding;
      const scale = Math.min(
          availableWidth / totalWidth,
          availableHeight / maxHeight
      );

      let cursorX = (virtualWidth - totalWidth * scale) / 2;
      const originY = (virtualHeight - maxHeight * scale) / 2;

      const drawData = [];
      let totalArea = 0;

      for (const [name, panel] of Object.entries(data.rawPanels)) {
          const w = panel.width * scale;
          const h = panel.height * scale;
          const x = cursorX;
          const y = originY;

          const area = (panel.width * panel.height) / 1e6;
          totalArea += area;

          drawData.push({
              name,
              x,
              y,
              w,
              h,
              panel,
              area,
              seamY: panel.hasSeam === "top"
                  ? y + (data.seam || 0) * scale
                  : panel.hasSeam === "bottom"
                  ? y + h - (data.seam || 0) * scale
                  : null
          });

          cursorX += w + 50; // 50px gap between panels
      }

      ctx.save();
      ctx.lineWidth = 2;
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const item of drawData) {
          const { name, x, y, w, h, panel, area, seamY } = item;

          ctx.strokeStyle = "#000";
          ctx.setLineDash([]);
          ctx.strokeRect(x, y, w, h);

          if (seamY !== null) {
              ctx.strokeStyle = "#00f";
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(x, seamY);
              ctx.lineTo(x + w, seamY);
              ctx.stroke();
          }

          ctx.setLineDash([]);
          ctx.strokeStyle = "#000";

          ctx.fillText(name, x + w / 2, y + h / 2 - 18);
          ctx.fillText(`${area.toFixed(3)} m²`, x + w / 2, y + h / 2 + 2);
          ctx.fillText(`${panel.width} mm`, x + w / 2, y - 12);

          ctx.save();
          ctx.translate(x - 12, y + h / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(`${panel.height} mm`, 0, 0);
          ctx.restore();
      }

      ctx.restore();
  }

    // ----------------------------------- END DRAW --------------------------------------

};





//-----------------------------------------------------------------------------------------------------------

//                                STEP 3: NEST PANELS

//-----------------------------------------------------------------------------------------------------------


async function sendPanelData(panelData, fabricWidth) {

    fabricWidth = 2000; // Default to 2000 if not provided
  try {
    const response = await fetch('/copelands/nest_panels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...panelData,
        fabricWidth // 🔁 Include fabricWidth in the payload
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Received nest:', result);
    return result;

  } catch (error) {
    console.error('Error sending panel data:', error);
  }
}

function drawNest(ctx, nestData, panels, fabricHeight) {
  const startX = 100;

  const nestWidth = nestData.total_width;
  const fabricBoxWidthPx = 8000; // Always make the red box 800px wide
  const scale = (fabricBoxWidthPx / nestWidth) * 2; // Scale so fabric box is always 800px wide
  const centerY = 200 + (fabricHeight / 2) * scale;

  ctx.save();

  ctx.setLineDash([]);

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

  // 🖼 Draw fabric height box (always 2000px wide)
  const fabricBoxX = startX;
  const fabricBoxY = centerY - fabricHeight * scale;
  const fabricBoxWidth = fabricBoxWidthPx;
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

export const threeNest = {
  title: 'Step 3: Nesting',
  initialData: {},
  dependencies: [],
  isLive: false,
  isAsync: true,



  // --------------------------- CALC FUNCTION ---------------------------



  calcFunction: async (data) => {

    if (data.nestData) {
      console.warn('Nesting data already calculated, skipping nesting calculation.');
      return data;
    }

    if (!data || !data.finalPanels || !data.fabricWidth) {
      console.warn('Missing data for nesting calcFunction');
      return data;
    }

    const nestData = await sendPanelData(data.finalPanels, data.fabricWidth);

    if (!nestData) {
      console.error('No nest data returned from server');
      return;
    }


    data.nestData = nestData;
  },



  // --------------------------- DRAW FUNCTION ---------------------------



  drawFunction: (ctx, virtualWidth, virtualHeight, data) => {
    if (
      !data ||
      !data.finalPanels ||
      !data.nestData
    ) {
      ctx.fillText('Nesting data not available', 800, 800);
      return;
    }

    //const { nestData } = nestData;
    drawNest(ctx, data.nestData, data.finalPanels.panels, data.fabricWidth);
  }
};
