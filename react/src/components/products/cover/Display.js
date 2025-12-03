/**
 * COVER Display - Minimal canvas rendering for server-enriched project data (Responsive).
 * Draws three visualization steps: 3D preview, flattened panels, and nesting layout.
 */

export function render(canvas, data) {
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear & init drawing state
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  canvas.height = 2000; // temporary large height to allow drawing

  const products = data.products || [];
  const projectAttrs = data.project_attributes || {};

  // Global vertical layout state that steps can update
  const layout = { yPos: 0 };

  // Draw everything
  drawCover3DPreviews(ctx, products, layout);
  drawFlattenedPanels(ctx, products, layout);
  drawSplitPanels(ctx, products, layout);
  drawNestLayout(ctx, products, projectAttrs, layout);

  // Resize canvas to fit content
  //canvas.height = Math.ceil(layout.yPos + 40);
}

function drawCover3DPreviews(ctx, products, layout) {
  const offsetY = layout.yPos;
  let maxBottomY = offsetY;
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const attrs = product.attributes || {};
    
    const quantity = Math.max(1, Number(attrs.quantity) || 1);
    const width = Number(attrs.width) || 1;
    const height = Number(attrs.height) || 1;
    const length = Number(attrs.length) || 1;
    const hem = Number(attrs.hem) || 0;

    const hasDiscrepancy = attrs.discrepancyProblem === true;
    const strokeColor = hasDiscrepancy ? '#dc2626' : '#000';

    const padding = 50;
    // Fit 3D box into a max area per product
    const maxW = 400; // pixels
    const maxH = 300; // pixels
    const scale = Math.min(
      maxW / Math.max(1, width + length),
      maxH / Math.max(1, height + hem + length)
    ) * 0.6;

    const boxW = Math.round(width * scale);
    const boxH = Math.round(height * scale);
    const boxD = Math.round(length * scale);
    const boxHem = Math.round(hem * scale);

    const startX = Math.round(50 + i * (maxW + 50));
    const startY = Math.round(offsetY + 160);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;

    // Front face
    ctx.strokeRect(startX, startY, boxW, boxH);

    // Hem
    if (hem > 0) {
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(startX, startY + boxH, boxW, boxHem);
      ctx.strokeRect(startX, startY + boxH, boxW, boxHem);
    }

    // Projection lines
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + boxD, startY - boxD);
    ctx.moveTo(startX + boxW, startY);
    ctx.lineTo(startX + boxW + boxD, startY - boxD);
    ctx.moveTo(startX + boxW, startY + boxH);
    ctx.lineTo(startX + boxW + boxD, startY + boxH - boxD);
    ctx.moveTo(startX, startY + boxH);
    ctx.lineTo(startX + boxD, startY + boxH - boxD);
    ctx.stroke();

    // Back face
    ctx.strokeRect(startX + boxD, startY - boxD, boxW, boxH);

    // Labels
    ctx.fillStyle = '#000';
    ctx.font = `12px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${length}mm × ${width}mm × ${height}mm`, startX + boxW / 2, startY + boxH + boxHem + 20);
    ctx.font = `bold 20px sans-serif`;
    ctx.fillText(`× ${quantity}`, startX + boxW / 2, startY + boxH + boxHem + 40);
    const bottom = startY + boxH + boxHem + 50;
    if (bottom > maxBottomY) maxBottomY = bottom;
  }
  layout.yPos = Math.ceil(maxBottomY + 40);
}

function drawFlattenedPanels(ctx, products, layout) {
  const offsetY = layout.yPos;
  let maxBottomY = offsetY;
  for (let i = 0; i < products.length; i++) {
    const attrs = products[i].attributes || {};
    const flatMainWidth = attrs.flatMainWidth || 0;
    const flatMainHeight = attrs.flatMainHeight || 0;
    const flatSideWidth = attrs.flatSideWidth || 0;
    const flatSideHeight = attrs.flatSideHeight || 0;
    const seam = attrs.seam || 0;
    const hem = attrs.hem || 0;

    if (!flatMainWidth || !flatMainHeight) continue;

    const gap = 30;
    // Fit overall flattened layout into bounds
    const layoutW = Math.max(flatMainWidth, flatSideWidth * 2 + gap);
    const layoutH = flatMainHeight + gap + flatSideHeight;
    const maxW = 380;
    const maxH = 260;
    const scale = Math.min(maxW / Math.max(1, layoutW), maxH / Math.max(1, layoutH));

    const mainW = Math.round(flatMainWidth * scale);
    const mainH = Math.round(flatMainHeight * scale);
    const sideW = Math.round(flatSideWidth * scale);
    const sideH = Math.round(flatSideHeight * scale);

    const originX = Math.round(50 + i * (maxW + 70));
    const originY = Math.round(offsetY + 40);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;

    // Main panel
    ctx.strokeRect(originX, originY, mainW, mainH);

    // Hems (dotted)
    if (hem > 0) {
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = '#6b7280';
      const hemOffset = Math.round(hem * scale);
      ctx.beginPath();
      ctx.moveTo(originX + hemOffset, originY);
      ctx.lineTo(originX + hemOffset, originY + mainH);
      ctx.moveTo(originX + mainW - hemOffset, originY);
      ctx.lineTo(originX + mainW - hemOffset, originY + mainH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#000';
    }

    // Side panels
    const sideY = Math.round(originY + mainH + gap);
    ctx.strokeRect(originX, sideY, sideW, sideH);
    ctx.strokeRect(originX + sideW + gap, sideY, sideW, sideH);

    // Labels
    ctx.fillStyle = '#000';
    ctx.font = `10px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Main: ${flatMainWidth}×${flatMainHeight}mm`, originX + mainW / 2, originY - 5);
    ctx.fillText(`Side: ${flatSideWidth}×${flatSideHeight}mm`, originX + sideW / 2, sideY - 5);
    const bottom = sideY + sideH + 20;
    if (bottom > maxBottomY) maxBottomY = bottom;
  }
  layout.yPos = Math.ceil(maxBottomY + 40);
}

function drawSplitPanels(ctx, products, layout) {
  const offsetY = layout.yPos;
  // Draw per product in rows with grouped identical panels annotated as x{count}
  const rowHeight = 140;
  const spacing = 20;

  const colors = { MAIN: '#fecaca', SIDE_L: '#bfdbfe', SIDE_R: '#a7f3d0', DEFAULT: '#e5e7eb' };

  for (let i = 0; i < products.length; i++) {
    const attrs = products[i].attributes || {};
    const panels = attrs.panels || {};
    const entries = Object.entries(panels);
    if (!entries.length) continue;

    // Group identical panels by signature
    const groups = new Map();
    for (const [label, meta] of entries) {
      const w = Math.round(meta.width || 0);
      const h = Math.round(meta.height || 0);
      const base = meta.base || 'DEFAULT';
      const seam = meta.hasSeam || 'no';
      const key = `${w}|${h}|${base}|${seam}`;
      if (!groups.has(key)) {
        groups.set(key, { sample: { label, ...meta }, count: 0 });
      }
      groups.get(key).count += 1;
    }

    // Determine per-product scale
    let maxW = 0, maxH = 0;
    for (const { sample } of groups.values()) {
      maxW = Math.max(maxW, sample.width || 0);
      maxH = Math.max(maxH, sample.height || 0);
    }
    let xOffset = 50;
    // Optional: product header
    ctx.fillStyle = '#111827';
    ctx.font = `12px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`Size ${i + 1} (${attrs.length} x ${attrs.width} x ${attrs.height})`, xOffset, Math.round(offsetY + i * rowHeight - 4));

    // Draw each group once with count
    // Fit all samples roughly within a per-panel max size
    const maxPanelW = 200;
    const maxPanelH = 120;
    const panelScale = Math.min(
      maxPanelW / Math.max(1, maxW),
      maxPanelH / Math.max(1, maxH)
    );

    for (const { sample, count } of groups.values()) {
      const w = Math.round((sample.width || 0) * panelScale);
      const h = Math.round((sample.height || 0) * panelScale);
      const x = Math.round(xOffset);
      const y = Math.round(offsetY + i * rowHeight + 50 - h / 2);

      ctx.fillStyle = colors[sample.base] || colors.DEFAULT;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w, h); // snap for crisp edges

      if (sample.hasSeam && sample.hasSeam !== 'no') {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        if (sample.hasSeam === 'top') {
          ctx.beginPath();
          ctx.moveTo(x + 0.5, y + 0.5);
          ctx.lineTo(x + w + 0.5, y + 0.5);
          ctx.stroke();
        } else if (sample.hasSeam === 'bottom') {
          ctx.beginPath();
          ctx.moveTo(x + 0.5, y + h + 0.5);
          ctx.lineTo(x + w + 0.5, y + h + 0.5);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = '#000';
      }

      // Label (dimensions) under panel
      ctx.fillStyle = '#000';
      ctx.font = `10px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${Math.round(sample.width)}×${Math.round(sample.height)}mm`, Math.round(x + w / 2), Math.round(y + h + 12));

      // Count annotation x{num} beside the panel
      ctx.font = `bold 12px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`x${count}`, Math.round(x + w + 8), Math.round(y + h / 2));

      xOffset += w + Math.max(40, spacing * 2);
    }
  }
  const totalHeight = products.length * rowHeight + 60;
  layout.yPos = Math.ceil(offsetY + totalHeight);
}

function drawNestLayout(ctx, products, projectAttrs, layout) {
  const nest = projectAttrs.nest;
  if (!nest || !nest.bin_height) return;

  const offsetY = layout.yPos;
  const padding = 30;
  const rolls = nest.rolls || [];
  
  // If no rolls, fall back to single bin display
  if (rolls.length === 0) {
    if (!nest.required_width) return;
    // Fit single bin into fixed bounds
    const maxBinW = 800;
    const maxBinH = 500;
    const s = Math.min(maxBinW / Math.max(1, nest.required_width), maxBinH / Math.max(1, nest.bin_height));
    const binX = padding;
    const binY = offsetY + padding;
    const binW = Math.round(nest.required_width * s);
    const binH = Math.round(nest.bin_height * s);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(binX, binY, binW, binH);

    const dimY = binY + binH + 15;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(binX, dimY);
    ctx.lineTo(binX + binW, dimY);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = `12px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${nest.total_width || nest.required_width}mm`, binX + binW / 2, dimY + 12);

    const colors = { MAIN: '#ef4444', SIDE_L: '#3b82f6', SIDE_R: '#10b981', DEFAULT: '#9ca3af' };
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const [label, placement] of Object.entries(nest.panels || {})) {
      let meta = null;
      for (const prod of products) {
        const attr = prod.attributes || {};
        if (attr.panels && attr.panels[label]) {
          meta = attr.panels[label];
          break;
        }
      }
      if (!meta) continue;

      const color = colors[meta.base] || colors.DEFAULT;
      const w = Math.round((placement.rotated ? meta.height : meta.width) * s);
      const h = Math.round((placement.rotated ? meta.width : meta.height) * s);
      const x = Math.round(binX + placement.x * s);
      const y = Math.round(binY + placement.y * s);

      ctx.globalAlpha = 0.7;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#fff';
      ctx.font = `8px sans-serif`;
      ctx.fillText(label, x + w / 2, y + h / 2);
    }
    
    layout.yPos = Math.ceil(dimY + 40);
    return;
  }

  // Multi-roll display: stack bins vertically
  const rollGap = 40;
  let currentY = offsetY + padding;
  
  const colors = { MAIN: '#ef4444', SIDE_L: '#3b82f6', SIDE_R: '#10b981', DEFAULT: '#9ca3af' };

  for (const roll of rolls) {
    // Fit each roll into fixed width; keep relative heights
    const maxRollW = 800;
    const rs = Math.min(1, maxRollW / Math.max(1, roll.width));
    const binX = padding;
    const binY = currentY;
    const binW = Math.round(roll.width * rs);
    const binH = Math.round(roll.height * rs);

    // Highlight last roll
    if (roll.is_last) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
      ctx.fillRect(binX, binY, binW, binH);
    }

    // Roll border
    ctx.strokeStyle = roll.is_last ? '#f59e0b' : '#000';
    ctx.lineWidth = roll.is_last ? 2.5 : 2;
    ctx.strokeRect(binX, binY, binW, binH);

    // Roll label
    ctx.fillStyle = roll.is_last ? '#f59e0b' : '#111827';
    ctx.font = `bold 12px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(
      `Roll ${roll.roll_number}${roll.is_last ? ' (Final Roll)' : ''}`,
      binX,
      binY - 8
    );

    // Draw panels in this roll
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const [label, placement] of Object.entries(roll.panels || {})) {
      let meta = null;
      for (const prod of products) {
        const attr = prod.attributes || {};
        if (attr.panels && attr.panels[label]) {
          meta = attr.panels[label];
          break;
        }
      }
      if (!meta) continue;

      const color = colors[meta.base] || colors.DEFAULT;
      const w = Math.round((placement.rotated ? meta.height : meta.width) * rs);
      const h = Math.round((placement.rotated ? meta.width : meta.height) * rs);
      const x = Math.round(binX + placement.x * rs);
      const y = Math.round(binY + placement.y * rs);

      ctx.globalAlpha = 0.7;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#fff';
      ctx.font = `8px sans-serif`;
      ctx.fillText(label, x + w / 2, y + h / 2);
    }

    // Dimension annotation below each roll
    const dimY = binY + binH + 8;
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(binX, dimY);
    ctx.lineTo(binX + binW, dimY);
    ctx.moveTo(binX, dimY - 3);
    ctx.lineTo(binX, dimY + 3);
    ctx.moveTo(binX + binW, dimY - 3);
    ctx.lineTo(binX + binW, dimY + 3);
    ctx.stroke();

    ctx.fillStyle = '#374151';
    ctx.font = `10px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${roll.width}mm × ${roll.height}mm`, binX + binW / 2, dimY + 12);

    currentY = dimY + 22 + rollGap;
  }

  // Summary at the bottom
  if (rolls.length > 0) {
    ctx.fillStyle = '#111827';
    ctx.font = `bold 11px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(
      `Total: ${rolls.length} roll${rolls.length > 1 ? 's' : ''} | Final roll length: ${nest.last_roll_length}mm`,
      padding,
      currentY
    );
    currentY += 20;
  }

  layout.yPos = Math.ceil(currentY + 20);
}
