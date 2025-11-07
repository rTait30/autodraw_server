export const Steps = [
  {
    title: "Step 0: Multi-sail Top View",
    id: "multi-discrepancy",
    dependencies: [],
    isLive: false,
    isAsync: false,



    // ------------------------------------------------------------------ CALCULATION ------------------------------------------------------------------------





    calcFunction: (data) => {
      if (!Array.isArray(data.sails)) return data;
      
      data.sails = data.sails.map((sail) => {
        const pointCount = Number(sail.pointCount) || 0;
        const xyDistances = buildXYDistances(sail.dimensions || {}, sail.points || {});
        const positions = computeSailPositionsFromXY(pointCount, xyDistances);
        const edgeMeter = sumEdges(sail.dimensions || {}, pointCount);

        let edgeMeterCeilMeters = 0;

        if (edgeMeter % 1000 < 200) {
          edgeMeterCeilMeters = Math.ceil(edgeMeter / 1000);
        } else {
          edgeMeterCeilMeters = Math.floor(edgeMeter / 1000);
        }

        return {
          ...sail,
          xyDistances,
          positions,
          edgeMeter,
          edgeMeterCeilMeters,
        };
      });

      let sailCalcs = [];

      for (const sail of data.sails) {

        let fabricPrice = getPriceByFabric("Rainbow Z16", sail.edgeMeterCeilMeters);

        const { discrepancies, blame } = computeDiscrepanciesAndBlame(
          sail.pointCount,
          sail.xyDistances,
          sail.points || {}
        );

        let maxDiscrepancy = 0;
        for (const key in discrepancies) {
          if (discrepancies[key] > maxDiscrepancy) {
            maxDiscrepancy = discrepancies[key];
          }
        }

        let discrepancyProblem = false;

        if (sail.fabricCategory === "ShadeCloth" && maxDiscrepancy > 70) { discrepancyProblem = true; }
        if (sail.fabricCategory === "PVC" && maxDiscrepancy > 20) { discrepancyProblem = true; }

        sailCalcs.push({
          edgeMeter: sail.edgeMeter || 0,
          edgeMeterCeilMeters: sail.edgeMeterCeilMeters || 0,
          fabricPrice: fabricPrice,
          discrepancies,
          blame,
          maxDiscrepancy,
          discrepancyProblem
        });
      }

      data.sailCalcs = sailCalcs;

      return data;
    },





    // ------------------------------------------------------------------ DRAWING ------------------------------------------------------------------------





    drawFunction: (ctx, data) => {
      const sails = data.sails || [];
      if (!sails.length) return;

      const canvasWidth = ctx.canvas.width || 1000;
      const canvasHeight = ctx.canvas.height || 1000;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#000";

      // half the old 500-high per sail
      const slotHeight = 1000;
      const pad = 100;

      sails.forEach((sail, idx) => {
        const positions = sail.positions || {};
        const points = sail.points || {};
        const ids = Object.keys(positions);
        if (!ids.length) return;

        // --- bounding box in local coords ---
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;

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

        const scale = Math.min(innerW / shapeW, innerH / shapeH);

        const topOffset = idx * slotHeight;

        const mapped = {};
        for (const [id, p] of Object.entries(positions)) {
          mapped[id] = {
            x: pad + (p.x - minX) * scale,
            y: topOffset + pad + (p.y - minY) * scale,
          };
        }

        // Outer shape: join points A, B, C, ... in order
        const ordered = [...ids].sort();

        ctx.beginPath();
        ordered.forEach((id, i) => {
          const p = mapped[id];


          if (!p) return;
          
          ctx.fillStyle = '#000';

          ctx.fillText(id, p.x, p.y);


          ctx.font = 'bold 30px Arial';

          if (!data.discrepancyChecker) {
            ctx.font = 'bold 20px Arial';
            ctx.fillText(`Fitting: ${points[id].cornerFitting}`, p.x - 100, p.y + 50);
            ctx.fillText(`Hardware: ${points[id].tensionHardware}`, p.x - 100, p.y + 80);
            ctx.fillText(`Allowance: ${points[id].tensionAllowance}`, p.x - 100, p.y + 110);
          }

          ctx.fillText(`Height: ${points[id].height}`, p.x - 100, p.y + 20);

          let y = 140;

          ctx.fillStyle = '#F00';

          if (sail.exitPoint === id) {
            ctx.fillText(`Exit Point`, p.x - 100, p.y + y);
            y += 30;
          }

          if (sail.logoPoint === id) {
            ctx.fillText(`Logo`, p.x - 100, p.y + y);
          }

          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        if (ordered.length > 1) {
          const first = mapped[ordered[0]];
          ctx.lineTo(first.x, first.y);
        }
        ctx.stroke();

        ctx.fillText("Max Discrepancy: " + (sail.sailCalcs[id].maxDiscrepancy || 0).toFixed(2) + " mm", pad, topOffset + slotHeight - 200);
        ctx.fillText("Discrepancy Problem: " + (sail.sailCalcs[id].discrepancyProblem ? "Yes" : "No"), pad, topOffset + slotHeight - 200 + 30);
      });

      ctx.restore();
    },
  },
];



//
// ------------------------------------------------------------------ HELPERS ------------------------------------------------------------------------
//





const sumEdges = (dimensions, pointCount) => {
  let total = 0;
  for (let i = 0; i < pointCount; i++) {
    const a = String.fromCharCode(65 + i); // A, B, C...
    const b = String.fromCharCode(65 + ((i + 1) % pointCount)); // next, wrap
    const key = `${a}${b}`;
    total += Number(dimensions[key]) || 0;
  }
  return total;
};

function buildXYDistances(dimensions = {}, points = {}) {
  const xyDistances = {};
  for (const key in dimensions) {
    if (key.length !== 2) continue;
    const [raw1, raw2] = key.split("");
    const [p1, p2] = [raw1, raw2].sort(); // normalize key
    const z1 = points[p1]?.height ?? 0;
    const z2 = points[p2]?.height ?? 0;
    const length = Number(dimensions[key]) || 0;
    const normKey = `${p1}${p2}`;
    xyDistances[normKey] = projectToXY(length, z1, z2);
  }
  return xyDistances;
}

function computeSailPositionsFromXY(pointCount, xyDistances) {
  const positions = {};
  if (!pointCount) return positions;

  // 3-point triangle
  if (pointCount === 3) {
    const A = "A",
      B = "B",
      C = "C";
    const AB = xyDistances["AB"] || 0;
    const BC = xyDistances["BC"] || 0;
    const AC = xyDistances["AC"] || 0;

    positions[A] = { x: 0, y: 0 };
    positions[B] = { x: AB, y: 0 };

    if (AB && AC) {
      const Cx = (AC ** 2 - BC ** 2 + AB ** 2) / (2 * AB);
      const Cy = Math.sqrt(Math.max(0, AC ** 2 - Cx ** 2));
      positions[C] = { x: Cx, y: Cy };
    }
    return positions;
  }

  // 4-point quadrilateral
  if (pointCount === 4) {
    const dAB = xyDistances["AB"] || 0;
    const dAC = xyDistances["AC"] || 0;
    const dAD = xyDistances["AD"] || 0;
    const dBC = xyDistances["BC"] || 0;
    const dBD = xyDistances["BD"] || 0;
    const dCD = xyDistances["CD"] || 0;

    const quad = placeQuadrilateral(dAB, dAC, dAD, dBC, dBD, dCD);

    positions["A"] = quad["A"];
    positions["B"] = quad["B"];
    positions["C"] = quad["C"];
    positions["D"] = quad["D"];

    return positions;
  }

  // 5+ points: use multi-box hinge layout like your original complex code
  return computePositionsForManySided(pointCount, xyDistances);
}

function computePositionsForManySided(N, xyDistances) {
  const positions = {};
  const boxes = generateBoxes(N, xyDistances);

  let currentAnchor = { x: 0, y: 0 };
  let globalAngleRad = 0;
  let prevTRangle = 0;
  let firstBoxPlaced = false;
  const tolerance = 1e-3;

  const boxNames = Object.keys(boxes);

  boxNames.forEach((boxName) => {
    const pts = boxes[boxName]; // e.g. [TL, TR, BR, BL]

    if (pts.length === 4) {
      const [TL, TR, BR, BL] = pts;

      const top = getDistXY(TL, TR, xyDistances);
      const left = getDistXY(TL, BL, xyDistances);
      const right = getDistXY(TR, BR, xyDistances);
      const bottom = getDistXY(BR, BL, xyDistances);
      const diagLeft = getDistXY(TR, BL, xyDistances);
      const diagRight = getDistXY(TL, BR, xyDistances);

      const angleTL = lawCosine(top, left, diagLeft);
      const angleTR = lawCosine(top, right, diagRight);

      if (!firstBoxPlaced) {
        const quadPositions = placeQuadrilateral(
          top,
          diagRight,
          left,
          right,
          diagLeft,
          bottom
        );

        const mapped = {
          [TL]: quadPositions["A"],
          [TR]: quadPositions["B"],
          [BR]: quadPositions["C"],
          [BL]: quadPositions["D"],
        };

        for (const key in mapped) {
          positions[key] = mapped[key];
        }

        currentAnchor = mapped[TR];
        prevTRangle = angleTR;
        firstBoxPlaced = true;
      } else {
        const hingeDeg = 180 - (prevTRangle + angleTL);
        const hingeRad = (hingeDeg * Math.PI) / 180;
        globalAngleRad += hingeRad;

        const genericPlaced = drawBoxAt(pts, xyDistances, currentAnchor, globalAngleRad);

        const mapped = {
          [TL]: genericPlaced["A"],
          [TR]: genericPlaced["B"],
          [BR]: genericPlaced["C"],
          [BL]: genericPlaced["D"],
        };

        for (const key in mapped) {
          const p = mapped[key];
          const old = positions[key];
          if (old) {
            const diff = Math.hypot(p.x - old.x, p.y - old.y);
            if (diff > tolerance) {
              // keep the new one; you could decide otherwise
            }
          }
          positions[key] = p;
        }

        currentAnchor = mapped[TR];
        prevTRangle = angleTR;
      }
    }

    if (pts.length === 3) {
      // triangle box at the end (odd N)
      const [A, B, C] = pts;
      const AB = getDistXY(A, B, xyDistances);
      const BC = getDistXY(B, C, xyDistances);
      const AC = getDistXY(A, C, xyDistances);

      const tri = {};
      tri["A"] = { x: 0, y: 0 };
      tri["B"] = { x: AB, y: 0 };

      const Cx = (AC ** 2 - BC ** 2 + AB ** 2) / (2 * AB);
      const Cy = Math.sqrt(Math.max(0, AC ** 2 - Cx ** 2));
      tri["C"] = { x: Cx, y: Cy };

      const triAngleA = lawCosine(AB, AC, BC);

      const hingeDeg = 180 - (prevTRangle + triAngleA);
      const hingeRad = (hingeDeg * Math.PI) / 180;
      globalAngleRad += hingeRad;

      const mappedTri = {};
      for (const [key, p] of Object.entries(tri)) {
        const rotated = rotatePointCounterclockwise(p.x, p.y, globalAngleRad);
        const realLabel = key === "A" ? A : key === "B" ? B : C;
        mappedTri[realLabel] = {
          x: rotated.x + currentAnchor.x,
          y: rotated.y + currentAnchor.y,
        };
      }

      for (const key in mappedTri) {
        positions[key] = mappedTri[key];
      }

      currentAnchor = mappedTri[B];
      prevTRangle = triAngleA;
    }
  });

  return positions;
}



function computeDiscrepanciesAndBlame(N, xyDistances, data) {
  const discrepancies = {};
  const blame = {};

  // Initialize blame for all dimensions as 0
  for (const key in xyDistances) {
    blame[key] = 0;
  }

  // Initialize blame for all point labels as 0
  for (const key in data.points) {
    blame[`${key}`] = 0;
  }

  if (N >= 4) {
    const combos = getFourPointCombosWithDims(N, xyDistances);

    combos.forEach((combo) => {
      console.log(combo.combo);
      console.log(combo.dims);

      const discrepancy = computeDiscrepancyXY(combo.dims);

      console.log(discrepancy);

      discrepancies[combo.combo] = discrepancy;

      if (discrepancy !== null && !isNaN(discrepancy)) {
        // For each blame key, check if it shares ALL characters with combo
        for (const blameKey in blame) {
          const allInside = [...blameKey].every((char) =>
            combo.combo.includes(char)
          );

          if (allInside) {
            if (blameKey.length === 2) {
              // edge/diagonal
              blame[blameKey] += discrepancy;
            } else {
              // point / height
              // TODO: could scale down height contribution if desired
              blame[blameKey] += discrepancy;
            }
          }
        }
      }
    });

    console.log(discrepancies);
    console.log(blame);
  }

  return { discrepancies, blame };
}

function getFourPointCombosWithDims(N, xyDimensions) {
  const labels = Array.from({ length: N }, (_, i) => String.fromCharCode(65 + i)); // ['A','B',...]
  
  // Generate all 4-point combos
  const combos = [];
  function helper(start, combo) {
    if (combo.length === 4) {
      combos.push([...combo]);
      return;
    }
    for (let i = start; i < labels.length; i++) {
      combo.push(labels[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);

  return combos.map(combo => {
    const [a, b, c, d] = combo;

    // These are the edges + diagonals we care about
    const pairs = [
      [a, b], [a, c], [a, d], [b, c], [b, d], [c, d]
    ];

    const dims = {};
    for (const [p1, p2] of pairs) {
      const alphaKey = [p1, p2].sort().join(''); // always alphabetical
      dims[alphaKey] = xyDimensions[alphaKey] ?? null;
    }

    return { combo: combo.join(''), dims };
  });
}

function computeDiscrepancyXY(dimensions) {
  const lengths = Object.values(dimensions);

  if (!lengths[0] || !lengths[1] || !lengths[2] || !lengths[3] || !lengths[4] || !lengths[5]) {

    return 0
  }

  // Naming consistent with your original code
  const l12xy = lengths[0]; // AB
  const l13xy = lengths[1]; // AC (diagonal)
  const l41xy = lengths[2]; // DA
  const l23xy = lengths[3]; // BC
  const l24xy = lengths[4]; // BD (diagonal)
  const l34xy = lengths[5]; // CD

  // --- Utility: Safe acos for numeric stability ---
  const safeAcos = (x) => Math.acos(Math.min(1, Math.max(-1, x)));

  // --- Step 1: Compute cosines of angles ---
  const cos123 = (l13xy ** 2 + l12xy ** 2 - l23xy ** 2) / (2 * l13xy * l12xy);
  const cos134 = (l13xy ** 2 + l41xy ** 2 - l34xy ** 2) / (2 * l13xy * l41xy);

  // --- Step 2: Get *unsigned* angles ---
  const angle123_unsigned = safeAcos(cos123);
  const angle134_unsigned = safeAcos(cos134);

  // --- Step 3: Determine *signed* angles ---
  // We assume CCW winding, so we flip sign if needed.
  // For a reflex angle, the "turn" should go beyond π.
  // Trick: if the quadrilateral is concave, the diagonals will cross differently.
  // We'll determine sign based on triangle inequality check:
  let angle123 = angle123_unsigned;
  let angle134 = angle134_unsigned;

  // OPTIONAL heuristic: detect reflex by checking if sum of opposite edges < diagonal
  const isReflex123 = (l12xy + l23xy < l13xy + 1e-9);
  const isReflex134 = (l41xy + l34xy < l13xy + 1e-9);

  if (isReflex123) angle123 = 2 * Math.PI - angle123_unsigned;
  if (isReflex134) angle134 = 2 * Math.PI - angle134_unsigned;

  // --- Step 4: Place points ---
  // P1 is at origin
  const p1x = 0, p1y = 0;
  // P3 is at (l13xy, 0) - baseline
  const p3x = l13xy, p3y = 0;

  // P2 is rotated CCW from baseline by angle123
  const p2x = l12xy * Math.cos(angle123);
  const p2y = l12xy * Math.sin(angle123);

  // P4 is rotated CW from baseline by angle134 (negative y direction)
  const p4x = l41xy * Math.cos(-angle134);
  const p4y = l41xy * Math.sin(-angle134);

  // --- Step 5: Compute theoretical BD distance ---
  const l24Theoric = Math.sqrt((p2x - p4x) ** 2 + (p2y - p4y) ** 2);

  const discrepancy = Math.abs(l24Theoric - l24xy);
  console.log("discrepancy", discrepancy);
  return discrepancy;
}

function getDistXY(a, b, xyDistances) {
  const k = [a, b].sort().join("");
  return xyDistances[k] || 0;
}

function projectToXY(length, z1, z2) {
  const dz = z2 - z1;
  return Math.sqrt(Math.max(0, length ** 2 - dz ** 2));
}

function lawCosine(a, b, c) {
  if (!a || !b || !c) return 0;
  const cos = (a ** 2 + b ** 2 - c ** 2) / (2 * a * b);
  const clamped = Math.max(-1, Math.min(1, cos));
  return Math.acos(clamped) * (180 / Math.PI);
}

function rotatePointCounterclockwise(x, y, angleRad) {
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  return {
    x: x * cosA - y * sinA,
    y: x * sinA + y * cosA,
  };
}

function placeQuadrilateral(dAB, dAC, dAD, dBC, dBD, dCD) {
  const pos = {};

  // A at origin, B on x-axis
  pos["A"] = { x: 0, y: 0 };
  pos["B"] = { x: dAB, y: 0 };

  // C using triangle ABC
  const xC = (dAC ** 2 - dBC ** 2 + dAB ** 2) / (2 * dAB);
  const yC = Math.sqrt(Math.max(0, dAC ** 2 - xC ** 2));
  pos["C"] = { x: xC, y: yC };

  // D from triangles ACD & A D length
  const dx = xC;
  const dy = yC;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;

  const a = (dAD ** 2 - dCD ** 2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, dAD ** 2 - a * a));
  const xD = (a * dx) / d;
  const yD = (a * dy) / d;

  const rx = (-dy * h) / d;
  const ry = (dx * h) / d;

  pos["D"] = { x: xD + rx, y: yD + ry };

  return pos;
}

function getPointLabel(i) {
  return String.fromCharCode(65 + i); // 0 -> A
}

function generateBoxes(N, dimensions) {
  const labels = Array.from({ length: N }, (_, i) => getPointLabel(i));
  const boxes = {};

  const boxCount = Math.floor((N - 2) / 2);

  // quadrilateral boxes around the perimeter
  for (let i = 0; i < boxCount; i++) {
    const name = getPointLabel(i);
    const topLeft = labels[i];
    const topRight = labels[i + 1];
    const bottomRight = labels[N - 1 - i - 1];
    const bottomLeft = labels[N - 1 - i];
    boxes[name] = [topLeft, topRight, bottomRight, bottomLeft];
  }

  // central triangle if odd number of points
  if (N % 2 !== 0) {
    const name = getPointLabel(boxCount);
    const mid = Math.floor(N / 2);
    boxes[name] = [labels[mid - 1], labels[mid], labels[mid + 1]];
  }

  return boxes;
}

function drawBoxAt(boxPts, dimensions, anchorPoint, globalAngleRad) {
  // boxPts = ['A','B','C','D'] in TL,TR,BR,BL order
  const dAB = getDistXY(boxPts[0], boxPts[1], dimensions);
  const dAC = getDistXY(boxPts[0], boxPts[2], dimensions);
  const dAD = getDistXY(boxPts[0], boxPts[3], dimensions);
  const dBC = getDistXY(boxPts[1], boxPts[2], dimensions);
  const dBD = getDistXY(boxPts[1], boxPts[3], dimensions);
  const dCD = getDistXY(boxPts[2], boxPts[3], dimensions);

  let placed = placeQuadrilateral(dAB, dAC, dAD, dBC, dBD, dCD);

  for (const key in placed) {
    const p = placed[key];
    const rotated = rotatePointCounterclockwise(p.x, p.y, globalAngleRad);

    placed[key] = {
      x: rotated.x + anchorPoint.x,
      y: rotated.y + anchorPoint.y,
    };
  }

  return placed;
}



function getPriceByFabric(fabric, edgeMeter) {

  if (edgeMeter < 15) {
    return pricelist[fabric][15];
  }

  return pricelist[fabric][edgeMeter] || 0;
}


const pricelist = {
  "Rainbow Z16": {
    15: 585, 16: 615, 17: 660, 18: 700, 19: 740, 20: 780,
    21: 840, 22: 890, 23: 940, 24: 990, 25: 1040, 26: 1100,
    27: 1160, 28: 1210, 29: 1280, 30: 1340, 31: 1400, 32: 1460,
    33: 1520, 34: 1580, 35: 1645, 36: 1710, 37: 1780, 38: 1850,
    39: 1910, 40: 1980, 41: 2060, 42: 2135, 43: 2210, 44: 2285,
    45: 2360, 46: 2435, 47: 2510, 48: 2585, 49: 2685, 50: 2770
  }
};
