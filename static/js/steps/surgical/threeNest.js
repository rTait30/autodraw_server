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
  const centerY = 600;

  const nestWidth = nestData.total_width;
  const scale = 1000 / nestWidth; // Scale X to fit 1000px
  //const scale = 1; // No scaling on Y, since fabric height is already fixed

  ctx.save();

  // 🔴 Red test square (unscaled)
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 300, 1000, 400);

  // ⚫ Horizontal baseline
  ctx.strokeStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(startX, centerY);
  ctx.lineTo(startX + 1000, centerY);
  ctx.stroke();

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
  
    const panelData = {
      label,
      panelKey,
      originalWidth: width,
      originalHeight: height,
      rotated,
      scaledX,
      scaledY,
      scaledW,
      scaledH,
      rawPlacement: placement
    };
  
    console.log('🧩 Panel Data:', panelData);
  
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
}

const threeNest = {
  title: 'Step 3: Nesting',
  initialData: {},
  dependencies: [],
  isLive: false,

  drawFunction: async (ctx, virtualWidth, virtualHeight, data) => {
    // Only run if data exists and has the expected shape
    if (data && Object.keys(data).length > 0 && data.finalPanels && data.fabricWidth) {
      // Request nest data from server
      const nestData = await sendPanelData(data.finalPanels, data.fabricWidth);



      // Draw the nest panels
      drawNest(ctx, nestData, data.finalPanels.panels, data.fabricWidth);


        // Draw key/value info to the right
        let yOffset = 100;
        ctx.font = '15px Arial';
  
        function drawKeyValue(ctx, key, value, x, y, indentLevel = 0) {
          const indent = '    '.repeat(indentLevel); // 4 spaces
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            ctx.fillText(`${indent}${key}:`, x, y);
            y += 15;
            for (const [subKey, subValue] of Object.entries(value)) {
              y = drawKeyValue(ctx, subKey, subValue, x, y, indentLevel + 1);
            }
            return y;
          } else {
            ctx.fillText(`${indent}${key}: ${value}`, x, y);
            return y + 15;
          }
        }
  
        Object.entries(nestData).forEach(([key, value]) => {
          yOffset = drawKeyValue(ctx, key, value, 500, yOffset, 0);
        });

        ctx.fillText(`Total Length: ${nestData.total_width.toFixed(3)} mm`, 800, 800);
    }
  }
};

export default threeNest;