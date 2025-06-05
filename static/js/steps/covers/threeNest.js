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

function drawNest(ctx, nestData, panels, fabricHeight) {
  const startX = 0;

  const nestWidth = nestData.total_width;
  const scale = Math.min(2000 / nestWidth, 0.1); // Scale X to fit 1000px
  const centerY = 200 + (fabricHeight / 2) * scale;

  ctx.save();

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

  // 🖼 Draw fabric height box
  const fabricBoxX = startX;
  const fabricBoxY = centerY - fabricHeight * scale;
  const fabricBoxWidth = nestWidth * scale;
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

const threeNest = {
  title: 'Step 3: Nesting',
  initialData: {},
  dependencies: [],
  isLive: false,
  isAsync: true,

  drawFunction: async (ctx, virtualWidth, virtualHeight, data) => {
    // Only run if data exists and has the expected shape
    if (data && Object.keys(data).length > 0 && data.finalPanels && data.fabricWidth) {
      // Request nest data from server
      const nestData = await sendPanelData(data.finalPanels, data.fabricWidth);

      if (!nestData) {
        console.error('No nest data received');
        ctx.fillText(`problem nesting`, 800, 800);
        return;
      }

      else
      {
      // Draw the nest panels
        drawNest(ctx, nestData, data.finalPanels.panels, data.fabricWidth);

      }

      data.nestWidth = nestData.total_width;

        //ctx.fillText(`Total Length: ${nestData.total_width.toFixed(3)} mm`, 800, 800);
    }
  }
};

export default threeNest;