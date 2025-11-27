

export const Steps = [
  {
    title: 'Step 0: Discrepancy & Top View',
    calcFunction: (data) => {
      // Placeholder: No calculations in this step

      // return {...data};

      for (const sail of data.products || []) {

        let attributes = sail.attributes || {};

        // Perimeter should include only adjacent edge dimensions (no diagonals).
        // Use sumEdges helper which walks A->B, B->C, ... last->A.
        const pointCount = attributes.pointCount || 0;
        attributes.perimeter = pointCount
          ? sumEdges(attributes.dimensions || {}, pointCount)
          : 0;

        if (attributes.perimeter % 1000 < 200) {
          attributes.edgeMeter = Math.floor(attributes.perimeter / 1000);
        }
        else {
          attributes.edgeMeter = Math.ceil(attributes.perimeter / 1000);
        }

        attributes.xyDistances = buildXYDistances(attributes.dimensions, attributes.points || {});

        attributes.positions = computeSailPositionsFromXY(attributes.pointCount, attributes.xyDistances);


        //DISCREPANCIES
        const { discrepancies, blame, boxProblems, discrepancyThreshold, reflex, reflexAngleValues } = computeDiscrepanciesAndBlame(attributes.pointCount, attributes.xyDistances, sail);
        attributes.discrepancies = discrepancies;
        attributes.blame = blame;
        attributes.boxProblems = boxProblems;
        attributes.hasReflexAngle = reflex === true; // store whether any reflex angle exists in evaluated boxes
        attributes.reflexAngleValues = reflexAngleValues; // map of point label -> angle (deg) for reflex angles (max if multiple)

        const discrepancyValues = Object.values(discrepancies || {}).map(v => Math.abs(v)).filter(v => isFinite(v));
        attributes.maxDiscrepancy = discrepancyValues.length > 0 ? Math.max(...discrepancyValues) : 0;

        attributes.discrepancyProblem = attributes.maxDiscrepancy > (discrepancyThreshold);


        attributes.totalTraceLength = 0;
        for (const point of attributes.traceCables || []) {
          attributes.totalTraceLength += Number(point["length"]) || 0;
        }

        attributes.totalTraceLengthCeilMeters = Math.ceil((attributes.totalTraceLength || 0) / 1000) || null;


        //MATERIALS
        attributes.fabricPrice = getPriceByFabric(attributes.fabricType, attributes.edgeMeter - (attributes.totalTraceLengthCeilMeters || 0));

        attributes.fittingCounts = {};

        for (const pointKey in attributes.points || {}) {
          const pt = attributes.points[pointKey];
          const fitting = pt.cornerFitting;
          if (fitting in attributes.fittingCounts) {
            attributes.fittingCounts[fitting]++;
          } else {
            attributes.fittingCounts[fitting] = 1;
          }
        }

        attributes.totalSailLength = 0;

        for (const edge of attributes.sailTracks || []) {
          const dim = Number(attributes.dimensions[edge]);
          if (isNaN(dim)) {
            console.warn("Missing or invalid dimension for edge:", edge, attributes.dimensions[edge]);
            continue;
          }
          attributes.totalSailLength += dim;
        }
        attributes.totalSailLengthCeilMeters = Math.ceil((attributes.totalSailLength || 0) / 1000) || null;


      }

      return {...data};

    },
    drawFunction: (ctx, data) => {
      const sails = data.products || [];
      if (!sails.length) return;

      const canvasWidth = ctx.canvas.width || 1000;
      const canvasHeight = ctx.canvas.height || 1000;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Light background for better visibility in dark mode
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#1a1a1a";

      // half the old 500-high per sail
      const slotHeight = 1000;
      const pad = 100;

      sails.forEach((sail, idx) => {

        let attributes = sail.attributes || {};

        const positions = attributes.positions || {};
        const points = attributes.points || {};
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

        const scale = Math.min(innerW / shapeW, innerH / shapeH) * 0.9;

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

        // Compute centroid of sail (average of vertex positions)
        let cx = 0, cy = 0;
        ordered.forEach(id => { cx += mapped[id].x; cy += mapped[id].y; });
        cx /= ordered.length || 1; cy /= ordered.length || 1;

        // Calculate label dimensions to adjust scale if needed
        const estimatedLabelWidth = 350; // approximate max width for labels
        const estimatedLabelHeight = data.discrepancyChecker ? 80 : 200; // height varies by content
        
        // Check if we need to add padding for labels in bounding box
        const labelPadding = Math.max(estimatedLabelWidth, estimatedLabelHeight) * 0.3;
        
        // Draw outer perimeter edges individually with proper colors
        for (let i = 0; i < ordered.length; i++) {
          const p1 = ordered[i];
          const p2 = ordered[(i + 1) % ordered.length];
          const pos1 = mapped[p1];
          const pos2 = mapped[p2];
          
          if (!pos1 || !pos2) continue;
          
          // Check if this edge belongs to a problematic box
          let isProblematicEdge = false;
          for (const boxKey in attributes.boxProblems || {}) {
            if (attributes.boxProblems[boxKey] && boxKey.includes(p1) && boxKey.includes(p2)) {
              isProblematicEdge = true;
              break;
            }
          }
          
          ctx.strokeStyle = isProblematicEdge ? '#F00' : '#1a1a1a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pos1.x, pos1.y);
          ctx.lineTo(pos2.x, pos2.y);
          ctx.stroke();
        }

        // Now draw point labels
        ordered.forEach((id, i) => {
          const p = mapped[id];
          if (!p) return;

          // Outward direction from centroid
          let vx = p.x - cx; let vy = p.y - cy;
          let vlen = Math.hypot(vx, vy) || 1;
          vx /= vlen; vy /= vlen;

          // Base outward anchor (distance from point) - reduced from 80 to 40
          const baseDist = 40; // closer to sail
          const lineSpacingLarge = 28; // spacing for large font lines
          const lineSpacingSmall = 18; // spacing for small font lines
          const anchorX = p.x + vx * baseDist;
          const anchorY = p.y + vy * baseDist;

          // Slight lateral offset to avoid overlapping edge if near horizontal/vertical
          // Use perpendicular vector
          const perpX = -vy; const perpY = vx;
          const lateral = 10; // reduced lateral shift
          const labelX = anchorX + perpX * lateral * 0.2;
          const labelY = anchorY + perpY * lateral * 0.2;

          // Draw primary point & height info with smaller fonts
          ctx.fillStyle = '#000';
          ctx.font = 'bold 28px Arial'; // reduced from 40px
          ctx.fillText(`Point ${id}`, labelX, labelY);
          if (points[id].height !== undefined && points[id].height !== "") {
            ctx.fillText(`Height: ${points[id].height}`, labelX, labelY + lineSpacingLarge);
          }

          let offsetY = labelY + lineSpacingLarge * 2; // next line start

          if (!data.discrepancyChecker) {
            ctx.font = 'bold 16px Arial'; // reduced from 20px
            ctx.fillText(`Fitting: ${points[id].cornerFitting}`, labelX, offsetY);
            offsetY += lineSpacingSmall;
            ctx.fillText(`Hardware: ${points[id].tensionHardware}`, labelX, offsetY);
            offsetY += lineSpacingSmall;
            ctx.fillText(`Allowance: ${points[id].tensionAllowance}`, labelX, offsetY);
            offsetY += lineSpacingSmall;
          }

          ctx.font = 'bold 16px Arial'; // reduced from 20px
          ctx.fillStyle = '#F00';
          if (attributes.exitPoint === id && !data.discrepancyChecker) {
            ctx.fillText(`Exit Point`, labelX, offsetY);
            offsetY += lineSpacingSmall;
          }
          if (attributes.logoPoint === id && !data.discrepancyChecker) {
            ctx.fillText(`Logo`, labelX, offsetY);
            offsetY += lineSpacingSmall;
          }
        });

        // Draw all connecting lines (edges and diagonals) with dimension labels
        ctx.lineWidth = 1;
        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px Arial';

        const drawnLines = new Set(); // To avoid drawing the same line twice
        
        // Helper to check if edge is part of outer perimeter
        const isPerimeterEdge = (p1, p2) => {
          const i1 = ordered.indexOf(p1);
          const i2 = ordered.indexOf(p2);
          if (i1 === -1 || i2 === -1) return false;
          return Math.abs(i1 - i2) === 1 || Math.abs(i1 - i2) === ordered.length - 1;
        };

        for (const edgeKey in attributes.dimensions) {


          if (edgeKey.length !== 2) continue;
          


          const dimValue = attributes.dimensions[edgeKey];

          if (dimValue === "" || dimValue === undefined || dimValue === null || isNaN(Number(dimValue))) {
            continue;
          }

          const [p1, p2] = edgeKey.split('');
          const lineKey = [p1, p2].sort().join(''); // Normalize key
          
          if (drawnLines.has(lineKey)) continue;
          drawnLines.add(lineKey);

          const pos1 = mapped[p1];
          const pos2 = mapped[p2];

          if (!pos1 || !pos2) continue;

          // Skip perimeter edges - they were already drawn above
          if (isPerimeterEdge(p1, p2)) {
            // Still add labels for perimeter edges, just skip drawing the line
          } else {
            // Draw diagonal/internal lines
            // Check if this line belongs to a problematic box
            let isProblematicLine = false;
            for (const boxKey in attributes.boxProblems || {}) {
              if (attributes.boxProblems[boxKey] && boxKey.includes(p1) && boxKey.includes(p2)) {
                isProblematicLine = true;
                break;
              }
            }

            // Set line color based on whether it's in a problematic box
            ctx.strokeStyle = isProblematicLine ? '#F00' : '#999';
            ctx.lineWidth = 1;

            // Draw the line
            ctx.beginPath();
            ctx.moveTo(pos1.x, pos1.y);
            ctx.lineTo(pos2.x, pos2.y);
            ctx.stroke();
          }

          // Calculate midpoint for label
          const midX = (pos1.x + pos2.x) / 2;
          const midY = (pos1.y + pos2.y) / 2;

          // Calculate angle of the line
          const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);

          // Get dimension value
          const label = `${edgeKey}: ${dimValue}mm`;

          // Save context, rotate, draw text, restore
          ctx.save();
          ctx.translate(midX, midY);
          ctx.rotate(angle);
          
          // Adjust text position slightly above the line
          ctx.fillText(label, 0, -5);
          
          ctx.restore();
        }

        // Restore original stroke style for other elements
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;

        attributes.discrepancyProblem ? ctx.fillStyle = '#F00' : ctx.fillStyle = '#000';

        let yPos = 500;

        if (data.discrepancyChecker) {

          yPos = 1050;
        }

        else {

          ctx.font = 'bold 16px Arial';
        }

        ctx.fillText("Max Discrepancy: " + (attributes.maxDiscrepancy || 0).toFixed(0) + " mm", pad, yPos);
        ctx.fillText("Discrepancy Problem: " + (attributes.discrepancyProblem ? "Yes" : "No"), pad, yPos + 30);
      
        if (attributes.pointCount >= 5) {

          yPos += 60;

          ctx.fillText('Discrepancies', pad, yPos);
          yPos += 30;

          let sortedDiscrepancies = Object.entries(attributes.discrepancies || {})
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, 10);

          sortedDiscrepancies.forEach(([edge, value], i) => {
            if (value > 0) {
              ctx.fillText(` - ${edge}: ${value.toFixed(0)} mm`, pad, yPos);
              yPos += 30;
            }
          });

          ctx.fillText('Blame', pad, yPos);
          yPos += 30;

          const blameEntries = Object.entries(attributes.blame || {});
          const blameGroups = new Map();
          blameEntries.forEach(([key, val]) => {
            const rounded = Math.abs(Number(val) || 0).toFixed(2);
            if (!blameGroups.has(rounded)) blameGroups.set(rounded, []);
            blameGroups.get(rounded).push(key);
          });

          const groupedSorted = Array.from(blameGroups.entries())
            .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
            .slice(0, 10);

          groupedSorted.forEach(([rounded, keys]) => {

            if (rounded > 1) {
              
              keys.sort();
              const label = keys.join(', ');
              ctx.fillText(` - ${label}: ${parseFloat(rounded).toFixed(0)} mm`, pad, yPos);
              yPos += 30;

            }
          });
        }
      
      });

      ctx.restore();
    },
  }
];


const pricelist = {
  "Rainbow Z16": {
    15: 585, 16: 615, 17: 660, 18: 700, 19: 740, 20: 780,
    21: 840, 22: 890, 23: 940, 24: 990, 25: 1040, 26: 1100,
    27: 1160, 28: 1220, 29: 1280, 30: 1340, 31: 1400, 32: 1460,
    33: 1520, 34: 1580, 35: 1645, 36: 1710, 37: 1780, 38: 1850,
    39: 1910, 40: 1980, 41: 2060, 42: 2135, 43: 2210, 44: 2285,
    45: 2360, 46: 2435, 47: 2510, 48: 2585, 49: 2685, 50: 2770
  },
  "Poly Fx": {
    15: 570, 16: 600, 17: 645, 18: 685, 19: 725, 20: 765,
    21: 815, 22: 875, 23: 925, 24: 975, 25: 1025, 26: 1085,
    27: 1145, 28: 1195, 29: 1265, 30: 1325, 31: 1385, 32: 1445,
    33: 1505, 34: 1565, 35: 1630, 36: 1695, 37: 1765, 38: 1835,
    39: 1895, 40: 1965, 41: 2045, 42: 2120, 43: 2195, 44: 2270,
    45: 2345, 46: 2420, 47: 2495, 48: 2570, 49: 2670, 50: 2755
  },
  "Extreme 32": {
    15: 650, 16: 690, 17: 740, 18: 795, 19: 845, 20: 895,
    21: 955, 22: 990, 23: 1065, 24: 1120, 25: 1170, 26: 1235,
    27: 1300, 28: 1350, 29: 1430, 30: 1495, 31: 1575, 32: 1635,
    33: 1700, 34: 1795, 35: 1895, 36: 1980, 37: 2055, 38: 2135,
    39: 2210, 40: 2290, 41: 2365, 42: 2450, 43: 2565, 44: 2655,
    45: 2720, 46: 2810, 47: 2905, 48: 2995, 49: 3085, 50: 3275
  },
  "Polyfab Xtra": {
    15: 740, 16: 790, 17: 830, 18: 885, 19: 935, 20: 990,
    21: 1065, 22: 1135, 23: 1195, 24: 1255, 25: 1325, 26: 1415,
    27: 1470, 28: 1530, 29: 1615, 30: 1680, 31: 1745, 32: 1810,
    33: 1875, 34: 1970, 35: 2075, 36: 2165, 37: 2255, 38: 2345,
    39: 2435, 40: 2520, 41: 2605, 42: 2670, 43: 2755, 44: 2825,
    45: 2925, 46: 3010, 47: 3105, 48: 3190, 49: 3265, 50: 3490
  },
  "Tensitech 480": {
    15: 670, 16: 720, 17: 785, 18: 835, 19: 885, 20: 940,
    21: 1015, 22: 1110, 23: 1180, 24: 1235, 25: 1285, 26: 1350,
    27: 1410, 28: 1470, 29: 1540, 30: 1600, 31: 1660, 32: 1720,
    33: 1780, 34: 1905, 35: 2010, 36: 2100, 37: 2185, 38: 2280,
    39: 2340, 40: 2440, 41: 2515, 42: 2595, 43: 2665, 44: 2735,
    45: 2810, 46: 2890, 47: 2980, 48: 3060, 49: 3245, 50: 3345
  },
  "Monotec 370": {
    15: 790, 16: 890, 17: 940, 18: 990, 19: 1050, 20: 1100,
    21: 1180, 22: 1220, 23: 1280, 24: 1340, 25: 1400, 26: 1470,
    27: 1540, 28: 1590, 29: 1670, 30: 1730, 31: 1790, 32: 1850,
    33: 1920, 34: 2015, 35: 2130, 36: 2200, 37: 2290, 38: 2380,
    39: 2460, 40: 2560, 41: 2635, 42: 2715, 43: 2790, 44: 2870,
    45: 2950, 46: 3025, 47: 3120, 48: 3210, 49: 3345, 50: 3645
  },
  "DriZ": {
    15: 890, 16: 960, 17: 1030, 18: 1150, 19: 1180, 20: 1255,
    21: 1365, 22: 1450, 23: 1535, 24: 1620, 25: 1710, 26: 1800,
    27: 1890, 28: 1985, 29: 2080, 30: 2180, 31: 2280, 32: 2380,
    33: 2485, 34: 2595, 35: 2705, 36: 2815, 37: 2930, 38: 3045,
    39: 3160, 40: 3280
  },
  "Bochini": {
    12: 780, 13: 840, 14: 915, 15: 985, 16: 1070, 17: 1160, 18: 1255, 19: 1460, 20: 1535,
    21: 1555, 22: 1665, 23: 1775, 24: 1885, 25: 1975, 26: 2085, 27: 2185, 28: 2295, 29: 2490,
    30: 2585, 31: 2785, 32: 2975, 33: 3160, 34: 3360, 35: 3580, 36: 3760, 37: 4030, 38: 4280,
    39: 4550, 40: 4815
  },
  "Bochini Blockout": {
    12: 815, 13: 915, 14: 955, 15: 995, 16: 1140, 17: 1255, 18: 1355, 19: 1460, 20: 1555,
    21: 1670, 22: 1795, 23: 1925, 24: 2065, 25: 2165, 26: 2300, 27: 2445, 28: 2590, 29: 2765,
    30: 2850, 31: 3040, 32: 3235, 33: 3430, 34: 3660, 35: 3890, 36: 4090, 37: 4375, 38: 4635,
    39: 4900, 40: 5190
  },
  "Mehler FR580": {
    12: 985, 13: 1075, 14: 1170, 15: 1265, 16: 1390, 17: 1520, 18: 1640, 19: 1780, 20: 1915,
    21: 2065, 22: 2215, 23: 2365, 24: 2530, 25: 2725, 26: 2915, 27: 3070, 28: 3280, 29: 3475,
    30: 3665, 31: 3820, 32: 4035, 33: 4220, 34: 4480, 35: 4740, 36: 4950, 37: 5190, 38: 5525,
    39: 5790, 40: 6040
  },
  "Ferrari 502S2": {
    12: 955, 13: 1045, 14: 1135, 15: 1230, 16: 1355, 17: 1490, 18: 1625, 19: 1760, 20: 1910,
    21: 2045, 22: 2200, 23: 2355, 24: 2535, 25: 2715, 26: 2890, 27: 3045, 28: 3270, 29: 3470,
    30: 3645, 31: 3810, 32: 4030, 33: 4220, 34: 4475, 35: 4720, 36: 4950, 37: 5230, 38: 5495,
    39: 5760, 40: 6030
  },
  "Ferrari 502V3": {
    12: 1010, 13: 1115, 14: 1205, 15: 1305, 16: 1460, 17: 1590, 18: 1740, 19: 1905, 20: 2030,
    21: 2215, 22: 2380, 23: 2575, 24: 2745, 25: 2950, 26: 3145, 27: 3320, 28: 3540, 29: 3775,
    30: 3975, 31: 4140, 32: 4375, 33: 4580, 34: 4870, 35: 5145, 36: 5405, 37: 5700, 38: 5990,
    39: 6290, 40: 6575
  }
};

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
  const boxProblems = {};

  // Will be set true if ANY quadrilateral evaluated has a reflex angle (concave)
  let reflex = false;
  // Aggregate of reflex angle values across all examined quadrilaterals; if a point appears multiple times keep max angle
  const reflexAngleValues = {};

  // Determine threshold from fabric category
  let discrepancyThreshold = 100;
  const fabricCategory = data?.attributes?.fabricCategory;
  if (fabricCategory === "PVC") {
    discrepancyThreshold = 20;
  } else if (fabricCategory === "ShadeCloth") {
    discrepancyThreshold = 70;
  }

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

      const { discrepancy, reflex: reflexObj, angles, reflexAngles } = computeDiscrepancyXY(combo.dims);

      console.log(discrepancy);

      discrepancies[combo.combo] = discrepancy;

      // Determine if any reflex angles in this quadrilateral
      const quadHasReflex = Object.values(reflexObj).some(v => v === true);
      if (quadHasReflex) reflex = true;

      // Merge reflex angle values (store maximum if repeated)
      for (const [label, angleDeg] of Object.entries(reflexAngles)) {
        if (angleDeg == null) continue;
        if (!(label in reflexAngleValues) || angleDeg > reflexAngleValues[label]) {
          reflexAngleValues[label] = angleDeg;
        }
      }

      // Mark problem boxes and only attribute blame for those
      const isProblem = discrepancy !== null && isFinite(discrepancy) && discrepancy > discrepancyThreshold;
      if (isProblem) {
        boxProblems[combo.combo] = true;

        // For each blame key, check if it shares ALL characters with combo
        for (const blameKey in blame) {
          const allInside = [...blameKey].every((char) => combo.combo.includes(char));
          if (allInside) {
            // edge/diagonal or point/height; both aggregate full discrepancy
            blame[blameKey] += discrepancy;
          }
        }
      }
    });

    console.log(discrepancies);
    console.log(blame);
  }

  return { discrepancies, blame, boxProblems, discrepancyThreshold, reflex, reflexAngleValues };
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

  if (lengths.length < 6 || lengths.some(v => !v)) {
    return { discrepancy: 0, reflex: {}, angles: {}, reflexAngles: {} };
  }

  // AB, AC, AD, BC, BD, CD  (your existing ordering)
  const AB = lengths[0];
  const AC = lengths[1];
  const AD = lengths[2];
  const BC = lengths[3];
  const BD = lengths[4];
  const CD = lengths[5];

  const safeAcos = (x) => Math.acos(Math.min(1, Math.max(-1, x)));

  // ------------------------------------------------------
  // 1) Reconstruct the quadrilateral in 2D
  // ------------------------------------------------------

  // Fixed baseline: A = (0,0), C = (AC, 0)
  const A = { x: 0,     y: 0 };
  const C = { x: AC,    y: 0 };

  // ---- Compute angle at A for triangle ABC
  const cosA_ABC = (AB*AB + AC*AC - BC*BC) / (2 * AB * AC);
  let angleA_ABC = safeAcos(cosA_ABC);

  // Coordinates of B in the upper half-plane
  const B = {
    x: AB * Math.cos(angleA_ABC),
    y: AB * Math.sin(angleA_ABC)
  };

  // ---- Compute angle at A for triangle ADC
  const cosA_ADC = (AD*AD + AC*AC - CD*CD) / (2 * AD * AC);
  let angleA_ADC = safeAcos(cosA_ADC);

  // Coordinates of D: choose lower half-plane
  const D = {
    x: AD * Math.cos(angleA_ADC),
    y: -AD * Math.sin(angleA_ADC)
  };

  // ------------------------------------------------------
  // 2) Compute theoretical BD distance for discrepancy
  // ------------------------------------------------------
  const BD_theory = Math.sqrt(
    (B.x - D.x) ** 2 + (B.y - D.y) ** 2
  );

  const discrepancy = Math.abs(BD_theory - BD);

  // ------------------------------------------------------
  // 3) Compute internal angles at A, B, C, D
  // ------------------------------------------------------
  function angleAt(P, Q, R) {
    // angle at Q formed by QP and QR
    const v1 = { x: P.x - Q.x, y: P.y - Q.y };
    const v2 = { x: R.x - Q.x, y: R.y - Q.y };

    const dot = v1.x*v2.x + v1.y*v2.y;
    const m1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
    const m2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);

    let ang = Math.acos(Math.min(1, Math.max(-1, dot / (m1*m2))));
    return ang;
  }

  // Convex or reflex is determined *by the polygon orientation*
  const Aang = angleAt(D, A, B);
  const Bang = angleAt(A, B, C);
  const Cang = angleAt(B, C, D);
  const Dang = angleAt(C, D, A);

  // ------------------------------------------------------
  // 4) Determine reflex angles
  // ------------------------------------------------------
  // In a quadrilateral exactly one will exceed 180° if concave.

  // In a quadrilateral exactly one will exceed 180° if concave.
  function isReflex(aRad) {
    return aRad > Math.PI; 
  }

  const angles = {
    A: Aang * 180 / Math.PI,
    B: Bang * 180 / Math.PI,
    C: Cang * 180 / Math.PI,
    D: Dang * 180 / Math.PI
  };

  const reflex = {
    A: isReflex(Aang),
    B: isReflex(Bang),
    C: isReflex(Cang),
    D: isReflex(Dang)
  };

  // Only include angles that are reflex in reflexAngles
  const reflexAngles = Object.fromEntries(Object.entries(angles).filter(([label, deg]) => reflex[label]));

  return {
    discrepancy,
    reflex,
    angles,
    reflexAngles
  };

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

  // Two possible positions for D (one on each side of line AC)
  const D1 = { x: xD + rx, y: yD + ry };
  const D2 = { x: xD - rx, y: yD - ry };

  // Calculate BD distance for both positions
  const dist1 = Math.sqrt((D1.x - pos["B"].x) ** 2 + (D1.y - pos["B"].y) ** 2);
  const dist2 = Math.sqrt((D2.x - pos["B"].x) ** 2 + (D2.y - pos["B"].y) ** 2);

  // Choose the position that best matches the given BD distance
  pos["D"] = Math.abs(dist1 - dBD) < Math.abs(dist2 - dBD) ? D1 : D2;

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

  console.log("Getting price for fabric:", fabric, "edgeMeter:", edgeMeter);

  if (edgeMeter < 15) {
    return pricelist[fabric][15];
  }

  return pricelist[fabric][edgeMeter] || 0;
}
