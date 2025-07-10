

export const steps = [
  {
    title: 'Step 0: Visualise Covers',
    calcFunction: (data) => {
      return {}; // No extra calc
    },
    drawFunction: (ctx, data) => {
      if (!ctx || !data) return;

      const quantity = Math.max(1, data.quantity || 1);
      const width = data.width || 1;
      const height = data.height || 1;
      const length = data.length || 1;
      const hem = data.hem || 0;

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

      const contentHeight = boxH + boxHem + boxD;
      const startX = 100;
      const startY = yOffset + (1000 - contentHeight) / 2 + boxD;

      ctx.font = "18px sans-serif";
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;

      const x = startX;
      const y = startY;

      // Front face
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

      // Projected hem (if any)
      if (hem > 0) {
        ctx.beginPath();
        ctx.moveTo(x, y + boxH + boxHem);
        ctx.lineTo(x + boxD, y + boxH + boxHem - boxD);
        ctx.moveTo(x + boxW, y + boxH + boxHem);
        ctx.lineTo(x + boxW + boxD, y + boxH + boxHem - boxD);
        ctx.stroke();
      }

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
      ctx.fillText(`x ${quantity}`, 800, 800 + yOffset);
    }
  },

  {
    title: 'Step 1: Flatten Panels',
    calcFunction: (data) => {
      const flatMainHeight = data.width + 2 * data.seam;
      const flatMainWidth = 2 * data.hem + data.height * 2 + data.length;
      const flatSideWidth = data.width + data.seam * 2;
      const flatSideHeight = data.height + data.hem + data.seam;
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
      // Paste your existing draw code for Step 1 here,
      // add `+ yOffset` to `startY` or `originY` equivalents
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
      // Paste your existing Step 2 drawFunction here
    }
  },

  {
    title: 'Step 3: Nest Panels',
    calcFunction: async (data) => {
      if (!data.finalPanels || !data.fabricWidth) return {};
      const payload = {
        ...data.finalPanels,
        quantity: data.quantity || 1,
      };
      const nestData = await sendPanelData(payload, data.fabricWidth);
      return nestData ? { nestData } : {};
    },
    drawFunction: (ctx, data) => {
      if (!ctx || !data?.nestData) {
        ctx.fillText('Nesting data not available', 800, 800 + yOffset);
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
        hasSeam: "main",
        rotated,
      },
      {
        width: rotated ? height : width,
        height: rotated ? smallPanelTotal : smallPanelTotal,
        hasSeam: "small",
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
        hasSeam: "main",
        rotated,
      },
      {
        width: rotated ? height : width,
        height: rotated ? smallFallbackTotal : smallFallbackTotal,
        hasSeam: "small",
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
