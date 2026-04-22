/**
 * TARPAULIN Display - Shows original dimensions and with 50mm pocket.
 */

export function render(canvas, data) {
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const products = data.products || [];
  const hasData = products.length > 0;
  const itemsToRender = hasData ? products : [{ attributes: {} }];

  const rowHeight = 600;
  // Update canvas height to accommodate all items
  // Note: setting canvas dimensions clears the canvas
  canvas.height = Math.max(rowHeight, itemsToRender.length * rowHeight);
  canvas.width = canvas.width || 800;

  // Clear canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  itemsToRender.forEach((product, index) => {
    const attrs = product.calculated || product.attributes || {};

    const originalLength = attrs.original_length || attrs.length || 1000;
    const originalWidth = attrs.original_width || attrs.width || 1000;
    const finalLength = attrs.final_length || originalLength + 100;
    const finalWidth = attrs.final_width || originalWidth + 100;

    // Scale to fit canvas row
    const margin = 50;
    const availableWidth = canvas.width - 2 * margin;
    const availableHeight = rowHeight - 2 * margin;

    // Calculate scale for this specific product to fit in its slot
    const scale = Math.min(availableWidth / finalLength, availableHeight / finalWidth);

    const scaledOrigL = originalLength * scale;
    const scaledOrigW = originalWidth * scale;
    const scaledFinalL = finalLength * scale;
    const scaledFinalW = finalWidth * scale;

    // Center for this product's row
    const centerX = canvas.width / 2;
    const centerY = (index * rowHeight) + (rowHeight / 2);

    // Draw final rectangle (with pocket)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - scaledFinalL / 2, centerY - scaledFinalW / 2, scaledFinalL, scaledFinalW);

    // Draw original rectangle (dashed)
    ctx.strokeStyle = '#666';
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(centerX - scaledOrigL / 2, centerY - scaledOrigW / 2, scaledOrigL, scaledOrigW);
    ctx.setLineDash([]);

    // Draw Eyelets
    const eyelets = attrs.calculated_eyelets || [];

    if (eyelets.length > 0) {
      eyelets.forEach(eyelet => {
        const ex = eyelet.x;
        const ey = eyelet.y;

        const cx = (centerX - scaledFinalL / 2) + (ex * scale);
        const cy = (centerY + scaledFinalW / 2) - (ey * scale);

        const side = eyelet.side;
        const isCorner = !!eyelet.is_corner;

        if (isCorner) {
          // Corner eyelet: right-triangle notch whose hypotenuse is the visible line
          const cut = 36;
          // Determine which corner based on tarp-space coordinates
          const atLeft  = Math.abs(eyelet.x) < 0.1;
          const atRight = Math.abs(eyelet.x - finalLength) < 0.1;
          const atBottom = Math.abs(eyelet.y) < 0.1;
          const atTop   = Math.abs(eyelet.y - finalWidth) < 0.1;

          ctx.beginPath();
          if (atLeft && atTop) {
            ctx.moveTo(cx + cut, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + cut);
          } else if (atRight && atTop) {
            ctx.moveTo(cx - cut, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + cut);
          } else if (atLeft && atBottom) {
            ctx.moveTo(cx + cut, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy - cut);
          } else if (atRight && atBottom) {
            ctx.moveTo(cx - cut, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy - cut);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(180, 180, 180, 0.65)';
          ctx.fill();
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Eyelet hole — positioned along the hypotenuse midpoint, inset toward the center
          const holeOffset = cut * 0.38;
          let holeX = cx;
          let holeY = cy;
          if (atLeft && atTop)         { holeX = cx + holeOffset; holeY = cy + holeOffset; }
          else if (atRight && atTop)   { holeX = cx - holeOffset; holeY = cy + holeOffset; }
          else if (atLeft && atBottom) { holeX = cx + holeOffset; holeY = cy - holeOffset; }
          else if (atRight && atBottom){ holeX = cx - holeOffset; holeY = cy - holeOffset; }

          ctx.beginPath();
          ctx.arc(holeX, holeY, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Regular edge eyelet: triangle pointing inward
          const baseHalf = 24;
          const depth = 32;
          const circleRadius = 8;

          let circleX = cx;
          let circleY = cy;
          let arrowTargetX = cx;
          let arrowTargetY = cy;

          ctx.beginPath();
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 1;

          if (side === 'top') {
            ctx.moveTo(cx - baseHalf, cy);
            ctx.lineTo(cx + baseHalf, cy);
            ctx.lineTo(cx, cy + depth);
            ctx.closePath();
            circleY = cy + depth * 0.55;
            arrowTargetY = cy + depth;
          } else if (side === 'bottom') {
            ctx.moveTo(cx - baseHalf, cy);
            ctx.lineTo(cx + baseHalf, cy);
            ctx.lineTo(cx, cy - depth);
            ctx.closePath();
            circleY = cy - depth * 0.55;
            arrowTargetY = cy - depth;
          } else if (side === 'left') {
            ctx.moveTo(cx, cy - baseHalf);
            ctx.lineTo(cx, cy + baseHalf);
            ctx.lineTo(cx + depth, cy);
            ctx.closePath();
            circleX = cx + depth * 0.55;
            arrowTargetX = cx + depth;
          } else if (side === 'right') {
            ctx.moveTo(cx, cy - baseHalf);
            ctx.lineTo(cx, cy + baseHalf);
            ctx.lineTo(cx - depth, cy);
            ctx.closePath();
            circleX = cx - depth * 0.55;
            arrowTargetX = cx - depth;
          }

          ctx.fillStyle = 'rgba(180, 180, 180, 0.65)';
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(circleX, circleY, circleRadius, 0, 2 * Math.PI);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = '#222';
          ctx.stroke();

          const typeLabel = attrs[`eyelet_${side}_size`];
          if (typeLabel) {
            let lx = cx;
            let ly = cy;
            const labelOffset = 56;

            if (side === 'top') ly += labelOffset;
            else if (side === 'bottom') ly -= labelOffset;
            else if (side === 'left') lx += labelOffset;
            else if (side === 'right') lx -= labelOffset;

            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(arrowTargetX, arrowTargetY);
            ctx.strokeStyle = '#c62828';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            const angle = Math.atan2(arrowTargetY - ly, arrowTargetX - lx);
            const arrowSize = 6;
            ctx.beginPath();
            ctx.moveTo(arrowTargetX, arrowTargetY);
            ctx.lineTo(
              arrowTargetX - arrowSize * Math.cos(angle - Math.PI / 6),
              arrowTargetY - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(arrowTargetX, arrowTargetY);
            ctx.lineTo(
              arrowTargetX - arrowSize * Math.cos(angle + Math.PI / 6),
              arrowTargetY - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.strokeStyle = '#c62828';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#c62828';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(typeLabel, lx, ly);
          }
        }
      });
    }

    // Labels
    ctx.fillStyle = 'red';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';

    const labelPrefix = itemsToRender.length > 1 ? `#${index + 1}: ` : '';

    ctx.fillText(`${labelPrefix}${originalLength}mm x ${originalWidth}mm`, centerX, centerY - scaledFinalW / 2 - 40);
    
    if (!hasData) {
      ctx.fillStyle = '#666';
      ctx.font = '14px Arial';
      ctx.fillText('(Default dimensions - enter values and calculate to update)', centerX, centerY + scaledFinalW / 2 + 80);
    }
  });
}
