function checkDiscrepancyCombo(data, combo, blameScores, failingCombos) {

    console.log('[SailSteps] Checking 4-point group:', combo);
    const [p1, p2, p3, p4] = combo;
    // Get all edge and diagonal pairs for this quad
    const pairs = [
        [p1, p2], [p2, p3], [p3, p4], [p4, p1], // edges
        [p1, p3], [p2, p4]                      // diagonals
    ];
    const lengths = pairs.map(([a, b]) => getLength(data, a, b));
    const heights = combo.map(pid => data[`H${pid}`]);

    if (lengths.some(l => typeof l !== 'number' || isNaN(l)) || heights.some(h => typeof h !== 'number' || isNaN(h))) {
        console.log('[SailSteps] Invalid lengths or heights for combo:', combo, 'lengths:', lengths, 'heights:', heights);
        failingCombos.push(combo);
        return;
    }

    try {
        // Unpack for clarity
        const [l12, l23, l34, l41, l13, l24] = lengths;
        const [h1, h2, h3, h4] = heights;

        // XY projections
        const l12xy = Math.sqrt(l12 ** 2 - (h2 - h1) ** 2);
        const l23xy = Math.sqrt(l23 ** 2 - (h3 - h2) ** 2);
        const l34xy = Math.sqrt(l34 ** 2 - (h4 - h3) ** 2);
        const l41xy = Math.sqrt(l41 ** 2 - (h1 - h4) ** 2);
        const l13xy = Math.sqrt(l13 ** 2 - (h1 - h3) ** 2);
        const l24xy = Math.sqrt(l24 ** 2 - (h2 - h4) ** 2);

        // Angles
        const angle123 = Math.acos((l13xy ** 2 + l12xy ** 2 - l23xy ** 2) / (2 * l13xy * l12xy));
        const angle134 = Math.acos((l13xy ** 2 + l41xy ** 2 - l34xy ** 2) / (2 * l13xy * l41xy));

        // 2D positions for p2 and p4 relative to p1
        const p2x = l12xy * Math.cos(angle123);
        const p2y = l12xy * Math.sin(angle123);
        const p4x = l41xy * Math.cos(angle134);
        const p4y = -l41xy * Math.sin(angle134);

        // 3D theoretical l24
        const l24TeoricXYZ = Math.sqrt((p2x - p4x) ** 2 + (p2y - p4y) ** 2 + (h2 - h4) ** 2);
        const discrepancy = l24TeoricXYZ - l24;
        const threshold = data.fabricType === 'PVC' ? 40 : 80;

        if (Math.abs(discrepancy) > threshold) {
            console.log('[SailSteps] Discrepancy detected in combo:', combo, 'Discrepancy:', discrepancy);
            failingCombos.push(combo);

            // Blame all pairs and heights in this combo
            pairs.forEach(([a, b]) => {
                const id = `${a}${b}`;
                blameScores[id] = (blameScores[id] || 0) + 1;
            });
            combo.forEach(pid => {
                blameScores[`H${pid}`] = (blameScores[`H${pid}`] || 0) + 1;
            });
        }
    } catch (err) {
        console.log('[SailSteps] Error in checkDiscrepancyCombo:', err, combo);
        // Ignore errors for this combo
    }
}

function getCombinations(arr, k) {
    const results = [];
    function helper(start, combo) {
        if (combo.length === k) {
            results.push([...combo]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            helper(i + 1, combo);
            combo.pop();
        }
    }
    helper(0, []);
    return results;
}

function getLength(data, a, b) {
    // Try both AB and BA keys for edge/diagonal
    const key1 = `${a}${b}`;
    const key2 = `${b}${a}`;
    if (typeof data[key1] === 'number') return data[key1];
    if (typeof data[key2] === 'number') return data[key2];
    // If not a number, try to parse as float if string
    if (data[key1] !== undefined) return parseFloat(data[key1]);
    if (data[key2] !== undefined) return parseFloat(data[key2]);
    return NaN;
}

export const steps = [

    {
        title: 'Step 0: Discrepancy & Top View',
        id: 'discrepancy',
        dependencies: [],
        isLive: false,
        isAsync: false,

        // ------------------- CALC FUNCTION -------------------
  calcFunction: (data) => {
    console.log('[SailSteps] zeroDiscrepancy.calcFunction input:', JSON.stringify(data, null, 2));

    const pointIds = Object.keys(data.points || {});
    const N = pointIds.length;
    const positions = {};

    const getH = (pid) => data.points?.[pid]?.height ?? 0;
    const getD = (a, b) => parseFloat(data[`${a}${b}`] || data[`${b}${a}`] || '0');

    if (N === 3) {
      const [p1, p2, p3] = pointIds;
      const d12 = getD(p1, p2);
      const d13 = getD(p1, p3);
      const d23 = getD(p2, p3);

      positions[p1] = { x: 0, y: 0, z: getH(p1) };
      positions[p2] = { x: d12, y: 0, z: getH(p2) };
      const x3 = (d13 ** 2 - d23 ** 2 + d12 ** 2) / (2 * d12);
      const y3 = Math.sqrt(Math.max(0, d13 ** 2 - x3 ** 2));
      positions[p3] = { x: x3, y: y3, z: getH(p3) };

    } else if (N === 4) {
      const [A, B, C, D] = pointIds;
      const dAB = getD(A, B);
      const dBC = getD(B, C);
      const dCD = getD(C, D);
      const dDA = getD(D, A);
      const dAC = getD(A, C);
      const dBD = getD(B, D);

      positions[A] = { x: 0, y: 0, z: getH(A) };
      positions[B] = { x: dAB, y: 0, z: getH(B) };

      const xC = (dAC ** 2 - dBC ** 2 + dAB ** 2) / (2 * dAB);
      const yC = Math.sqrt(Math.max(0, dAC ** 2 - xC ** 2));
      positions[C] = { x: xC, y: yC, z: getH(C) };

      const dx = xC, dy = yC;
      const d = Math.sqrt(dx * dx + dy * dy);
      const a = (dDA ** 2 - dCD ** 2 + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, dDA ** 2 - a * a));
      const xD = a * dx / d;
      const yD = a * dy / d;
      const rx = -dy * (h / d);
      const ry = dx * (h / d);
      positions[D] = { x: xD + rx, y: yD + ry, z: getH(D) };
    } else {
      const centerX = 500, centerY = 500, radius = 350;
      pointIds.forEach((pid, i) => {
        const angle = (2 * Math.PI * i) / N;
        positions[pid] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          z: getH(pid)
        };
      });
    }

    let result;
    if (pointIds.length >= 4) {
      const allCombos = getCombinations(pointIds, 4);
      const blameScores = {};
      const failingCombos = [];

      for (const combo of allCombos) {
        checkDiscrepancyCombo({ ...data, positions }, combo, blameScores, failingCombos);
      }

      const sorted = Object.entries(blameScores).sort((a, b) => b[1] - a[1]);
      const totalCombos = allCombos.length;
      const failedCombos = failingCombos.length;

      const topSuspects = sorted.slice(0, 3).map(([id, count]) =>
        `• ${id}: ${count} combos`
      ).join('\n');

      const confident =
        sorted.length > 1 && sorted[0][1] >= 3 && sorted[0][1] >= sorted[1][1] * 1.5;

      result = {
        discrepancy: failedCombos
          ? `⚠️ ${failedCombos} out of ${totalCombos} combinations show discrepancies.`
          : `✅ No discrepancies detected in any 4-point group.`,
        errorBD: failedCombos
          ? (
            pointIds.length === 4
              ? 'There is a discrepancy, but with only 4 points it is not possible to identify the specific problem.'
              : (confident && sorted.length > 0
                ? `Please check dimension ${sorted[0][0]} (${sorted[0][1]} combos)\n\nTop suspects:\n${topSuspects}`
                : `Please check dimensions:\n${topSuspects}`)
          )
          : ''
      };
    } else {
      result = {
        discrepancy: 'Not enough points for 4-point discrepancy check.',
        errorBD: ''
      };
    }

    const out = {
      positions,
      result,
    };

    console.log('[SailSteps] zeroDiscrepancy.calcFunction output:', JSON.stringify(out, null, 2));
    return out;
  },

        // ------------------- DRAW FUNCTION -------------------
        drawFunction: (ctx, virtualWidth, virtualHeight, data) => {
        console.log('[SailSteps] zeroDiscrepancy.drawFunction called with data:', JSON.stringify(data, null, 2));
        if (!data.positions) return;

        const pointIds = Object.keys(data.positions);
        if (pointIds.length === 0) return;

        // --- Compute bounding box and scaling ---
        // Order points so A is first and clockwise (if possible)
        let orderedIds = [...pointIds];
        if (orderedIds.includes('A')) {
            // Try to order clockwise: A, B, C, D, ...
            orderedIds = ['A'];
            let current = 'A';
            for (let i = 1; i < pointIds.length; i++) {
                // Find the next point (B, C, D, ...)
                const next = String.fromCharCode('A'.charCodeAt(0) + i);
                if (pointIds.includes(next)) orderedIds.push(next);
            }
            // Add any remaining points (for >4 points)
            for (const pid of pointIds) {
                if (!orderedIds.includes(pid)) orderedIds.push(pid);
            }
        }

        // Get min/max XY
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const pid of pointIds) {
            const p = data.positions[pid];
            if (!p) continue;
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }

        // Padding for canvas
        const pad = 40;
        const drawW = virtualWidth - 2 * pad;
        const drawH = virtualHeight - 2 * pad;
        const shapeW = maxX - minX || 1;
        const shapeH = maxY - minY || 1;
        const scale = Math.min(drawW / shapeW, drawH / shapeH);

        // Map positions to canvas coordinates, with A at top-left
        const mapped = {};
        for (const pid of pointIds) {
            const p = data.positions[pid];
            mapped[pid] = {
                x: pad + (p.x - minX) * scale,
                y: pad + (p.y - minY) * scale
            };
        }

        // Helper to get color for a line
        function getLineColor(a, b) {
            if (pointIds.length >= 5 && data.result && data.result.errorBD) {
                const suspects = data.result.errorBD.match(/[A-Z]{2}/g) || [];
                if (suspects.includes(`${a}${b}`) || suspects.includes(`${b}${a}`)) {
                    return 'red';
                }
            }
            return '#333';
        }

        ctx.clearRect(0, 0, virtualWidth, virtualHeight);
        ctx.save();
        ctx.font = '16px Arial';
        ctx.lineWidth = 2;

        // Draw all edges and diagonals with labels
        for (let i = 0; i < pointIds.length; i++) {
            for (let j = i + 1; j < pointIds.length; j++) {
                const a = pointIds[i], b = pointIds[j];
                const pa = mapped[a], pb = mapped[b];
                if (!pa || !pb) continue;

                // Draw line
                ctx.beginPath();
                ctx.strokeStyle = getLineColor(a, b);
                ctx.moveTo(pa.x, pa.y);
                ctx.lineTo(pb.x, pb.y);
                ctx.stroke();

                // Draw dimension label at midpoint
                const mx = (pa.x + pb.x) / 2;
                const my = (pa.y + pb.y) / 2;
                const key1 = `${a}${b}`;
                const key2 = `${b}${a}`;
                let val = data[key1] ?? data[key2];
                if (typeof val === 'number' && !isNaN(val)) {
                    ctx.save();
                    ctx.fillStyle = ctx.strokeStyle;
                    ctx.fillText(`${a}${b}: ${val}`, mx + 5, my - 5);
                    ctx.restore();
                }
            }
        }

        // Draw points and height labels
        for (const pid of orderedIds) {
            const p = mapped[pid];
            if (!p) continue;
            // Draw point
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#1976d2';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw label
            ctx.fillStyle = '#222';
            ctx.font = 'bold 18px Arial';
            ctx.fillText(pid, p.x + 12, p.y - 12);

            // Draw height label
            if (typeof data[`H${pid}`] === 'number' && !isNaN(data[`H${pid}`])) {
                ctx.font = '14px Arial';
                ctx.fillStyle = '#555';
                ctx.fillText(`H${pid}: ${data[`H${pid}`]}`, p.x + 12, p.y + 16);
            }
        }

        ctx.restore();
    }
    }

// ------------------- END OF STEPS -------------------
];
