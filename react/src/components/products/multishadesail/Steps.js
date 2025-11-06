export const Steps = [
  {
    title: "Step 0: Multi-sail Top View",
    id: "multi-discrepancy",
    dependencies: [],
    isLive: false,
    isAsync: false,

    calcFunction: (data) => {
      if (!Array.isArray(data.sails)) return data;

      data.sails = data.sails.map((sail) => {
        const pointCount = Number(sail.pointCount) || 0;
        const xyDistances = buildXYDistances(sail.dimensions || {}, sail.points || {});
        const positions = computeSailPositionsFromXY(pointCount, xyDistances);
        const edgeMeter = sumEdges(sail.dimensions || {}, pointCount);

        return {
          ...sail,
          xyDistances,
          positions,
          edgeMeter,
        };
      });

      return data;
    },

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
      });

      ctx.restore();
    },
  },
];

//
// ---------- helpers ----------
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
