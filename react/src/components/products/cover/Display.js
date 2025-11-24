/**
 * COVER Display - Minimal canvas rendering for server-enriched project data (Responsive).
 * Draws three visualization steps: 3D preview, flattened panels, and nesting layout.
 */

export function render(canvas, data) {
  if (!canvas || !data) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const canvasWidth = canvas.width || 1000;
  const canvasHeight = canvas.height || 1000;
  
  // Responsive scale factors
  const isMobile = canvasWidth < 768;
  //const baseScale = canvasWidth / 1000;
  //const fontScale = isMobile ? baseScale * 1.0 : baseScale;
  //const spacingScale = isMobile ? baseScale * 0.6 : baseScale;

  let baseScale;
  let fontScale;
  let spacingScale;

  if (isMobile) {
    baseScale = canvasWidth / 800;
    fontScale = baseScale * 1.0;
    spacingScale = baseScale;
  } else {
    baseScale = canvasWidth / 1000;
    fontScale = baseScale;
    spacingScale = baseScale;
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  // Sharper vectors/text where possible
  ctx.imageSmoothingEnabled = false;

  const products = data.products || [];
  const projectAttrs = data.project_attributes || {};

  // Global vertical layout state that steps can update
  const layout = { yPos: 0 };

  // Step 0: Visualize Covers (3D preview)
  drawCover3DPreviews(ctx, products, layout, baseScale, fontScale, spacingScale, isMobile);

  // Step 1: Flatten Panels
  drawFlattenedPanels(ctx, products, layout, baseScale, fontScale, spacingScale, isMobile);

  // Step 2: Split Panels (if needed)
  drawSplitPanels(ctx, products, layout, baseScale, fontScale, spacingScale, isMobile);

  // Step 3: Nest Panels
  drawNestLayout(ctx, products, projectAttrs, layout, baseScale, fontScale, spacingScale, isMobile);
}

function drawCover3DPreviews(ctx, products, layout, baseScale, fontScale, spacingScale, isMobile) {
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

    const padding = 50 * spacingScale;
    const totalWidthUnits = width + length;
    const totalHeightUnits = height + hem + length;
    const maxDrawWidth = (isMobile ? 300 : 400) * baseScale;
    const maxDrawHeight = (isMobile ? 300 : 400) * baseScale;
    const scale = 0.5 * Math.min(maxDrawWidth / totalWidthUnits, maxDrawHeight / totalHeightUnits);

    const boxW = width * scale;
    const boxH = height * scale;
    const boxD = length * scale;
    const boxHem = hem * scale;

    const startX = (50 + i * 250) * spacingScale;
    const startY = offsetY + 200 * spacingScale;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5 * baseScale;

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
    ctx.font = `${Math.round(12 * fontScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${width}mm × ${height}mm × ${length}mm`, startX + boxW / 2, startY + boxH + boxHem + 20 * spacingScale);
    ctx.font = `bold ${Math.round(20 * fontScale)}px sans-serif`;
    ctx.fillText(`× ${quantity}`, startX + boxW / 2, startY + boxH + boxHem + 40 * spacingScale);

    const bottom = startY + boxH + boxHem + 50 * spacingScale;
    if (bottom > maxBottomY) maxBottomY = bottom;
  }
  layout.yPos = Math.ceil(maxBottomY + 40 * spacingScale);
}

function drawFlattenedPanels(ctx, products, layout, baseScale, fontScale, spacingScale, isMobile) {
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

    const gap = 30 * spacingScale;
    const layoutWidth = Math.max(flatMainWidth, flatSideWidth * 2 + gap);
    const layoutHeight = flatMainHeight + flatSideHeight + gap;
    const maxDim = (isMobile ? 250 : 350) * baseScale;
    const scale = Math.min(maxDim / layoutWidth, maxDim / layoutHeight) * 0.5;

    const mainW = flatMainWidth * scale;
    const mainH = flatMainHeight * scale;
    const sideW = flatSideWidth * scale;
    const sideH = flatSideHeight * scale;

    const originX = (50 + i * 250) * spacingScale;
    const originY = offsetY + 50 * spacingScale;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5 * baseScale;

    // Main panel
    ctx.strokeRect(originX, originY, mainW, mainH);

    // Hems (dotted)
    if (hem > 0) {
      ctx.setLineDash([3 * baseScale, 5 * baseScale]);
      ctx.strokeStyle = '#6b7280';
      const hemOffset = hem * scale;
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
    const sideY = originY + mainH + gap;
    ctx.strokeRect(originX, sideY, sideW, sideH);
    ctx.strokeRect(originX + sideW + gap, sideY, sideW, sideH);

    // Labels
    ctx.fillStyle = '#000';
    ctx.font = `${Math.round(10 * fontScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Main: ${flatMainWidth}×${flatMainHeight}mm`, originX + mainW / 2, originY - 5 * spacingScale);
    ctx.fillText(`Side: ${flatSideWidth}×${flatSideHeight}mm`, originX + sideW / 2, sideY - 5 * spacingScale);

    const bottom = sideY + sideH + 20 * spacingScale;
    if (bottom > maxBottomY) maxBottomY = bottom;
  }
  layout.yPos = Math.ceil(maxBottomY + 40 * spacingScale);
}

function drawSplitPanels(ctx, products, layout, baseScale, fontScale, spacingScale, isMobile) {
  const offsetY = layout.yPos;
  // Draw per product in rows with grouped identical panels annotated as x{count}
  const rowHeight = (isMobile ? 100 : 120) * baseScale;
  const spacing = 20 * spacingScale;

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
    const maxHeightPx = (isMobile ? 160 : 180) * baseScale;
    const maxWidthPx = (isMobile ? 160 : 200) * baseScale;
    const scale = Math.min(
      maxHeightPx / (maxH || 1),
      maxWidthPx / (maxW || 1)
    ) * 0.9;

    let xOffset = 50 * spacingScale;
    // Optional: product header
    ctx.fillStyle = '#111827';
    ctx.font = `${Math.round(12 * fontScale)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`Size ${i + 1} (${attrs.length} x ${attrs.width} x ${attrs.height})`, xOffset, Math.round(offsetY + i * rowHeight + 16 * spacingScale - 20));

    // Draw each group once with count
    for (const { sample, count } of groups.values()) {
      const w = Math.round((sample.width || 0) * scale);
      const h = Math.round((sample.height || 0) * scale);
      const x = Math.round(xOffset);
      const y = Math.round(offsetY + i * rowHeight + 40 * spacingScale - h / 2);

      ctx.fillStyle = colors[sample.base] || colors.DEFAULT;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = Math.max(1, Math.floor(1 * baseScale));
      ctx.strokeRect(x + 0.5, y + 0.5, w, h); // snap for crisp edges

      if (sample.hasSeam && sample.hasSeam !== 'no') {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = Math.max(1, Math.floor(1 * baseScale));
        ctx.setLineDash([4 * baseScale, 4 * baseScale]);
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
      ctx.font = `${Math.round(10 * fontScale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${Math.round(sample.width)}×${Math.round(sample.height)}mm`, Math.round(x + w / 2), Math.round(y + h + 12 * spacingScale));

      // Count annotation x{num} beside the panel
      ctx.font = `bold ${Math.round(12 * fontScale)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`x${count}`, Math.round(x + w + 8 * spacingScale), Math.round(y + h / 2));

      xOffset += w + Math.max(40, spacing * 2);
    }
  }
  const totalHeight = products.length * rowHeight + 60 * spacingScale;
  layout.yPos = Math.ceil(offsetY + totalHeight);
}

function drawNestLayout(ctx, products, projectAttrs, layout, baseScale, fontScale, spacingScale, isMobile) {
  const nest = projectAttrs.nest;
  if (!nest || !nest.required_width || !nest.bin_height) return;

  const offsetY = layout.yPos;
  const padding = 30 * spacingScale;
  const availableW = (isMobile ? 600 : 800) * baseScale;
  const availableH = (isMobile ? 500 : 700) * baseScale;
  const scale = Math.min(availableW / nest.required_width, availableH / nest.bin_height);

  const binX = padding;
  const binY = offsetY + padding;
  const binW = Math.round(nest.required_width * scale);
  const binH = Math.round(nest.bin_height * scale);

  // Fabric boundary
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2 * baseScale;
  ctx.strokeRect(binX, binY, binW, binH);

  // Dimension annotation
  const dimY = binY + binH + 15 * spacingScale;
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1 * baseScale;
  ctx.beginPath();
  ctx.moveTo(binX, dimY);
  ctx.lineTo(binX + binW, dimY);
  ctx.moveTo(binX, dimY - 5 * spacingScale);
  ctx.lineTo(binX, dimY + 5 * spacingScale);
  ctx.moveTo(binX + binW, dimY - 5 * spacingScale);
  ctx.lineTo(binX + binW, dimY + 5 * spacingScale);
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.font = `${Math.round(12 * fontScale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`${nest.required_width}mm`, binX + binW / 2, dimY + 12 * spacingScale);

  // Fabric width label
  ctx.save();
  ctx.translate(binX - 15 * spacingScale, binY + binH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${nest.bin_height}mm`, 0, 0);
  ctx.restore();

  // Panel colors
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
    const w = Math.round((placement.rotated ? meta.height : meta.width) * scale);
    const h = Math.round((placement.rotated ? meta.width : meta.height) * scale);
    const x = Math.round(binX + placement.x * scale);
    const y = Math.round(binY + placement.y * scale);

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1 * baseScale;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(8 * fontScale)}px sans-serif`;
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
  const bottom = dimY + 24 * spacingScale;
  layout.yPos = Math.ceil(bottom + 40 * spacingScale);
}
