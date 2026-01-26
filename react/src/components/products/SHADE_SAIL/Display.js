/**
 * SHADE_SAIL Display (Full Visual Replication + Responsive)
 * Mirrors original drawFunction logic from Steps.js with dynamic scaling for mobile/desktop.
 */

export function render(canvas, data) {
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sails = data.products || [];

  // Layout configuration
  const sailDrawingHeight = 600;
  const textSectionHeight = 300; // Space for discrepancy text
  const perSailHeight = sailDrawingHeight + textSectionHeight;
  
  canvas.height = perSailHeight * sails.length;

  // Responsive scale factors based on viewport width
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const baseScale = 3.0; // leaner base scaling
  const fontScale = 1.0;
  const paddingScale = 1.0;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.lineWidth = 2 * baseScale;
  ctx.strokeStyle = '#1a1a1a';

  const pad = isMobile ? 50 : 100;

  sails.forEach((sail, idx) => {
    const startY = idx * perSailHeight + 100;
    
    const attributes = sail.attributes || {};
    const positions = attributes.positions || {};
    const points = attributes.points || {};
    const ids = Object.keys(positions);
    if (!ids.length) return;

    // Build a set of problematic line keys (unordered pairs) from boxProblems
    // For any box like ABCD, mark AB, BC, CD, DA and diagonals AC, BD as problematic
    const problematicLines = new Set();
    if (attributes.boxProblems) {
      Object.entries(attributes.boxProblems).forEach(([boxKey, isProblem]) => {
        if (!isProblem || !boxKey || boxKey.length < 4) return;
        const corners = boxKey.replace(/[^A-Za-z]/g, '').split('');
        if (corners.length < 4) return;
        const [A, B, C, D] = corners;
        const pairs = [
          [A, B], [B, C], [C, D], [D, A], // edges
          [A, C], [B, D],                  // diagonals
        ];
        pairs.forEach(([p1, p2]) => {
          const key = [p1, p2].sort().join('');
          problematicLines.add(key);
        });
      });
    }

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
    
    const innerW = canvas.width - pad * 2;
    const innerH = sailDrawingHeight - pad * 2;
    
    const scale = Math.min(innerW / shapeW, innerH / shapeH);
    
    // Center in the drawing area
    const drawnW = shapeW * scale;
    const drawnH = shapeH * scale;
    const offsetX = (canvas.width - drawnW) / 2;
    const offsetY = (sailDrawingHeight - drawnH) / 2;

    const mapped = {};
    // Map coordinates ensuring positive X -> right, positive Y -> up
    for (const [id, p] of Object.entries(positions)) {
      const mappedX = offsetX + (p.x - minX) * scale;
      const mappedY = startY + offsetY + (maxY - p.y) * scale; 
      mapped[id] = { x: mappedX, y: mappedY };
    }

    // Map workpoints (tension points) if available
    const mappedWorkpoints = {};
    const workpoints = attributes.workpoints || {};
    const hasWorkpoints = Object.keys(workpoints).length > 0;
    
    if (hasWorkpoints) {
      for (const [id, wp] of Object.entries(workpoints)) {
        const mappedX = offsetX + (wp.x - minX) * scale;
        const mappedY = startY + offsetY + (maxY - wp.y) * scale;
        mappedWorkpoints[id] = { x: mappedX, y: mappedY };
      }
    }

    // Determine which points define the sail perimeter (workpoints if available, else posts)
    const perimeterPoints = hasWorkpoints ? mappedWorkpoints : mapped;

    // Use pre-calculated centroid from backend if available, mapped to canvas
    let cx = 0, cy = 0;
    if (attributes.centroid) {
        cx = offsetX + (attributes.centroid.x - minX) * scale;
        cy = startY + offsetY + (maxY - attributes.centroid.y) * scale;
    } else {
        // Fallback if not present (e.g. old data)
        ids.forEach(id => { 
            const p = perimeterPoints[id] || mapped[id];
            cx += p.x; cy += p.y; 
        });
        cx /= (ids.length || 1); cy /= (ids.length || 1);
    }

    // Order points by polar angle around centroid to approximate perimeter order
    const angles = Object.fromEntries(ids.map(id => [id, Math.atan2((perimeterPoints[id] || mapped[id]).y - cy, (perimeterPoints[id] || mapped[id]).x - cx)]));
    const ordered = [...ids].sort((a, b) => angles[a] - angles[b]);

    // Draw tensioners (lines from post to workpoint)
    if (hasWorkpoints) {
        ctx.save();
        ctx.strokeStyle = '#666'; 
        ctx.lineWidth = 1 * baseScale;
        ctx.setLineDash([5, 5]); 
        ids.forEach(id => {
            const post = mapped[id];
            const wp = mappedWorkpoints[id];
            if (post && wp) {
                ctx.beginPath();
                ctx.moveTo(post.x, post.y);
                ctx.lineTo(wp.x, wp.y);
                ctx.stroke();
                
                // Draw small circle at workpoint
                ctx.beginPath();
                ctx.arc(wp.x, wp.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#666';
                ctx.fill();
            }
        });
        ctx.restore();
    }

    // Draw outer perimeter edges with catenary curves only; color red if problematic
    for (let i = 0; i < ordered.length; i++) {
      const p1 = ordered[i];
      const p2 = ordered[(i + 1) % ordered.length];

      // Draw straight red line between posts (measured points)
      const post1 = mapped[p1];
      const post2 = mapped[p2];
      if (post1 && post2) {
          ctx.save();
          ctx.strokeStyle = '#000'; 
          ctx.lineWidth = 1 * baseScale;
          ctx.beginPath();
          ctx.moveTo(post1.x, post1.y);
          ctx.lineTo(post2.x, post2.y);
          ctx.stroke();
          ctx.restore();
      }

      const pos1 = perimeterPoints[p1];
      const pos2 = perimeterPoints[p2];
      if (!pos1 || !pos2) continue;

      const lineKey = [p1, p2].sort().join('');
      const isProblematicPerimeter = problematicLines.has(lineKey);

      // Draw catenary curve (visual only, 5% dip)
      // Find midpoint
      const mx = (pos1.x + pos2.x) / 2;
      const my = (pos1.y + pos2.y) / 2;
      // Vector from p1 to p2
      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const length = Math.hypot(dx, dy);
      // Perpendicular vector (normalized)
      const perpX = -dy / length;
      const perpY = dx / length;
      // Dip is 5% of edge length
      const dip = 0.1 * length;
      // Catenary control point (midpoint, dipped toward center)
      // Find center of sail for general inward direction
      const sailCenter = { x: cx, y: cy };
      // Vector from midpoint to center
      const toCenterX = sailCenter.x - mx;
      const toCenterY = sailCenter.y - my;
      const toCenterLen = Math.hypot(toCenterX, toCenterY) || 1;
      // Direction for dip: blend between perfect inward and perfect perpendicular
      // For simplicity, just use perpendicular toward center
      let dipDirX = toCenterX / toCenterLen;
      let dipDirY = toCenterY / toCenterLen;
      // Control point for quadratic curve
      const cx1 = mx + dipDirX * dip;
      const cy1 = my + dipDirY * dip;
      // Draw catenary as quadratic curve
      ctx.save();
      ctx.strokeStyle = isProblematicPerimeter ? '#EB1C24' : '#004A7C'; // red if problematic, else catenary blue
      ctx.lineWidth = 4; // thicker but constant
      ctx.beginPath();
      ctx.moveTo(pos1.x, pos1.y);
      ctx.quadraticCurveTo(cx1, cy1, pos2.x, pos2.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Point labels & metadata (responsive sizing)
    ordered.forEach(id => {
      const p = mapped[id];
      if (!p) return;
      let vx = p.x - cx; let vy = p.y - cy; let vlen = Math.hypot(vx, vy) || 1; vx /= vlen; vy /= vlen;
      const baseDist = 50;
      const lineSpacingLarge = 24;
      const lineSpacingSmall = 16;
      const anchorX = p.x + vx * baseDist;
      const anchorY = p.y + vy * baseDist;
      const perpX = -vx; const perpY = vy; const lateral = 2 * paddingScale;
      const labelX = anchorX + perpX * lateral * 0.2 - 50;
      const labelY = anchorY + perpY * lateral * 0.2 - 50;

      // Point circle (with reflex angle highlight if provided)
      const isReflex = attributes.reflexAngleValues && attributes.reflexAngleValues[id] != null;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (isReflex ? 8 : 5), 0, Math.PI * 2);
      ctx.fillStyle = isReflex ? '#dc2626' : '#2563eb';
      ctx.fill();
      ctx.strokeStyle = '#004A7C'; ctx.lineWidth = 1; ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.font = `bold 32px Arial`;
      ctx.fillText(`${id}`, labelX, labelY);
      
      ctx.font = `bold 12px Arial`;

      let nextY = labelY + lineSpacingLarge;
      if (points[id] && points[id].height !== undefined && points[id].height !== '') {
        ctx.fillText(`Height: ${points[id].height}`, labelX, nextY); nextY += lineSpacingSmall;
      }
      
      if (!data.discrepancyChecker) {
        ctx.fillText(`Fitting: ${points[id]?.cornerFitting ?? ''}`, labelX, nextY); nextY += lineSpacingSmall;
        ctx.fillText(`Hardware: ${points[id]?.tensionHardware ?? ''}`, labelX, nextY); nextY += lineSpacingSmall;
        ctx.fillText(`Allowance: ${points[id]?.tensionAllowance ?? ''}`, labelX, nextY); nextY += lineSpacingSmall;
      }
      ctx.font = `bold 12px Arial`;
      ctx.fillStyle = '#EB1C24';
      if (attributes.exitPoint === id && !data.discrepancyChecker) { ctx.fillText('Exit Point', labelX, nextY); nextY += lineSpacingSmall; }
      if (attributes.logoPoint === id && !data.discrepancyChecker) { ctx.fillText('Logo', labelX, nextY); nextY += lineSpacingSmall; }
      
      /*
      reflex not working yet
      if (isReflex) {
        ctx.fillStyle = '#dc2626'; ctx.font = `bold ${Math.round(16 * fontScale)}px Arial`;
        ctx.fillText(`${Math.round(attributes.reflexAngleValues[id])}°`, labelX, nextY);
      }
      */
    });

    // Dimensions (edges + diagonals) with rotated labels
    ctx.lineWidth = 1; ctx.fillStyle = '#333'; ctx.font = `bold 14px Arial`;
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
        const isProblematicLine = problematicLines.has(lineKey);
        ctx.strokeStyle = isProblematicLine ? '#EB1C24' : '#999';
        ctx.lineWidth = 1 * baseScale; ctx.beginPath(); ctx.moveTo(pos1.x, pos1.y); ctx.lineTo(pos2.x, pos2.y); ctx.stroke();
      }
      const midX = (pos1.x + pos2.x) / 2; const midY = (pos1.y + pos2.y) / 2; 
      let angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
      // Flip if upside down (angle between π/2 and 3π/2)
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
        angle += Math.PI;
      }
      const label = `${edgeKey}: ${dimValue}mm`;

      console.log("Drawing dimension label:", label, "at", midX, midY, "angle", angle);

      ctx.save(); ctx.translate(midX, midY); ctx.rotate(angle); ctx.fillText(label, 0, -6); ctx.restore();
    }

    // Summary metrics (responsive positioning and sizing)
    // Create a container box for the metrics
    let yPos = startY + sailDrawingHeight + 50; // Pushed down slightly
    const textBlockWidth = 550;
    const startX = Math.max(25, (canvas.width - textBlockWidth) / 2);
    const boxPadding = 20;
    const col1X = startX + boxPadding;
    const col2X = startX + 280; // Second column start

    // Prepare data first to calculate layout
    const sortedDiscrepancies = Object.entries(attributes.discrepancies || {})
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 8);

    const blameEntries = Object.entries(attributes.blame || {});
    const blameGroups = new Map();
    blameEntries.forEach(([key, val]) => {
      const rounded = Math.abs(Number(val) || 0).toFixed(2);
      if (!blameGroups.has(rounded)) blameGroups.set(rounded, []);
      blameGroups.get(rounded).push(key);
    });
    const groupedBlame = Array.from(blameGroups.entries())
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .slice(0, 8) // limiting length to save space
      .filter(([rounded]) => parseFloat(rounded) > 1);

    const hasData = (attributes.pointCount || 0) >= 4; // Show details for Quads (4) and up
    const isProblem = attributes.discrepancyProblem;

    let suggestionText = "";
    if (isProblem && groupedBlame.length > 0) {
       const topSuspectKeys = groupedBlame[0][1];
       // If too many dimensions share the top blame score, it's ambiguous
       if (topSuspectKeys.length > 3) {
          suggestionText = "Cannot determine specific problem dimension.";
       } else {
          const topSuspects = topSuspectKeys.join(' or ');
          suggestionText = `Check dimension ${topSuspects} or similar.`;
       }
    }

    // Determine Box Height
    let boxHeight = 60; // Header + Status line
    if (isProblem) boxHeight += 25; // Suggestion line
    if (!isProblem) boxHeight += 25; // Good status message

    if (hasData && (sortedDiscrepancies.length > 0 || groupedBlame.length > 0)) {
        boxHeight += 35; // Spacing + Headers
        const rowCount = Math.max(sortedDiscrepancies.length, groupedBlame.length);
        boxHeight += rowCount * 18;
    }

    // Draw Box
    ctx.save();
    ctx.fillStyle = '#ffffff'; 
    ctx.shadowColor = 'rgba(0,0,0,0.05)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.fillRect(startX, yPos, textBlockWidth, boxHeight);
    
    ctx.strokeStyle = isProblem ? '#fca5a5' : '#86efac'; // Light red or light green border
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, yPos, textBlockWidth, boxHeight);
    
    // Draw Header Content
    let currentY = yPos + 30;
    
    ctx.font = "bold 15px Arial";
    ctx.fillStyle = "#111";
    ctx.fillText(`Max Discrepancy: ${(attributes.maxDiscrepancy || 0).toFixed(0)} mm`, col1X, currentY);

    ctx.fillStyle = isProblem ? '#dc2626' : '#16a34a';
    ctx.fillText(isProblem ? "These dimensions have discrepancies." : "Specifications Valid", col2X, currentY);

    currentY += 25; 
    ctx.fillStyle = "#4b5563";
    ctx.font = "italic 13px Arial";

    if (isProblem) {
       ctx.fillText("Shape does not close geometrically.", col1X, currentY);
       if (suggestionText) {
          ctx.fillText(suggestionText, col2X - 50, currentY); // Offset slightly
       }
    } else {
       ctx.fillText("Measurements form a consistent geometric shape.", col1X, currentY);
    }

    // Draw Tables
    if (hasData && (sortedDiscrepancies.length > 0 || groupedBlame.length > 0)) {
        currentY += 30; // Spacing
        const tableHeaderY = currentY;
        
        ctx.font = "bold 12px Arial";
        ctx.fillStyle = "#111";
        if (sortedDiscrepancies.length > 0) ctx.fillText("Discrepancies (Loop Errors):", col1X, tableHeaderY);
        if (groupedBlame.length > 0) ctx.fillText("Likely Error Source:", col2X, tableHeaderY);
        
        currentY += 20;
        ctx.font = "12px Arial"; // regular
        
        // Loop for rows
        const maxRows = Math.max(sortedDiscrepancies.length, groupedBlame.length);
        for(let i=0; i<maxRows; i++) {
           let rowY = currentY + (i * 18);
           
           // Col 1
           if (i < sortedDiscrepancies.length) {
              const [box, value] = sortedDiscrepancies[i];
              // Recalc percentage context
              const corners = box.split('');
              let longestBoxEdge = 0;
              for (let ci = 0; ci < corners.length; ci++) {
                for (let cj = ci + 1; cj < corners.length; cj++) {
                   const pair = corners[ci] + corners[cj];
                   const revPair = corners[cj] + corners[ci];
                   const l = attributes.dimensions[pair] || attributes.dimensions[revPair];
                   if (typeof l === 'number' && l > longestBoxEdge) longestBoxEdge = l;
                }
              }
              const pct = ((value / (longestBoxEdge || 1)) * 100).toFixed(0);
              
              ctx.fillStyle = "#374151";
              ctx.fillText(`- ${box}: ${value.toFixed(0)} mm (${pct}%)`, col1X + 5, rowY);
           }

           // Col 2
           if (i < groupedBlame.length) {
              const [rounded, keys] = groupedBlame[i];
              ctx.fillStyle = "#ef4444"; // Red standout
              ctx.fillText(`- ${keys.join(', ')}: ~${parseFloat(rounded).toFixed(0)} mm`, col2X + 5, rowY);
           }
        }
    }
    ctx.restore();
  });

  ctx.restore();
}

