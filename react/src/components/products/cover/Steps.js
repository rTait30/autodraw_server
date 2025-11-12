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

          const scale = 0.5 * Math.min(
            maxDrawWidth / totalWidthUnits,
            maxDrawHeight / totalHeightUnits
          );

          const boxW = width * scale;
          const boxH = height * scale;
          const boxD = length * scale;
          const boxHem = hem * scale;
          const unitSpacing = spacing * scale;

          const startX = 100 + 500 * data.products.indexOf(product);
          const startY = 500; // Stack products vertically
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
          ctx.fillText(`x ${quantity}`, 400 + 500 * data.products.indexOf(product), 800);
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
  },
  {
    title: 'Step 1: Flatten Panels',
    calcFunction: (data) => {
      // No extra calc

      for (const cover of data.products) {
        let attributes = cover.attributes || {};
        
        attributes.flatMainHeight = attributes.width + 2 * attributes.seam;
        attributes.flatMainWidth = 2 * attributes.hem + attributes.height * 2 + attributes.length;
        attributes.flatSideWidth = attributes.height + attributes.seam;
        attributes.flatSideHeight = attributes.length + attributes.seam * 2;
        attributes.totalSeamLength =
          2 * attributes.flatMainWidth +
          2 * attributes.flatSideWidth +
          4 * attributes.flatSideHeight;

        attributes.areaMainM2 = (attributes.flatMainWidth * attributes.flatMainHeight) / 1e6;
        attributes.areaSideM2 = (attributes.flatSideWidth * attributes.flatSideHeight) / 1e6;
        attributes.totalFabricArea = attributes.areaMainM2 + 2 * attributes.areaSideM2;
        }

      return data;
    },
    drawFunction: (ctx, data) => {
      // Simple text indication
      let index = 0;
      for (const cover of data.products) {
        let attributes = cover.attributes || {};
        drawCoverLayout(ctx, attributes, index);
        index += 1;
      }
    }
  },
  {
    title: 'Step 2: Nest Panels',
    calcFunction: async (data) => {
      // Aggregate all rectangles for ALL products into one nest
      const allRectangles = [];
      const metaMap = {}; // label -> {width,height,base,productIndex}
      for (let i = 0; i < data.products.length; i++) {
        const cover = data.products[i];
        if (!cover) continue;
        const a = cover.attributes || {};
        const seam = Number(a.seam) || 0;
        const fabricWidth = Number(a.fabricWidth) || 1500;
        const minAllowance = 200;
        const quantity = Math.max(1, Number(a.quantity) || 1); // how many copies of this cover
        const panels = [
          { id: 'MAIN', w: Number(a.flatMainWidth) || 0, h: Number(a.flatMainHeight) || 0 },
          { id: 'SIDE_L', w: Number(a.flatSideWidth) || 0, h: Number(a.flatSideHeight) || 0 },
          { id: 'SIDE_R', w: Number(a.flatSideWidth) || 0, h: Number(a.flatSideHeight) || 0 },
        ];
        for (const p of panels) {
          if (!(p.w > 0 && p.h > 0)) continue;
          if (p.h > fabricWidth) {
            const parts = splitPanelIfNeeded(p.w, p.h, fabricWidth, minAllowance, seam, 1);
            parts.forEach(part => {
              const suffix = part.hasSeam === 'top' ? 'TOP' : (part.hasSeam === 'bottom' ? 'BOTTOM' : 'PART');
              for (let q = 1; q <= quantity; q++) {
                const label = `P${i + 1}_${p.id}_${suffix}_Q${q}`;
                allRectangles.push({ width: part.width, height: part.height, label, quantity: 1 });
                metaMap[label] = { width: part.width, height: part.height, base: p.id, productIndex: i };
              }
            });
          } else {
            for (let q = 1; q <= quantity; q++) {
              const label = `P${i + 1}_${p.id}_Q${q}`;
              allRectangles.push({ width: p.w, height: p.h, label, quantity: 1 });
              metaMap[label] = { width: p.w, height: p.h, base: p.id, productIndex: i };
            }
          }
        }
      }
      if (allRectangles.length === 0) return data;
      const maxFabricWidth = Math.max(...data.products.map(p => Number(p.attributes?.fabricWidth) || 1500));
      try {
        const response = await apiFetch('/nest_rectangles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rectangles: allRectangles, fabricHeight: maxFabricWidth, allowRotation: true })
        });
        if (!response.ok) {
          const err = await response.json().catch(()=>({}));
          throw new Error(err.error || 'Nesting failed');
        }
        const nest = await response.json();
        // distribute back
        for (const [label, placement] of Object.entries(nest.panels || {})) {
          const mm = metaMap[label];
          if (!mm) continue;
          const prod = data.products[mm.productIndex];
          if (!prod) continue;
          const attr = prod.attributes || (prod.attributes = {});
          if (!attr.panels) attr.panels = {};
            attr.panels[label] = { width: mm.width, height: mm.height, base: mm.base, x: placement.x, y: placement.y, rotated: !!placement.rotated };
        }
        // Store for whole project (project-level result)
        if (!data.project_attributes) data.project_attributes = {};
        data.project_attributes.nest = nest;
        data.project_attributes.nested_panels = metaMap; // raw meta if needed later
      } catch (e) {
        console.error('[Covers Step 2] nest error', e);
        if (!data.project_attributes) data.project_attributes = {};
        data.project_attributes.nestError = String(e?.message || e);
      }
      return data;
    },
    drawFunction: (ctx, data) => {

            if (!ctx) return;
      const nest = data.project_attributes?.nest;
      if (!nest || !nest.required_width || !nest.bin_height) return;
      // don't clear previous drawings
      const padding = 60;
      //const offsetY = 2000; // push below previous steps
      const offsetY = 0;
      const canvasW = ctx.canvas.width;
      const canvasH = ctx.canvas.height;
      const availableW = canvasW - 2 * padding;
      const availableH = canvasH - offsetY - padding - 40;
      const scale = Math.min(availableW / nest.required_width, availableH / nest.bin_height);
      const binX = padding;
      const binY = offsetY;
      const binW = Math.round(nest.required_width * scale);
      const binH = Math.round(nest.bin_height * scale);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(binX, binY, binW, binH);
      // Fixed-size dimension annotation directly beneath fabric box (independent of scale)
      const dimY = binY + binH + 20; // vertical position for dimension line
      const tickSize = 10; // fixed pixel size for ticks
      ctx.save();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      // Horizontal dimension line
      ctx.beginPath();
      ctx.moveTo(binX, dimY);
      ctx.lineTo(binX + binW, dimY);
      ctx.stroke();
      // End ticks
      ctx.beginPath();
      ctx.moveTo(binX, dimY - tickSize);
      ctx.lineTo(binX, dimY + tickSize);
      ctx.moveTo(binX + binW, dimY - tickSize);
      ctx.lineTo(binX + binW, dimY + tickSize);
      ctx.stroke();
      // Label (centered, constant font size)
      ctx.fillStyle = '#000';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${nest.required_width} mm`, binX + binW / 2, dimY + 6);
      ctx.restore();
      ctx.save();
      ctx.translate(binX - 30, binY + binH / 2);
      ctx.rotate(-Math.PI/2);
      ctx.textAlign = 'center';
      
      ctx.font = '20px sans-serif';
      ctx.fillText(`Fabric Width: ${nest.bin_height}mm`, 0, 0);
      ctx.restore();
      const colors = { MAIN:'#FF6B6B', SIDE_L:'#4ECDC4', SIDE_R:'#45B7D1', DEFAULT:'#98D8C8' };
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      for (const [label, placement] of Object.entries(nest.panels||{})) {
        let meta=null;
        for (const prod of data.products) {
          const attr=prod.attributes||{};
          if (attr.panels && attr.panels[label]) { meta=attr.panels[label]; break; }
        }
        if(!meta) continue;
        const color = colors[meta.base] || colors.DEFAULT;
        const w = Math.round((placement.rotated? meta.height: meta.width)*scale);
        const h = Math.round((placement.rotated? meta.width: meta.height)*scale);
        const x = Math.round(binX + placement.x*scale);
        const y = Math.round(binY + placement.y*scale);
        ctx.globalAlpha=0.65; ctx.fillStyle=color; ctx.fillRect(x,y,w,h);
        ctx.globalAlpha=1; ctx.strokeStyle='#000'; ctx.lineWidth=1; ctx.strokeRect(x,y,w,h);
        ctx.fillStyle='#000'; ctx.font='12px sans-serif'; ctx.fillText(label, x+w/2, y+h/2-6);
        ctx.font='10px sans-serif'; ctx.fillText(`${meta.width}×${meta.height}${placement.rotated?' ↻':''}`, x+w/2, y+h/2+8);
      }
      
    },
    drawTop: true
  },
];





function drawCoverLayout(ctx, data, index) {
  if (!ctx || !data) return;

  // ---- scaling + layout ----
  const canvasSize = 800;
  const padding = 100;
  const gap = 50;

  const availableWidth = canvasSize - 2 * padding;
  const availableHeight = canvasSize - 2 * padding;

  const layoutWidth = Math.max(data.flatMainWidth, data.flatSideWidth * 2 + gap);
  const layoutHeight = data.flatMainHeight + data.flatSideHeight + gap;

  const scale = Math.min(availableWidth / layoutWidth, availableHeight / layoutHeight) / 2;

  const mainW = data.flatMainWidth * scale;
  const mainH = data.flatMainHeight * scale;
  const sideW = data.flatSideWidth * scale;
  const sideH = data.flatSideHeight * scale;

  const originX = 100 + index * (canvasSize / 2);
  const originY = (canvasSize - layoutHeight * scale) / 2; // Stack vertically per cover

  const mainX = originX + (layoutWidth * scale - mainW) / 2;
  const mainY = originY;

  const sideY = mainY + mainH + gap;
  const side1X = originX;
  const side2X = originX + sideW + gap;

  const seamOffset = data.seam * scale;
  const seamXOffset = seamOffset; // same value
  const hemOffset = data.hem * scale;

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;

  // ---- main panel ----
  ctx.strokeRect(mainX, mainY, mainW, mainH);

  // vertical hems (dotted)
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.moveTo(mainX + hemOffset, mainY);
  ctx.lineTo(mainX + hemOffset, mainY + mainH);
  ctx.moveTo(mainX + mainW - hemOffset, mainY);
  ctx.lineTo(mainX + mainW - hemOffset, mainY + mainH);
  ctx.stroke();

  // vertical side lines (height/length) dashed
  ctx.setLineDash([8, 6]);
  const seamLeft = hemOffset + data.height * scale;
  const seamRight = hemOffset + (data.height + data.length) * scale;
  ctx.beginPath();
  ctx.moveTo(mainX + seamLeft, mainY);
  ctx.lineTo(mainX + seamLeft, mainY + mainH);
  ctx.moveTo(mainX + seamRight, mainY);
  ctx.lineTo(mainX + seamRight, mainY + mainH);
  ctx.stroke();
  ctx.setLineDash([]);

  // ---- side panels (both) ----
  const sides = [
    { x: side1X, y: sideY },
    { x: side2X, y: sideY },
  ];

  sides.forEach(({ x, y }) => {
    ctx.strokeRect(x, y, sideW, sideH);
  });

  // dotted seam grid (blue)
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = "#00f";

  ctx.beginPath();

  // main: horizontal seams
  ctx.moveTo(mainX, mainY + seamOffset);
  ctx.lineTo(mainX + mainW, mainY + seamOffset);
  ctx.moveTo(mainX, mainY + mainH - seamOffset);
  ctx.lineTo(mainX + mainW, mainY + mainH - seamOffset);

  // side panels: horizontal + vertical seams
  sides.forEach(({ x, y }) => {
    // horizontal
    ctx.moveTo(x, y + seamOffset);
    ctx.lineTo(x + sideW, y + seamOffset);
    // verticals
    ctx.moveTo(x + seamXOffset, y);
    ctx.lineTo(x + seamXOffset, y + sideH);
    ctx.moveTo(x + sideW - seamXOffset, y);
    ctx.lineTo(x + sideW - seamXOffset, y + sideH);
  });

  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#000";

  // side panel bottom hems (dotted)
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  sides.forEach(({ x, y }) => {
    ctx.moveTo(x, y + sideH - hemOffset);
    ctx.lineTo(x + sideW, y + sideH - hemOffset);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // ---- labels ----
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#000";

  // main dims
  ctx.fillText(`${data.flatMainWidth} mm`, mainX + mainW / 2 - 40, mainY - 10);

  ctx.save();
  ctx.translate(mainX - 10, mainY + mainH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${data.flatMainHeight} mm`, -40, 0);
  ctx.restore();

  // side dims (same width/height both sides)
  sides.forEach(({ x, y }) => {
    ctx.fillText(`${data.flatSideWidth} mm`, x + sideW / 2 - 30, y - 10);

    ctx.save();
    ctx.translate(x - 10, y + sideH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${data.flatSideHeight} mm`, -35, 0);
    ctx.restore();
  });

  // ---- areas ----
  const areaMainM2 = (data.flatMainWidth * data.flatMainHeight) / 1e6;
  const areaSideM2 = (data.flatSideWidth * data.flatSideHeight) / 1e6;
  const totalFabricArea = areaMainM2 + 2 * areaSideM2;

  /*
  ctx.fillText(
    `Main Area: ${areaMainM2.toFixed(3)} m²`,
    mainX + mainW / 2 - 80,
    mainY + mainH / 2
  );

  sides.forEach(({ x, y }) => {
    ctx.fillText(
      `Side Area: ${areaSideM2.toFixed(3)} m²`,
      x + sideW / 2 - 80,
      y + sideH / 2
    );
  });
  */
  //#ctx.fillText(`totalFabricArea: ${totalFabricArea} m²`, 800, 900);
}

// helpers/splitPanelIfNeeded.js — used in Step 2
export function drawRawPanelsLayout(ctx, data, index = 0) {
  if (!ctx || !data?.rawPanels) return 0;

  const padding = 100;
  const availableWidth = 600;
  const canvasHeight = 800;
  const gapX = 50;

  const panelsArray = Object.values(data.rawPanels);
  if (panelsArray.length === 0) return 0;

  // Compute total width & max height (unscaled)
  let totalWidth = 0;
  let maxHeight = 0;
  for (const panel of panelsArray) {
    totalWidth += panel.width;
    if (panel.height > maxHeight) maxHeight = panel.height;
  }

  const availableHeight = canvasHeight - 2 * padding;
  const scale = Math.min(
    availableWidth / totalWidth,
    availableHeight / maxHeight
  );

  let cursorX = 100;
  const originY = index * 1000 + (canvasHeight - maxHeight * scale) / 2;
  const seam = data.seam || 0;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let totalArea = 0;

  for (const [name, panel] of Object.entries(data.rawPanels)) {
    const w = panel.width * scale;
    const h = panel.height * scale;
    const x = cursorX;
    const y = originY;

    const area = (panel.width * panel.height) / 1e6;
    totalArea += area;

    // Outer rect
    ctx.strokeStyle = "#000";
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, w, h);

    // Seam line (if any)
    if (panel.hasSeam === "top" || panel.hasSeam === "bottom") {
      const seamY =
        panel.hasSeam === "top"
          ? y + seam * scale
          : y + h - seam * scale;

      ctx.strokeStyle = "#00f";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, seamY);
      ctx.lineTo(x + w, seamY);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.strokeStyle = "#000";
    }

    // Labels
    ctx.fillText(name, x + w / 2, y + h / 2 - 18);
    ctx.fillText(`${area.toFixed(3)} m²`, x + w / 2, y + h / 2 + 2);
    ctx.fillText(`${panel.width} mm`, x + w / 2, y - 12);

    ctx.save();
    ctx.translate(x - 12, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${panel.height} mm`, 0, 0);
    ctx.restore();

    cursorX += w + gapX;
  }

  ctx.restore();
  return totalArea;
}


function splitPanelIfNeeded(width, height, fabricWidth, minAllowance, seam, quantity = 1) {
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
      quantity,
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
