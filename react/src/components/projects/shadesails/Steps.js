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
  const key1 = `${a}${b}`;
  const key2 = `${b}${a}`;
  return typeof data.dimensions?.[key1] === 'number'
    ? data.dimensions[key1]
    : data.dimensions?.[key2] ?? NaN;
}

function getHeight(data, pid) {
  return data.points?.[pid]?.height ?? NaN;
}

function computeDiscrepancy(points) {
  const [p1, p2, p3, p4] = points;

  const getLen = (a, b) => {
    if (!a || !b) return NaN;
    return typeof a.lengths?.[b.id] === 'number' ? a.lengths[b.id] : a.lengths?.[`${a.id}${b.id}`] ?? a.lengths?.[`${b.id}${a.id}`] ?? NaN;
  };

  const l12 = getLen(p1, p2);
  const l23 = getLen(p2, p3);
  const l34 = getLen(p3, p4);
  const l41 = getLen(p4, p1);
  const l13 = getLen(p1, p3);
  const l24 = getLen(p2, p4);

  const h1 = p1.height, h2 = p2.height, h3 = p3.height, h4 = p4.height;

  const lengths = [l12, l23, l34, l41, l13, l24];
  const heights = [h1, h2, h3, h4];
  if (lengths.some(isNaN) || heights.some(isNaN)) return null;

  try {
    const l12xy = Math.sqrt(Math.max(0, l12 ** 2 - (h2 - h1) ** 2));
    const l23xy = Math.sqrt(Math.max(0, l23 ** 2 - (h3 - h2) ** 2));
    const l34xy = Math.sqrt(Math.max(0, l34 ** 2 - (h4 - h3) ** 2));
    const l41xy = Math.sqrt(Math.max(0, l41 ** 2 - (h1 - h4) ** 2));
    const l13xy = Math.sqrt(Math.max(0, l13 ** 2 - (h3 - h1) ** 2));
    const l24xy = Math.sqrt(Math.max(0, l24 ** 2 - (h4 - h2) ** 2));

    const safeAcos = (x) => Math.acos(Math.min(1, Math.max(-1, x)));
    const angle123 = safeAcos((l13xy ** 2 + l12xy ** 2 - l23xy ** 2) / (2 * l13xy * l12xy));
    const angle134 = safeAcos((l13xy ** 2 + l41xy ** 2 - l34xy ** 2) / (2 * l13xy * l41xy));

    const p2x = l12xy * Math.cos(angle123);
    const p2y = l12xy * Math.sin(angle123);
    const p4x = l41xy * Math.cos(angle134);
    const p4y = -l41xy * Math.sin(angle134);

    const l24Teoric = Math.sqrt((p2x - p4x) ** 2 + (p2y - p4y) ** 2 + (h2 - h4) ** 2);
    const discrepancy = Math.abs(l24Teoric - l24);
    return discrepancy;
  } catch {
    return null;
  }
}


export const steps = [
  {
    title: 'Step 0: Discrepancy & Top View',
    id: 'discrepancy',
    dependencies: [],
    isLive: false,
    isAsync: false,
    calcFunction: (data) => {
      const pointIds = Object.keys(data.points || {});
      const N = pointIds.length;
      const getH = pid => getHeight(data, pid);
      const getD = (a, b) => getLength(data, a, b);

      const positions = {};

      if (N === 3) {
        const [p1, p2, p3] = pointIds;
        const d12 = getD(p1, p2), d13 = getD(p1, p3), d23 = getD(p2, p3);
        positions[p1] = { x: 0, y: 0, z: getH(p1) };
        positions[p2] = { x: d12, y: 0, z: getH(p2) };
        const x3 = (d13 ** 2 - d23 ** 2 + d12 ** 2) / (2 * d12);
        const y3 = Math.sqrt(Math.max(0, d13 ** 2 - x3 ** 2));
        positions[p3] = { x: x3, y: y3, z: getH(p3) };
      } else if (N === 4) {
        const [A, B, C, D] = pointIds;
        const dAB = getD(A, B), dBC = getD(B, C), dCD = getD(C, D), dDA = getD(D, A), dAC = getD(A, C);

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
        // Sort alphabetically to get assumed clockwise order
          const ordered = [...pointIds].sort();

          const A = ordered[0], B = ordered[1];
          const dAB = getD(A, B);

          if (!isFinite(dAB)) return positions;

          // Anchor A and B
          positions[A] = { x: 0, y: 0, z: getH(A) };
          positions[B] = { x: dAB, y: 0, z: getH(B) };

          for (let i = 2; i < N; i++) {
            const p1 = ordered[i - 2];
            const p2 = ordered[i - 1];
            const p3 = ordered[i];

            const d12 = getD(p1, p2);
            const d13 = getD(p1, p3);
            const d23 = getD(p2, p3);

            if (!isFinite(d12) || !isFinite(d13) || !isFinite(d23)) continue;
            if (!positions[p1] || !positions[p2]) continue;

            const { x: x1, y: y1 } = positions[p1];
            const { x: x2, y: y2 } = positions[p2];

            const dx = x2 - x1;
            const dy = y2 - y1;
            const base = Math.sqrt(dx * dx + dy * dy);
            if (base === 0) continue;

            const angle = Math.atan2(dy, dx);
            const x3_local = (d13 ** 2 - d23 ** 2 + base ** 2) / (2 * base);
            const y3_local_sq = d13 ** 2 - x3_local ** 2;
            if (y3_local_sq < 0) continue;
            const y3_local = Math.sqrt(y3_local_sq);

            // Rotate back to global coords
            const cosA = dx / base;
            const sinA = dy / base;

            const x3 = x1 + x3_local * cosA - y3_local * sinA;
            const y3 = y1 + x3_local * sinA + y3_local * cosA;

            positions[p3] = { x: x3, y: y3, z: getH(p3) };
          }
      }
      const discrepancy = {};


      const blame = {}; // key: "AB", value: blame score

      const addBlame = (a, b, amount = 1) => {
        const key = a < b ? `${a}${b}` : `${b}${a}`;
        blame[key] = (blame[key] || 0) + amount;
      };

      const addPointBlame = (p, amount = 1) => {
        const key = `H${p}`; // e.g., 'HA' for Point A's height
        blame[key] = (blame[key] || 0) + (amount * 0.5);
      };


      if (N >= 4) {
        const combos = getCombinations(pointIds, 4);
        for (const combo of combos) {
          const [p1, p2, p3, p4] = combo;

          const points = combo.map((pid) => ({
            id: pid,
            height: getH(pid),
            lengths: data.dimensions,
          }));

          const result = computeDiscrepancy(points);
          const key = combo.join('');

          if (typeof result === 'number') {
            discrepancy[key] = result;

            if (result > 10) { // Threshold for significant discrepancy
              // Edge blame (lengths)
              addBlame(p1, p2, result);
              addBlame(p2, p3, result);
              addBlame(p3, p4, result);
              addBlame(p4, p1, result);
              addBlame(p1, p3, result);
              addBlame(p2, p4, result);

              // Point blame (heights)
              addPointBlame(p1, result);
              addPointBlame(p2, result);
              addPointBlame(p3, result);
              addPointBlame(p4, result);
            }
          }
        }
      }

      const sortedBlame = Object.entries(blame)
        .sort((a, b) => b[1] - a[1])

      return { positions, discrepancy, sortedBlame };
    },




drawFunction: (ctx, data) => {
    console.log('[SailSteps] drawFunction with discrepancy labels');
    if (!data.positions) return;

    const pointIds = Object.keys(data.positions);
    if (pointIds.length === 0) return;

    let orderedIds = [...pointIds];
    if (orderedIds.includes('A')) {
        orderedIds = ['A'];
        for (let i = 1; i < pointIds.length; i++) {
            const next = String.fromCharCode('A'.charCodeAt(0) + i);
            if (pointIds.includes(next)) orderedIds.push(next);
        }
        for (const pid of pointIds) {
            if (!orderedIds.includes(pid)) orderedIds.push(pid);
        }
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pid of pointIds) {
        const p = data.positions[pid];
        if (!p) continue;
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }

    const pad = 40;
    const drawW = 1000 - 2 * pad;
    const drawH = 1000 - 2 * pad;
    const shapeW = maxX - minX || 1;
    const shapeH = maxY - minY || 1;
    const scale = Math.min(drawW / shapeW, drawH / shapeH);

    const mapped = {};
    for (const pid of pointIds) {
        const p = data.positions[pid];
        mapped[pid] = {
            x: pad + (p.x - minX) * scale,
            y: pad + (p.y - minY) * scale
        };
    }

    function getLineColor(a, b) {
        if (pointIds.length >= 5 && data.result && data.result.errorBD) {
            const suspects = data.result.errorBD.match(/[A-Z]{2}/g) || [];
            if (suspects.includes(`${a}${b}`) || suspects.includes(`${b}${a}`)) {
                return 'red';
            }
        }
        return '#333';
    }

    ctx.clearRect(0, 0, 1000, 1000);
    ctx.save();
    ctx.font = '16px Arial';
    ctx.lineWidth = 2;

    // Draw all edges and diagonals with labels
    for (let i = 0; i < pointIds.length; i++) {
        for (let j = i + 1; j < pointIds.length; j++) {
            const a = pointIds[i], b = pointIds[j];
            const pa = mapped[a], pb = mapped[b];
            if (!pa || !pb) continue;

            ctx.beginPath();
            ctx.strokeStyle = getLineColor(a, b);
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();

            const mx = (pa.x + pb.x) / 2;
            const my = (pa.y + pb.y) / 2;
            const key1 = `${a}${b}`, key2 = `${b}${a}`;
            let val = data.dimensions?.[key1] ?? data.dimensions?.[key2];
            if (typeof val === 'number' && !isNaN(val)) {
                ctx.save();
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fillText(`${a}${b}: ${val.toFixed(1)}`, mx + 5, my - 5);
                ctx.restore();
            }
        }
    }

    let ypos = 200

    // Draw discrepancy labels for each 4-point combo
    if (data.discrepancy) {
        ctx.fillStyle = '#b00020';
        ctx.font = '30px Arial';

        ctx.fillText(
          `Discrepancies:`,
          600,
          100
        );

        

        for (const [key, value] of Object.entries(data.discrepancy)) {
            if (key.length !== 4) continue;
            const [a, b, c, d] = key.split('');
            const p2 = mapped[b], p4 = mapped[d];
            if (!p2 || !p4) continue;

            const mx = (p2.x + p4.x) / 2;

            const diagKey1 = `${b}${d}`;
            const diagKey2 = `${d}${b}`;
            const measured = data.dimensions?.[diagKey1] ?? data.dimensions?.[diagKey2];
            const abs = Math.abs(value);
            const percent = measured ? ((abs / measured) * 100).toFixed(1) : '?';

            ctx.fillText(
                `${key}: ${abs.toFixed(1)}mm (${percent}%)`,
                600,
                ypos
            );

            ypos += 40;
        }
    }

    // Draw sorted blame values (edges and heights)
    if (data.sortedBlame) {
      
        ctx.fillText(`Blame:`, 600, ypos + 40);
        ypos += 80;

        for (const [key, value] of data.sortedBlame) {
            const label = key.length === 3 && key.startsWith('H')
                ? `Height ${key[1]}`
                : `${key[0]}–${key[1]}`;
            ctx.fillText(`${label}: ${value.toFixed(1)}`, 600, ypos);
            ypos += 40;
        }
    }

    // Draw points and height labels
    for (const pid of orderedIds) {
        const p = mapped[pid];
        if (!p) continue;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#1976d2';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#222';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(pid, p.x + 12, p.y - 12);

        const h = data[`H${pid}`];
        if (typeof h === 'number' && !isNaN(h)) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#555';
            ctx.fillText(`H${pid}: ${h}`, p.x + 12, p.y + 16);
        }
    }

    ctx.restore();
}

  }
];
  