/**
 * SHADE_SAIL Display (Full Visual Replication + Responsive)
 * Mirrors original drawFunction logic from Steps.js with dynamic scaling for mobile/desktop.
 */

export function render(canvas, data) {
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sails = data.products || [];
  const canvasWidth = canvas.width || 1000;
  const canvasHeight = canvas.height || 1000;

  // Responsive scale factors based on canvas size
  const isMobile = canvasWidth < 768;
  const baseScale = canvasWidth / 1000; // normalize to 1000px baseline
  const fontScale = isMobile ? baseScale * 1.0 : baseScale;
  const paddingScale = isMobile ? baseScale * 0.6 : baseScale; // reduce padding on mobile

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.lineWidth = 2 * baseScale;
  ctx.strokeStyle = '#1a1a1a';

  const slotHeight = isMobile ? canvasHeight / Math.max(sails.length, 1) : 1000 * baseScale;
  const pad = isMobile ? 40 * paddingScale : 100 * paddingScale;

  sails.forEach((sail, idx) => {
    const attributes = sail.attributes || {};
    const positions = attributes.positions || {};
    const points = attributes.points || {};
    const ids = Object.keys(positions);
    if (!ids.length) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of ids) {
      const p = positions[id];
      if (!p) continue;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const shapeW = maxX - minX || 1;
    const shapeH = maxY - minY || 1;
    const innerW = canvasWidth - pad * 2;
    const innerH = slotHeight - pad * 2;
    const scale = Math.min(innerW / shapeW, innerH / shapeH) * (isMobile ? 0.95 : 0.9);
    const topOffset = idx * slotHeight;

    const mapped = {};
    for (const [id, p] of Object.entries(positions)) {
      mapped[id] = { x: pad + (p.x - minX) * scale, y: topOffset + pad + (p.y - minY) * scale };
    }

    const ordered = [...ids].sort();
    let cx = 0, cy = 0;
    ordered.forEach(id => { cx += mapped[id].x; cy += mapped[id].y; });
    cx /= ordered.length || 1; cy /= ordered.length || 1;

    // Draw outer perimeter edges with problematic coloring
    for (let i = 0; i < ordered.length; i++) {
      const p1 = ordered[i];
      const p2 = ordered[(i + 1) % ordered.length];
      const pos1 = mapped[p1];
      const pos2 = mapped[p2];
      if (!pos1 || !pos2) continue;
      let isProblematicEdge = false;
      for (const boxKey in attributes.boxProblems || {}) {
        if (attributes.boxProblems[boxKey] && boxKey.includes(p1) && boxKey.includes(p2)) {
          isProblematicEdge = true;
          break;
        }
      }
      ctx.strokeStyle = isProblematicEdge ? '#F00' : '#1a1a1a';
      ctx.lineWidth = 2 * baseScale;
      ctx.beginPath();
      ctx.moveTo(pos1.x, pos1.y);
      ctx.lineTo(pos2.x, pos2.y);
      ctx.stroke();
    }

    // Point labels & metadata (responsive sizing)
    ordered.forEach(id => {
      const p = mapped[id];
      if (!p) return;
      let vx = p.x - cx; let vy = p.y - cy; let vlen = Math.hypot(vx, vy) || 1; vx /= vlen; vy /= vlen;
      const baseDist = 40 * paddingScale;
      const lineSpacingLarge = 28 * fontScale;
      const lineSpacingSmall = 18 * fontScale;
      const anchorX = p.x + vx * baseDist;
      const anchorY = p.y + vy * baseDist;
      const perpX = -vy; const perpY = vx; const lateral = 10 * paddingScale;
      const labelX = anchorX + perpX * lateral * 0.2;
      const labelY = anchorY + perpY * lateral * 0.2;

      // Point circle (with reflex angle highlight if provided)
      const isReflex = attributes.reflexAngleValues && attributes.reflexAngleValues[id] != null;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (isReflex ? 10 : 6) * baseScale, 0, Math.PI * 2);
      ctx.fillStyle = isReflex ? '#dc2626' : '#2563eb';
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * baseScale; ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.font = `bold ${Math.round(28 * fontScale)}px Arial`;
      ctx.fillText(`Point ${id}`, labelX, labelY);
      if (points[id] && points[id].height !== undefined && points[id].height !== '') {
        ctx.fillText(`Height: ${points[id].height}`, labelX, labelY + lineSpacingLarge);
      }
      let nextY = labelY + lineSpacingLarge * 2;
      if (!data.discrepancyChecker) {
        ctx.font = `bold ${Math.round(16 * fontScale)}px Arial`;
        ctx.fillText(`Fitting: ${points[id]?.cornerFitting ?? ''}`, labelX, nextY); nextY += lineSpacingSmall;
        ctx.fillText(`Hardware: ${points[id]?.tensionHardware ?? ''}`, labelX, nextY); nextY += lineSpacingSmall;
        ctx.fillText(`Allowance: ${points[id]?.tensionAllowance ?? ''}`, labelX, nextY); nextY += lineSpacingSmall;
      }
      ctx.font = `bold ${Math.round(16 * fontScale)}px Arial`;
      ctx.fillStyle = '#F00';
      if (attributes.exitPoint === id && !data.discrepancyChecker) { ctx.fillText('Exit Point', labelX, nextY); nextY += lineSpacingSmall; }
      if (attributes.logoPoint === id && !data.discrepancyChecker) { ctx.fillText('Logo', labelX, nextY); nextY += lineSpacingSmall; }
      if (isReflex) {
        ctx.fillStyle = '#dc2626'; ctx.font = `bold ${Math.round(16 * fontScale)}px Arial`;
        ctx.fillText(`${Math.round(attributes.reflexAngleValues[id])}°`, labelX, nextY);
      }
    });

    // Dimensions (edges + diagonals) with rotated labels
    ctx.lineWidth = 1 * baseScale; ctx.fillStyle = '#333'; ctx.font = `bold ${Math.round(24 * fontScale)}px Arial`;
    const drawnLines = new Set();
    const isPerimeterEdge = (p1, p2) => {
      const i1 = ordered.indexOf(p1); const i2 = ordered.indexOf(p2);
      if (i1 === -1 || i2 === -1) return false;
      return Math.abs(i1 - i2) === 1 || Math.abs(i1 - i2) === ordered.length - 1;
    };
    for (const edgeKey in attributes.dimensions || {}) {
      if (edgeKey.length !== 2) continue;
      const dimValue = attributes.dimensions[edgeKey];
      if (dimValue === '' || dimValue === undefined || dimValue === null || isNaN(Number(dimValue))) continue;
      const [p1, p2] = edgeKey.split('');
      const lineKey = [p1, p2].sort().join('');
      if (drawnLines.has(lineKey)) continue;
      drawnLines.add(lineKey);
      const pos1 = mapped[p1]; const pos2 = mapped[p2];
      if (!pos1 || !pos2) continue;
      if (!isPerimeterEdge(p1, p2)) {
        let isProblematicLine = false;
        for (const boxKey in attributes.boxProblems || {}) {
          if (attributes.boxProblems[boxKey] && boxKey.includes(p1) && boxKey.includes(p2)) { isProblematicLine = true; break; }
        }
        ctx.strokeStyle = isProblematicLine ? '#F00' : '#999';
        ctx.lineWidth = 1 * baseScale; ctx.beginPath(); ctx.moveTo(pos1.x, pos1.y); ctx.lineTo(pos2.x, pos2.y); ctx.stroke();
      }
      const midX = (pos1.x + pos2.x) / 2; const midY = (pos1.y + pos2.y) / 2; const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
      const label = `${edgeKey}: ${dimValue}mm`;
      ctx.save(); ctx.translate(midX, midY); ctx.rotate(angle); ctx.fillText(label, 0, -5 * baseScale); ctx.restore();
    }

    // Summary metrics (responsive positioning and sizing)
    attributes.discrepancyProblem ? ctx.fillStyle = '#F00' : ctx.fillStyle = '#000';
    let yPos = topOffset + (isMobile ? slotHeight * 0.5 : 500 * baseScale);
    if (data.discrepancyChecker) { yPos = topOffset + (isMobile ? slotHeight * 0.9 : 1050 * baseScale); } 
    else { ctx.font = `bold ${Math.round(16 * fontScale)}px Arial`; }
    ctx.fillText(`Max Discrepancy: ${(attributes.maxDiscrepancy || 0).toFixed(0)} mm`, pad, yPos);
    ctx.fillText(`Discrepancy Problem: ${attributes.discrepancyProblem ? 'Yes' : 'No'}`, pad, yPos + 30 * fontScale);

    if ((attributes.pointCount || 0) >= 5) {
      yPos += 60 * fontScale;
      ctx.fillText('Discrepancies', pad, yPos); yPos += 30 * fontScale;
      const sortedDiscrepancies = Object.entries(attributes.discrepancies || {})
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, isMobile ? 5 : 10);
      sortedDiscrepancies.forEach(([edge, value]) => { 
        if (value > 0) { ctx.fillText(` - ${edge}: ${value.toFixed(0)} mm`, pad, yPos); yPos += 30 * fontScale; } 
      });
      ctx.fillText('Blame', pad, yPos); yPos += 30 * fontScale;
      const blameEntries = Object.entries(attributes.blame || {});
      const blameGroups = new Map();
      blameEntries.forEach(([key, val]) => {
        const rounded = Math.abs(Number(val) || 0).toFixed(2);
        if (!blameGroups.has(rounded)) blameGroups.set(rounded, []);
        blameGroups.get(rounded).push(key);
      });
      const groupedSorted = Array.from(blameGroups.entries())
        .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
        .slice(0, isMobile ? 5 : 10);
      groupedSorted.forEach(([rounded, keys]) => {
        if (rounded > 1) {
          keys.sort(); const label = keys.join(', ');
          ctx.fillText(` - ${label}: ${parseFloat(rounded).toFixed(0)} mm`, pad, yPos); yPos += 30 * fontScale;
        }
      });
    }
  });

  ctx.restore();
}

