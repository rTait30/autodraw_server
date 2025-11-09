import { apiFetch } from '../../../services/auth.js';

export const Steps = [
  {
    title: 'Step 0: Visualise Covers',
    calcFunction: (data) => {

      let totalCovers = 0;
      for (const product of data.products) {
        try {
          if (!product) throw new Error("Missing product");
          const attributes = product.attributes || {};

          attributes.volume =
            (Number(attributes.length) || 0) *
            (Number(attributes.width) || 0) *
            (Number(attributes.height) || 0);

          totalCovers += attributes.quantity || 0;
        } catch (err) {
          console.error(`[Covers Step 0] calcFunction error:`, err);
        }
      }

      return {
        ...data,
        totalCovers
      }; // No extra calc
    },
    drawFunction: (ctx, data) => {

      for (const product of data.products) {
        try {
          if (!ctx || !product) throw new Error("Missing ctx or product");

          let attributes = product.attributes || {};

          const quantity = Math.max(1, Number(attributes.quantity) || 1);
          const width = Number(attributes.width) || 1;
          const height = Number(attributes.height) || 1;
          const length = Number(attributes.length) || 1;
          const hem = Number(attributes.hem) || 0;

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
          const startY = 500 + 1000 * data.products.indexOf(product); // Stack products vertically
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
          ctx.fillText(`x ${quantity}`, 800, 800 + 1000 * data.products.indexOf(product));
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
  const smallFallbackTotal = smallPanelBody + 25;

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
