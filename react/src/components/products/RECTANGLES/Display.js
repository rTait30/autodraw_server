/**
 * RECTANGLES Display - Visualizes rectangle nesting layout with multiple rolls.
 * Minimal, responsive canvas rendering for server-enriched project data.
 */

export function render(canvas, data) {
  // Debug logging
  console.log('[RECTANGLES Display] render called', { canvas, data });
  if (!canvas || !data) {
    console.warn('[RECTANGLES Display] Missing canvas or data', { canvas, data });
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('[RECTANGLES Display] No 2D context');
    return;
  }

  const rectangles = (data.project_attributes && data.project_attributes.all_rectangles) || [];
  const nest = (data.project_attributes && data.project_attributes.nest) || {};
  const rolls = (nest && nest.rolls) || [];
  const canvasWidth = canvas.width || 1000;

  // More debug logging
  console.log('[RECTANGLES Display] rectangles:', rectangles);
  console.log('[RECTANGLES Display] nest:', nest);
  console.log('[RECTANGLES Display] rolls:', rolls);

  // Responsive scale factors
  const isMobile = canvasWidth < 768;
  const baseScale = (canvasWidth / 1000);
  const fontScale = isMobile ? baseScale * 1.0 : baseScale;
  const pad = isMobile ? 40 * baseScale : 100 * baseScale;

  // Draw multiple rolls if available
  if (rolls && rolls.length > 0) {
    const fabricWidth = nest.bin_height || 3200;
    const rollSpacing = 60 * baseScale;
    const innerW = canvasWidth - pad * 2;
    const maxRollWidth = Math.max(...rolls.map(r => r.width || r.max_width || 0));

    // Compute width-based scale first (we keep width fixed, grow height if needed)
    const scaleByWidth = innerW / (maxRollWidth || innerW);
    // How tall a single roll becomes at this scale
    const singleRollHeightScaled = fabricWidth * scaleByWidth;
    // Total required drawing height including spacing + padding + summary footer
    const totalRollsHeight = singleRollHeightScaled * rolls.length;
    const totalSpacingHeight = rollSpacing * (rolls.length - 1);
    const summaryHeight = 40 * baseScale;
    const requiredHeight = Math.ceil(pad * 2 + totalRollsHeight + totalSpacingHeight + summaryHeight);

    // Only increase height (never shrink) so existing outer layout doesn't jump smaller.
    // This works for both Rectangles page and NewProject since both pass a canvas element.
    if (requiredHeight > canvas.height) {
      canvas.height = requiredHeight;
    }
    
    // Clear fixed height to allow aspect-ratio scaling via CSS width (fixes mobile warping)
    canvas.style.height = '';

    const canvasHeight = canvas.height;
    const scale = scaleByWidth;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Helper: get rectangle dimensions by label
    function getRectDims(label) {
      const found = rectangles.find(r => r.label === label);
      if (found) return { width: Number(found.width), height: Number(found.height) };
      return { width: 40, height: 40 };
    }

    let currentY = pad;

    rolls.forEach((roll, rollIndex) => {
      const rollWidth = roll.width || roll.max_width || 0;
      const rollHeight = roll.height || fabricWidth;
      const panels = roll.panels || {};

      if (rollWidth <= 0 || rollHeight <= 0) return;

      ctx.save();
      ctx.translate(pad, currentY);

      // Draw roll boundary
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2 * baseScale;
      ctx.strokeRect(0, 0, rollWidth * scale, rollHeight * scale);

      // Draw roll label
      ctx.fillStyle = '#333';
      ctx.font = `bold ${18 * fontScale}px sans-serif`;
      ctx.fillText(`Roll ${roll.roll_number || rollIndex + 1} (${rollWidth} mm)`, 0, -8 * baseScale);

      // Draw axis labels for first roll only
      if (rollIndex === 0) {
        ctx.save();
        ctx.fillStyle = '#666';
        ctx.font = `${14 * fontScale}px sans-serif`;
        // Y axis (fabricWidth)
        ctx.save();
        ctx.translate(-32 * baseScale, (rollHeight * scale) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(`fabricWidth: ${rollHeight} mm`, 0, 0);
        ctx.restore();
        ctx.restore();
      }

      // Draw rectangles in this roll
      Object.entries(panels).forEach(([label, panel]) => {
        let { width: w, height: h } = getRectDims(label);
        if (!w || w <= 0) w = 40;
        if (!h || h <= 0) h = 40;
        
        // Apply rotation by swapping dimensions if rotated
        if (panel.rotated) {
          [w, h] = [h, w];
        }
        
        const x = (panel.x || 0) * scale;
        const y = (panel.y || 0) * scale;
        const sw = w * scale;
        const sh = h * scale;

        ctx.save();
        ctx.strokeStyle = panel.rotated ? '#1976d2' : '#333';
        ctx.lineWidth = 3 * baseScale;
        ctx.strokeRect(x, y, sw, sh);
        ctx.fillStyle = 'rgba(25, 118, 210, 0.08)';
        ctx.fillRect(x, y, sw, sh);
        ctx.fillStyle = '#222';
        ctx.font = `${14 * fontScale}px sans-serif`;
        ctx.fillText(label, x + 6 * baseScale, y + 18 * fontScale);
        ctx.restore();
      });

      ctx.restore();
      currentY += rollHeight * scale + rollSpacing;
    });

    // Draw summary at bottom
    ctx.save();
    ctx.fillStyle = '#333';
    ctx.font = `${16 * fontScale}px sans-serif`;
    const summaryY = canvasHeight - 20 * baseScale;
    ctx.fillText(
      `Total: ${rolls.length} roll${rolls.length !== 1 ? 's' : ''} | Last roll: ${nest.last_roll_length || 0} mm`,
      pad,
      summaryY
    );
    ctx.restore();
  } else {
    // For non-roll displays, use default canvas height
    const canvasHeight = canvas.height || 1000;
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    if (rectangles.length) {
      // Fallback: draw rectangles as a list
      ctx.save();
      ctx.fillStyle = '#222';
      ctx.font = `${20 * fontScale}px sans-serif`;
      ctx.fillText('Rectangles:', pad, pad + 24 * fontScale);
      rectangles.forEach((rect, i) => {
        const y = pad + 40 * fontScale + i * 28 * fontScale;
        ctx.font = `${16 * fontScale}px sans-serif`;
        ctx.fillText(
          `${rect.label || 'R' + (i + 1)}: ${rect.width} x ${rect.height} (qty: ${rect.quantity})`,
          pad,
          y
        );
      });
      ctx.restore();
    } else {
      // No rectangles to show
      ctx.save();
      ctx.fillStyle = '#b71c1c';
      ctx.font = `${22 * fontScale}px sans-serif`;
      ctx.fillText('No rectangles to display.', pad, pad + 40 * fontScale);
      ctx.restore();
      console.warn('[RECTANGLES Display] No rectangles to display');
    }
  }
}
