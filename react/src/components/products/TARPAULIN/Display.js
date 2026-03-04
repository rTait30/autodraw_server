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
    const attrs = product.attributes || {};

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

        const eps = 2.0;
        const isLeft = Math.abs(ex) <= eps;
        const isRight = Math.abs(ex - finalLength) <= eps;
        const isBottom = Math.abs(ey) <= eps;
        const isTop = Math.abs(ey - finalWidth) <= eps;

        const isCorner = (isLeft || isRight) && (isBottom || isTop);

        ctx.beginPath();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        if (isCorner) {
          const d = 50; // Increased size
          ctx.moveTo(cx, cy);
          if (isLeft && isTop) {
            ctx.moveTo(cx, cy + d); ctx.lineTo(cx + d, cy);
          } else if (isRight && isTop) {
            ctx.moveTo(cx - d, cy); ctx.lineTo(cx, cy + d);
          } else if (isRight && isBottom) {
            ctx.moveTo(cx, cy - d); ctx.lineTo(cx - d, cy);
          } else if (isLeft && isBottom) {
            ctx.moveTo(cx + d, cy); ctx.lineTo(cx, cy - d);
          }
          ctx.stroke();
        } else {
          // Triangle with long side against edge (45 degrees)
          const size = 40; // Half-width of base on edge
          const height = 40; // Height pointing inwards - makes it 45 degrees

          let circleX = cx;
          let circleY = cy;
          const circleOffset = 25; 
          const circleRadius = 8; 

          if (isTop) {
            ctx.moveTo(cx - size, cy);
            ctx.lineTo(cx + size, cy);
            ctx.lineTo(cx, cy + height);
            ctx.lineTo(cx - size, cy);
            circleY = cy + circleOffset;
          } else if (isBottom) {
            ctx.moveTo(cx - size, cy);
            ctx.lineTo(cx + size, cy);
            ctx.lineTo(cx, cy - height);
            ctx.lineTo(cx - size, cy);
            circleY = cy - circleOffset;
          } else if (isLeft) {
            ctx.moveTo(cx, cy - size);
            ctx.lineTo(cx, cy + size);
            ctx.lineTo(cx + height, cy);
            ctx.lineTo(cx, cy - size);
            circleX = cx + circleOffset;
          } else if (isRight) {
            ctx.moveTo(cx, cy - size);
            ctx.lineTo(cx, cy + size);
            ctx.lineTo(cx - height, cy);
            ctx.lineTo(cx, cy - size);
            circleX = cx - circleOffset;
          }

          ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
          ctx.fill();
          ctx.stroke();

          // Circle in middle
          ctx.beginPath();
          ctx.arc(circleX, circleY, circleRadius, 0, 2 * Math.PI);
          ctx.fillStyle = '#fff'; // White interior for the hole
          ctx.fill();
          ctx.stroke();
        }

        const typeLabel = attrs[`eyelet_${eyelet.side}_size`];
        if (typeLabel) {
          ctx.fillStyle = 'red';
          ctx.font = 'bold 20px Arial'; 
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          let lx = cx, ly = cy;
          const offset = 60; // Increased 

          if (isTop) ly += offset;
          else if (isBottom) ly -= offset;

          if (isLeft) lx += offset;
          else if (isRight) lx -= offset;

          if (isCorner) {
            if (isLeft && isTop) { lx = cx + offset * 0.6; ly = cy + offset * 0.6; }
            else if (isRight && isTop) { lx = cx - offset * 0.6; ly = cy + offset * 0.6; }
            else if (isLeft && isBottom) { lx = cx + offset * 0.6; ly = cy - offset * 0.6; }
            else if (isRight && isBottom) { lx = cx - offset * 0.6; ly = cy - offset * 0.6; }
          }

          ctx.fillText(typeLabel, lx, ly);
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
