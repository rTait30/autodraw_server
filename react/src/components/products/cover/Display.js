/**
 * COVER Display - Minimal canvas rendering for server-enriched project data.
 * Draws three visualization steps: 3D preview, flattened panels, and nesting layout.
 */

export function render(canvas, data) {
  if (!canvas || !data) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const products = data.products || [];
  const projectAttrs = data.project_attributes || {};

  // Step 0: Visualize Covers (3D preview)
  drawCover3DPreviews(ctx, products, 0);

  // Step 1: Flatten Panels
  drawFlattenedPanels(ctx, products, 400);

  // Step 2: Split Panels (if needed)
  drawSplitPanels(ctx, products, 700);

  // Step 3: Nest Panels
  drawNestLayout(ctx, products, projectAttrs, 900);
}

function drawCover3DPreviews(ctx, products, offsetY) {
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const attrs = product.attributes || {};
    
    const quantity = Math.max(1, Number(attrs.quantity) || 1);
    const width = Number(attrs.width) || 1;
    const height = Number(attrs.height) || 1;
    const length = Number(attrs.length) || 1;
    const hem = Number(attrs.hem) || 0;

    const padding = 50;
    const totalWidthUnits = width + length;
    const totalHeightUnits = height + hem + length;
    const maxDrawWidth = 400;
    const maxDrawHeight = 400;
    const scale = 0.5 * Math.min(maxDrawWidth / totalWidthUnits, maxDrawHeight / totalHeightUnits);

    const boxW = width * scale;
    const boxH = height * scale;
    const boxD = length * scale;
    const boxHem = hem * scale;

    const startX = 50 + i * 250;
    const startY = offsetY + 200;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;

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
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${width}mm × ${height}mm × ${length}mm`, startX + boxW / 2, startY + boxH + boxHem + 20);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`× ${quantity}`, startX + boxW / 2, startY + boxH + boxHem + 40);
  }
}

function drawFlattenedPanels(ctx, products, offsetY) {
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
    const layoutWidth = Math.max(flatMainWidth, flatSideWidth * 2 + gap);
    const layoutHeight = flatMainHeight + flatSideHeight + gap;
    const scale = Math.min(350 / layoutWidth, 350 / layoutHeight);

    const mainW = flatMainWidth * scale;
    const mainH = flatMainHeight * scale;
    const sideW = flatSideWidth * scale;
    const sideH = flatSideHeight * scale;

    const originX = 50 + i * 250;
    const originY = offsetY + 50;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;

    // Main panel
    ctx.strokeRect(originX, originY, mainW, mainH);

    // Hems (dotted)
    if (hem > 0) {
      ctx.setLineDash([3, 5]);
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
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Main: ${flatMainWidth}×${flatMainHeight}mm`, originX + mainW / 2, originY - 5);
    ctx.fillText(`Side: ${flatSideWidth}×${flatSideHeight}mm`, originX + sideW / 2, sideY - 5);
  }
}

function drawSplitPanels(ctx, products, offsetY) {
  let xOffset = 50;
  const spacing = 20;
  const maxHeight = 400;

  // First pass: collect all panels and find global max dimensions
  const allPanels = [];
  let globalMaxHeight = 0;
  let globalMaxWidth = 0;

  for (let i = 0; i < products.length; i++) {
    const attrs = products[i].attributes || {};
    const panels = attrs.panels || {};
    
    for (const [label, meta] of Object.entries(panels)) {
      const h = meta.height || 0;
      const w = meta.width || 0;
      if (h > globalMaxHeight) globalMaxHeight = h;
      if (w > globalMaxWidth) globalMaxWidth = w;
      allPanels.push({ label, ...meta });
    }
  }

  if (globalMaxHeight === 0 || globalMaxWidth === 0) return;

  // Calculate single scale for all panels
  const scale = Math.min(maxHeight / globalMaxHeight, 200 / globalMaxWidth) * 0.5;

  // Second pass: draw all panels at the same scale
  for (const panel of allPanels) {
    const w = (panel.width || 0) * scale;
    const h = (panel.height || 0) * scale;
    
    const x = xOffset;
    const y = offsetY + 100 - h / 2;

    // Color based on base type
    const colors = { MAIN: '#fecaca', SIDE_L: '#bfdbfe', SIDE_R: '#a7f3d0', DEFAULT: '#e5e7eb' };
    ctx.fillStyle = colors[panel.base] || colors.DEFAULT;
    ctx.fillRect(x, y, w, h);

    // Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Seam indicator if present
    if (panel.hasSeam && panel.hasSeam !== 'no') {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      if (panel.hasSeam === 'top') {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();
      } else if (panel.hasSeam === 'bottom') {
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
      ctx.strokeStyle = '#000';
    }

    // Label
    ctx.fillStyle = '#000';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(panel.label, x + w / 2, y + h / 2);

    // Dimensions
    ctx.font = '9px sans-serif';
    ctx.fillText(`${Math.round(panel.width)}×${Math.round(panel.height)}`, x + w / 2, y + h + 12);

    xOffset += w + spacing;
  }
}

function drawNestLayout(ctx, products, projectAttrs, offsetY) {
  const nest = projectAttrs.nest;
  if (!nest || !nest.required_width || !nest.bin_height) return;

  const padding = 30;
  const availableW = 800;
  const availableH = 700;
  const scale = Math.min(availableW / nest.required_width, availableH / nest.bin_height);

  const binX = padding;
  const binY = offsetY + padding;
  const binW = Math.round(nest.required_width * scale);
  const binH = Math.round(nest.bin_height * scale);

  // Fabric boundary
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(binX, binY, binW, binH);

  // Dimension annotation
  const dimY = binY + binH + 15;
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(binX, dimY);
  ctx.lineTo(binX + binW, dimY);
  ctx.moveTo(binX, dimY - 5);
  ctx.lineTo(binX, dimY + 5);
  ctx.moveTo(binX + binW, dimY - 5);
  ctx.lineTo(binX + binW, dimY + 5);
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${nest.required_width}mm`, binX + binW / 2, dimY + 12);

  // Fabric width label
  ctx.save();
  ctx.translate(binX - 15, binY + binH / 2);
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
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#fff';
    ctx.font = '8px sans-serif';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
}
