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

export const zeroDiscrepancy = {
    title: 'Step 0: Discrepancy & Top View',
    id: 'discrepancy',
    dependencies: [],
    isLive: false,
    isAsync: false,

    // ------------------- CALC FUNCTION -------------------
    calcFunction: (data) => {
        console.log('[SailSteps] zeroDiscrepancy.calcFunction input:', JSON.stringify(data, null, 2));
        const allKeys = Object.keys(data);
        const pointIds = allKeys
            .filter((k) => k.startsWith('H') && typeof data[k] === 'number' && !isNaN(data[k]))
            .map((k) => k.slice(1));

        const N = pointIds.length;
        const centerX = 500, centerY = 500, radius = 350;
        data.positions = {};

        // --- Position calculation for 3 points (trilateration) ---
        if (pointIds.length === 3) {
            const [p1, p2, p3] = pointIds;
            const d12 = getLength(data, p1, p2);
            const d13 = getLength(data, p1, p3);
            const d23 = getLength(data, p2, p3);

            data.positions[p1] = { x: centerX, y: centerY, z: data[`H${p1}`] || 0 };
            data.positions[p2] = { x: centerX + d12, y: centerY, z: data[`H${p2}`] || 0 };
            let x3 = centerX + (d13 ** 2 - d23 ** 2 + d12 ** 2) / (2 * d12);
            let y3 = centerY + Math.sqrt(Math.max(0, d13 ** 2 - ((x3 - centerX) ** 2)));
            data.positions[p3] = { x: x3, y: y3, z: data[`H${p3}`] || 0 };
        } else {
            // fallback: place points in a circle for visualization
            pointIds.forEach((pid, i) => {
                const angle = (2 * Math.PI * i) / N;
                data.positions[pid] = {
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle),
                    z: data[`H${pid}`] || 0
                };
            });
        }

        // --- Discrepancy checks for all 4-point combos ---
        if (pointIds.length >= 4) {
          console.log('[SailSteps] Starting 4-point discrepancy checks for pointIds:', pointIds);
            const allCombos = getCombinations(pointIds, 4);
            const blameScores = {};
            const failingCombos = [];

            for (const combo of allCombos) {
                checkDiscrepancyCombo(data, combo, blameScores, failingCombos);
            }

            const sorted = Object.entries(blameScores).sort((a, b) => b[1] - a[1]);
            const totalCombos = allCombos.length;
            const failedCombos = failingCombos.length;

            const topSuspects = sorted.slice(0, 3).map(([id, count]) =>
                `• ${id}: ${count} combos`
            ).join('\n');

            const confident =
                sorted.length > 1 && sorted[0][1] >= 3 && sorted[0][1] >= sorted[1][1] * 1.5;

            data.result = {
                discrepancy: failedCombos
                    ? `⚠️ ${failedCombos} out of ${totalCombos} combinations show discrepancies.`
                    : `✅ No discrepancies detected in any 4-point group.`,
                errorBD: failedCombos
                    ? (confident
                        ? `Most likely issue: ${sorted[0][0]} (${sorted[0][1]} combos)\n\nTop suspects:\n${topSuspects}`
                        : `Top suspects:\n${topSuspects}`)
                    : ''
            };
            console.log('[SailSteps] zeroDiscrepancy.calcFunction result:', JSON.stringify(data.result, null, 2));
        } else {
            data.result = {
                discrepancy: 'Not enough points for 4-point discrepancy check.',
                errorBD: ''
            };
            console.log('[SailSteps] zeroDiscrepancy.calcFunction result:', JSON.stringify(data.result, null, 2));
        }

        console.log('[SailSteps] zeroDiscrepancy.calcFunction output data:', JSON.stringify(data, null, 2));
        return data;
    },

    // ------------------- DRAW FUNCTION -------------------
    drawFunction: (ctx, virtualWidth, virtualHeight, data) => {
      console.log('[SailSteps] zeroDiscrepancy.drawFunction called with data:', JSON.stringify(data, null, 2));
      if (!data.positions) return;

      const pointIds = Object.keys(data.positions);
      if (pointIds.length === 0) return;

      // Helper to get color for a line
      function getLineColor(a, b) {
          // If 5+ points and this line is a top suspect, draw in red
          if (pointIds.length >= 5 && data.result && data.result.errorBD) {
              const suspects = data.result.errorBD.match(/[A-Z]{2}/g) || [];
              if (suspects.includes(`${a}${b}`) || suspects.includes(`${b}${a}`)) {
                  return 'red';
              }
          }
          return '#333';
      }

      // Draw all points
      ctx.clearRect(0, 0, virtualWidth, virtualHeight);
      ctx.save();
      ctx.font = '16px Arial';
      ctx.lineWidth = 2;

      // Draw all edges and diagonals with labels
      for (let i = 0; i < pointIds.length; i++) {
          for (let j = i + 1; j < pointIds.length; j++) {
              const a = pointIds[i], b = pointIds[j];
              const pa = data.positions[a], pb = data.positions[b];
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
      for (const pid of pointIds) {
          const p = data.positions[pid];
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
};