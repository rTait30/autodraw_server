import { apiFetch } from '../../../services/auth.js';

export const Steps = [
  {
    title: 'Step 0: Visualise Covers',
    calcFunction: (data) => {
      return {}; // No extra calc
    },
    drawFunction: (ctx, data) => {
      try {
        if (!ctx || !data) throw new Error("Missing ctx or data");

        const quantity = Math.max(1, Number(data.quantity) || 1);
        const width = Number(data.width) || 1;
        const height = Number(data.height) || 1;
        const length = Number(data.length) || 1;
        const hem = Number(data.hem) || 0;

        if ([width, height, length, quantity].some(isNaN)) {
          throw new Error(`Invalid numeric inputs: width=${width}, height=${height}, length=${length}, quantity=${quantity}`);
        }

        const padding = 100;
        const spacing = width / 4;
        const totalWidthUnits = width + length;
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

        const startX = 100;
        const startY = 500;
        const x = startX;
        const y = startY;

        // === Sanity check dimensions ===
        if ([boxW, boxH, boxD].some(v => v <= 0 || isNaN(v))) {
          throw new Error(`Invalid scaled dimensions: boxW=${boxW}, boxH=${boxH}, boxD=${boxD}`);
        }

        ctx.font = "18px sans-serif";
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        ctx.strokeRect(x, y, boxW, boxH);

        if (hem > 0) {
          ctx.fillStyle = '#ccc';
          ctx.fillRect(x, y + boxH, boxW, boxHem);
          ctx.strokeRect(x, y + boxH, boxW, boxHem);
          ctx.fillStyle = '#000';
          ctx.font = "14px sans-serif";
          ctx.fillText(`${hem} mm hem`, x + boxW / 2 - 30, y + boxH + boxHem / 2 + 5);
        }

        // Projection
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

        // Projected hem
        if (hem > 0) {
          ctx.beginPath();
          ctx.moveTo(x, y + boxH + boxHem);
          ctx.lineTo(x + boxD, y + boxH + boxHem - boxD);
          ctx.moveTo(x + boxW, y + boxH + boxHem);
          ctx.lineTo(x + boxW + boxD, y + boxH + boxHem - boxD);
          ctx.stroke();
        }

        // Dimensions
        ctx.fillStyle = '#000';
        ctx.font = "18px sans-serif";
        ctx.fillText(`${width} mm`, x + boxW / 2 - 30, y + boxH + boxHem + 20);

        ctx.save();
        ctx.translate(x - 20, y + boxH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${height} mm`, -30, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(x - 50, y + (boxH + boxHem) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${height + hem} mm total`, -40, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(x + boxW + boxD + 10, y - boxD - 10);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(`${length} mm`, 0, 0);
        ctx.restore();

        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`x ${quantity}`, 800, 800);
      } catch (err) {
        console.error(`[Covers Step 0] drawFunction error:`, err);
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = 'red';
          ctx.font = '18px sans-serif';
          ctx.fillText(`Covers draw error: ${err.message}`, 20, 40);
        }
      }
    }

  },

  {
    title: 'Step 1: Flatten Panels',
    calcFunction: (data) => {
      const flatMainHeight = data.width + 2 * data.seam;
      const flatMainWidth = 2 * data.hem + data.height * 2 + data.length;
      const flatSideWidth = data.height + data.seam;
      const flatSideHeight = data.length + data.seam * 2;
      const totalSeamLength =
        2 * flatMainWidth +
        2 * flatSideWidth +
        4 * flatSideHeight;

      const areaMainM2 = (flatMainWidth * flatMainHeight) / 1e6;
      const areaSideM2 = (flatSideWidth * flatSideHeight) / 1e6;
      const totalFabricArea = areaMainM2 + 2 * areaSideM2;

      return {
        flatMainHeight,
        flatMainWidth,
        flatSideWidth,
        flatSideHeight,
        totalSeamLength,
        areaMainM2,
        areaSideM2,
        totalFabricArea
      };
    },
    drawFunction: (ctx, data) => {
      if (!ctx || !data) return;

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
    }
  },

  {
    title: 'Step 2: Extra Panels (Seam Split)',
    calcFunction: (data) => {
      const mainPanels = splitPanelIfNeeded(
        data.flatMainWidth,
        data.flatMainHeight,
        data.fabricWidth,
        200,
        data.seam
      );
      const sidePanels = splitPanelIfNeeded(
        data.flatSideWidth,
        data.flatSideHeight,
        data.fabricWidth,
        200,
        data.seam
      );

      const rawPanels = {};
      mainPanels.forEach((panel, i) => rawPanels[`main${i + 1}`] = { ...panel });
      sidePanels.forEach((panel, i) => {
        rawPanels[`Rside${i + 1}`] = { ...panel };
        rawPanels[`Lside${i + 1}`] = { ...panel };
      });

      const finalPanels = {
        quantity: Number(data.quantity),
        panels: {}
      };

      for (const [key, panel] of Object.entries(rawPanels)) {
        const { hasSeam, rotated, ...cleanPanel } = panel;
        finalPanels.panels[String(key)] = cleanPanel;
      }

      return {
        rawPanels,
        finalPanels,
        finalArea: Object.values(rawPanels).reduce(
          (acc, p) => acc + (p.width * p.height),
          0
        )
      };
    },
    drawFunction: (ctx, data) => {
      if (!ctx || !data?.rawPanels) return;
      const padding = 100;

      let totalWidth = 0;
      let maxHeight = 0;
      for (const [, panel] of Object.entries(data.rawPanels)) {
        totalWidth += panel.width;
        maxHeight = Math.max(maxHeight, panel.height);
      }

      const availableWidth = 600;
      const availableHeight = 800 - 2 * padding;
      const scale = Math.min(
        availableWidth / totalWidth,
        availableHeight / maxHeight
      );

      let cursorX = 100;
      const originY = (800 - maxHeight * scale) / 2;

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

        cursorX += w + 50;
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
  },

  {
    title: 'Step 3: Nest Panels',
    isAsync: true,
    calcFunction: async (data) => {
      if (!data.finalPanels || !data.fabricWidth) return {};
      const payload = {
        ...data.finalPanels,
        quantity: data.quantity || 1,
      };
      const nestData = await sendPanelData(payload, data.fabricWidth);
      console.log(nestData)
      return { ...data, nestData };
    },
    drawFunction: (ctx, data) => {
      console.log(`nest draw ${JSON.stringify(data)}`)
      if (!ctx || !data?.nestData) {
        ctx.fillText('Nesting data not available', 800, 800);
        return;
      }
      drawNest(ctx, data.nestData, data.finalPanels.panels, data.fabricWidth);
    }
  }
];

// helpers/splitPanelIfNeeded.js — used in Step 2
function splitPanelIfNeeded(width, height, fabricWidth, minAllowance, seam) {
  console.log("==== SPLITTING PANEL ====");
  console.log(`Input: width=${width}, height=${height}, fabricWidth=${fabricWidth}, minAllowance=${minAllowance}, seam=${seam}`);

  let rotated = false;

  // Normalize orientation: shorter side = height
  if (width < height) {
    console.log(`Rotating panel to normalize. Original width=${width}, height=${height}`);
    [width, height] = [height, width];
    rotated = true;
    console.log(`After rotation: width=${width}, height=${height}`);
  } else {
    console.log("No rotation needed.");
  }

  // Case 1: Fits without split
  if (height <= fabricWidth) {
    console.log(`Panel fits within fabric width (${fabricWidth}) without split.`);
    const panel = {
      width,
      height,
      hasSeam: "no",
      rotated,
    };
    console.log("Returning panel:", panel);
    return [panel];
  }

  // Preferred: small panel gets minAllowance + seam
  const smallPanelTotal = minAllowance + seam;
  const mainPanel = height - minAllowance;

  console.log(`Trying preferred split. mainPanel=${mainPanel}, smallPanelTotal=${smallPanelTotal}`);

  if (mainPanel <= fabricWidth) {
    console.log("Preferred split works.");
    const panels = [
      {
        width: rotated ? height : width,
        height: rotated ? mainPanel : mainPanel,
        hasSeam: "bottom",
        rotated,
      },
      {
        width: rotated ? height : width,
        height: rotated ? smallPanelTotal : smallPanelTotal,
        hasSeam: "top",
        rotated,
      },
    ];
    console.log("Returning panels:", panels);
    return panels;
  }

  // Fallback: main panel = fabricWidth, small gets rest + seam
  const mainFallback = fabricWidth;
  const smallPanelBody = height - mainFallback;
  const smallFallbackTotal = smallPanelBody + seam;

  console.log(`Trying fallback split. mainFallback=${mainFallback}, smallPanelBody=${smallPanelBody}, smallFallbackTotal=${smallFallbackTotal}`);

  if (smallPanelBody >= minAllowance) {
    console.log("Fallback split works.");
    const panels = [
      {
        width: rotated ? height : width,
        height: rotated ? mainFallback : mainFallback,
        hasSeam: "top",
        rotated,
      },
      {
        width: rotated ? height : width,
        height: rotated ? smallFallbackTotal : smallFallbackTotal,
        hasSeam: "bottom",
        rotated,
      },
    ];
    console.log("Returning panels:", panels);
    return panels;
  }

  console.error("Cannot split panel with given constraints.");
  throw new Error("Cannot split panel with given constraints.");
}

// sendPanelData() — used in Step 3
async function sendPanelData(panelData, fabricWidth) {
  try {
    

    const response = await apiFetch('/nest_panels', {
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

// drawNest() — used in Step 3
function drawNest(ctx, nestData, panels, fabricHeight) {
  const startX = 100;

  const nestWidth = nestData.total_width;
  const fabricBoxWidthPx = 800; // Always make the red box 800px wide
  const scale = fabricBoxWidthPx / nestWidth; // Scale so fabric box is always 800px wide
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
