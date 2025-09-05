function computeDiscrepancyXY(dimensions) {
  const lengths = Object.values(dimensions);

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


function getPointLabel(i) {
  return String.fromCharCode(65 + i); // A, B, C...
}


function projectToXY(length, z1, z2) {
  const dz = z2 - z1;
  return Math.sqrt(Math.max(0, length ** 2 - dz ** 2));
}

function lawCosine(a, b, c) {
  const cos = (a ** 2 + b ** 2 - c ** 2) / (2 * a * b);
  return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
}

function signedAngleDegrees(v1, v2) {
  const [x1, y1] = v1;
  const [x2, y2] = v2;

  const dot = x1 * x2 + y1 * y2;         // dot product
  const det = x1 * y2 - y1 * x2;         // z-component of cross product
  const angleRad = Math.atan2(det, dot); // returns -π..π
  let angleDeg = angleRad * (180 / Math.PI);

  // Normalize to 0–360°
  if (angleDeg < 0) angleDeg += 360;
  return angleDeg;
}

function polygonAngle(A, B, C) {
  // Build vectors BA and BC (from B)
  const BA = [A.x - B.x, A.y - B.y];
  const BC = [C.x - B.x, C.y - B.y];

  // Compute full signed angle
  return signedAngleDegrees(BA, BC);
}

function generateBoxes(N, dimensions) {
  const labels = Array.from({ length: N }, (_, i) => getPointLabel(i));
  const boxes = {};

  const boxCount = Math.floor((N - 2) / 2);

  for (let i = 0; i < boxCount; i++) {
    const name = getPointLabel(i);
    const topLeft = labels[i];
    const topRight = labels[i + 1];
    const bottomRight = labels[N - 1 - i - 1];
    const bottomLeft = labels[N - 1 - i];
    boxes[name] = [topLeft, topRight, bottomRight, bottomLeft];
  }

  if (N % 2 !== 0) {
    const name = getPointLabel(boxCount);
    const mid = Math.floor(N / 2);
    boxes[name] = [
      labels[mid - 1],
      labels[mid],
      labels[mid + 1]
    ];
  }

  // Logging each box and edge dimensions
  for (const [boxName, pts] of Object.entries(boxes)) {
    console.log(`\nBox ${boxName}: ${pts.join('-')}`);

    // Get all pairwise distances between points in the box
    const dims = {};
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        const key = `${a}${b}`;
        const revKey = `${b}${a}`;
        const value = dimensions[key] ?? dimensions[revKey];
        dims[key] = value;
      }
    }

    console.log('Distances:', dims);

    if (pts.length === 4) {
      console.log("Quadrilateral");

      // Sort points alphabetically to standardize their roles
      const [TL, TR, BR, BL] = [...pts].sort(); // top-left, top-right, bottom-right, bottom-left

      const top = dimensions[`${TL}${TR}`] ?? dimensions[`${TR}${TL}`];
      const left = dimensions[`${TL}${BL}`] ?? dimensions[`${BL}${TL}`];
      const diagLeft = dimensions[`${TR}${BL}`] ?? dimensions[`${BL}${TR}`];

      const right = dimensions[`${TR}${BR}`] ?? dimensions[`${BR}${TR}`];
      const diagRight = dimensions[`${TL}${BR}`] ?? dimensions[`${BR}${TL}`];

      const angle1 = lawCosine(top, left, diagLeft);   // at TL
      const angle2 = lawCosine(top, right, diagRight); // at TR

      console.log(`Angle 1 (top-left @ ${TL}): ${angle1.toFixed(2)}°`);
      console.log(`Angle 2 (top-right @ ${TR}): ${angle2.toFixed(2)}°`);
    }
  }

  return boxes;
}

function rotatePointCounterclockwise(x, y, angleRad) {
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  return {
    x: x * cosA - y * sinA,
    y: x * sinA + y * cosA
  };
}

function placeQuadrilateral(dAB, dAC, dAD, dBC, dBD, dCD, rotateAngle = 0) {
  let boxPositions = {};

  // Place base points
  boxPositions["A"] = { x: 0, y: 0 };
  boxPositions["B"] = { x: dAB, y: 0 };

  const xC = (dAC ** 2 - dBC ** 2 + dAB ** 2) / (2 * dAB);
  const yC = Math.sqrt(Math.max(0, dAC ** 2 - xC ** 2));
  boxPositions["C"] = { x: xC, y: yC };

  const dx = xC, dy = yC;
  const d = Math.sqrt(dx * dx + dy * dy);
  const a = (dAD ** 2 - dCD ** 2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, dAD ** 2 - a * a));
  const xD = a * dx / d;
  const yD = a * dy / d;
  const rx = -dy * (h / d);
  const ry = dx * (h / d);
  boxPositions["D"] = { x: xD + rx, y: yD + ry };

  // ✅ Rotate all points clockwise around A if rotateAngle ≠ 0
  if (rotateAngle !== 0) {
    for (const key in boxPositions) {
      const p = boxPositions[key];
      const rotated = rotatePointCounterclockwise(p.x, p.y, rotateAngle);
      boxPositions[key] = rotated;
    }
  }

  return boxPositions;
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

function drawBoxAt(boxPts, dimensions, anchorPoint, globalAngleRad) {
  // boxPts = ['A','B','C','D']
  // dimensions has all distances (AB, BC, etc.)

  // Get required distances for quadrilateral placement
  const dAB = dimensions[`${boxPts[0]}${boxPts[1]}`] ?? dimensions[`${boxPts[1]}${boxPts[0]}`];
  const dAC = dimensions[`${boxPts[0]}${boxPts[2]}`] ?? dimensions[`${boxPts[2]}${boxPts[0]}`];
  const dAD = dimensions[`${boxPts[0]}${boxPts[3]}`] ?? dimensions[`${boxPts[3]}${boxPts[0]}`];
  const dBC = dimensions[`${boxPts[1]}${boxPts[2]}`] ?? dimensions[`${boxPts[2]}${boxPts[1]}`];
  const dBD = dimensions[`${boxPts[1]}${boxPts[3]}`] ?? dimensions[`${boxPts[3]}${boxPts[1]}`];
  const dCD = dimensions[`${boxPts[2]}${boxPts[3]}`] ?? dimensions[`${boxPts[3]}${boxPts[2]}`];

  // Place the box flat (TL = origin)
  let placed = placeQuadrilateral(dAB, dAC, dAD, dBC, dBD, dCD);

  // Rotate each point CCW by the globalAngleRad
  for (const key in placed) {
    const p = placed[key];
    const rotated = rotatePointCounterclockwise(p.x, p.y, globalAngleRad);

    // Then translate relative to the anchor point
    placed[key] = {
      x: rotated.x + anchorPoint.x,
      y: rotated.y + anchorPoint.y
    };
  }

  return placed;
}

export const Steps = [
  {
    title: 'Step 0: Discrepancy & Top View',
    id: 'discrepancy',
    dependencies: [],
    isLive: false,
    isAsync: false,
    calcFunction: (data) => {

      // ------ FORMAT ------

      /*

      colour: "Black"
​
      dimensions: Object { AB: 100, BC: 200, CD: 300, … }
      ​​
        AB: 100
        ​​
        AC: 200
        ​​
        AD: 200
        ​​
        BC: 200
        ​​
        BD: 200
        ​​
        BE: 200
        ​​
        CD: 300
        ​​
        CE: 200
        ​​
        DE: 300
        ​​
        EA: 300
      ​
      exitPoint: "A"
      ​
      fabricType: "ShadeCloth"
      ​
      logo: "A"
      ​
      pointCount: 5
      ​
      points: Object { A: {…}, B: {…}, C: {…}, … }
      ​​
        A: Object { height: 5, fixingType: "M8 Bowshackle", tensionAllowance: 50 }
        ​​
        B: Object { height: 5, fixingType: "M8 Bowshackle", tensionAllowance: 50 }
        ​​
        C: Object { height: 5, fixingType: "M8 Bowshackle", tensionAllowance: 50 }
        ​​
        D: Object { height: 5, fixingType: "M8 Bowshackle", tensionAllowance: 50 }
        ​​
        E: Object { height: 5, fixingType: "M8 Bowshackle", tensionAllowance: 50 }
      ​
      sailtracks: Array []
      ​​
      length: 0

      */

      const edgeMeter = Object.values(data.dimensions).reduce((sum, value) => sum + value, 0);

      const edgeMeterCeilMeters = Math.ceil(edgeMeter / 1000);

      console.log('Total edgeMeter:', edgeMeter);

      const xyDistances = {};

      // Normalize keys (e.g., "BA" -> "AB") and project to 2D
      for (const key in data.dimensions) {
        const [raw1, raw2] = key.split('');
        const [p1, p2] = [raw1, raw2].sort(); // Normalize
        const z1 = data.points[p1]?.height ?? 0;
        const z2 = data.points[p2]?.height ?? 0;
        const length = data.dimensions[key];

        const normKey = `${p1}${p2}`;
        xyDistances[normKey] = projectToXY(length, z1, z2);
      }

      console.log(`xy dimensions: ${JSON.stringify(xyDistances)}`);

      const positions = {};
      const N = data.pointCount;
      console.log(`pointCount: ${N}`);
      const pointIds = Object.keys(data.points || {});
      console.log(`points: ${pointIds}`);

      const discrepancies = {};

      const blame = {};

      // Add all dimensions as 0
      for (const key in xyDistances) {
        blame[key] = 0;
      }

      for (const key in data.points) {

        blame [`${key}`] = 0;
      }

      if (N >= 4) {
        
        const combos = getFourPointCombosWithDims(N, xyDistances);

        combos.forEach(combo => {
          console.log(combo.combo);
          console.log(combo.dims);

          const discrepancy = computeDiscrepancyXY(combo.dims)

          console.log(discrepancy);

          discrepancies[combo.combo] = discrepancy

          if (discrepancy !== null && !isNaN(discrepancy)) {
            // For each blame key, check if it shares ANY character with combo
            for (const blameKey in blame) {
              const allInside = [...blameKey].every(char => combo.combo.includes(char));

              if (allInside) {
                blame[blameKey] += discrepancy;
              }
            }
          }
        });

        console.log(discrepancies);

        console.log(blame);
      }

      
      
      let boxes = null;

      // Triangle layout using normalized XY-projected distances
      if (N === 3) {
        positions["A"] = { x: 0, y: 0 };
        positions["B"] = { x: xyDistances["AB"], y: 0 };

        const AB = xyDistances["AB"];
        const BC = xyDistances["BC"];
        const CA = xyDistances["AC"];

        const Cx = (CA ** 2 - BC ** 2 + AB ** 2) / (2 * AB);
        const Cy = Math.sqrt(Math.max(0, CA ** 2 - Cx ** 2));

        positions["C"] = { x: Cx, y: Cy };
      
      } else if (N === 4) {
        const quadPositions = placeQuadrilateral(
          xyDistances["AB"],
          xyDistances["AC"],
          xyDistances["AD"],
          xyDistances["BC"],
          xyDistances["BD"],
          xyDistances["CD"]
        );

        // Merge the returned A,B,C,D into positions
        Object.assign(positions, quadPositions);
      }
        
      else {
        // For N >= 5
        boxes = generateBoxes(N, xyDistances);
        console.log("Generated boxes:", boxes);

        let currentAnchor = { x: 0, y: 0 }; // start at origin
        let globalAngleRad = 0;
        let prevTRangle = 0;
        let firstBoxPlaced = false;
        let kOffset = 0; // cumulative offset

        const tolerance = 1e-3; // tolerance for detecting conflicting coords

        const boxNames = Object.keys(boxes);
        console.log("Box order:", boxNames);

        boxNames.forEach((boxName, idx) => {
          const pts = boxes[boxName]; 
          console.log(`\n=== Processing Box ${boxName} (#${idx}) ===`);
          console.log(`Points in this box: ${pts.join(", ")}`);

          if (pts.length === 4) {
            const [TL, TR, BR, BL] = pts;

            // Extract needed distances
            const top = xyDistances[`${TL}${TR}`] ?? xyDistances[`${TR}${TL}`];
            const left = xyDistances[`${TL}${BL}`] ?? xyDistances[`${BL}${TL}`];
            const right = xyDistances[`${TR}${BR}`] ?? xyDistances[`${BR}${TR}`];
            const diagLeft = xyDistances[`${TR}${BL}`] ?? xyDistances[`${BL}${TR}`];
            const diagRight = xyDistances[`${TL}${BR}`] ?? xyDistances[`${BR}${TL}`];
            const bottom = xyDistances[`${BR}${BL}`] ?? xyDistances[`${BL}${BR}`];

            console.log(`Distances for Box ${boxName}:`);
            console.log(`  top(${TL}-${TR}): ${top}`);
            console.log(`  left(${TL}-${BL}): ${left}`);
            console.log(`  right(${TR}-${BR}): ${right}`);
            console.log(`  bottom(${BR}-${BL}): ${bottom}`);
            console.log(`  diagLeft(${TR}-${BL}): ${diagLeft}`);
            console.log(`  diagRight(${TL}-${BR}): ${diagRight}`);

            const angleTL = lawCosine(top, left, diagLeft);
            const angleTR = lawCosine(top, right, diagRight);

            console.log(`  angleTL @${TL}: ${angleTL.toFixed(2)}°`);
            console.log(`  angleTR @${TR}: ${angleTR.toFixed(2)}°`);

            if (!firstBoxPlaced) {
              console.log("Placing FIRST box flat at origin");

              // Place first box flat
              const quadPositions = placeQuadrilateral(
                top,
                diagRight,
                left,
                right,
                diagLeft,
                bottom
              );

              // ✅ Map ABCD → TL,TR,BR,BL
              const mappedPositions = {
                [TL]: quadPositions["A"],
                [TR]: quadPositions["B"],
                [BR]: quadPositions["C"],
                [BL]: quadPositions["D"]
              };

              console.log("\nMapped FIRST box positions:");
              for (const key in mappedPositions) {
                const pos = mappedPositions[key];
                console.log(`  ${key}: (x=${pos.x.toFixed(3)}, y=${pos.y.toFixed(3)})`);
              }

              // Merge but check for conflicts
              for (const key in mappedPositions) {
                if (positions[key]) {
                  const old = positions[key];
                  const p = mappedPositions[key];
                  const diff = Math.hypot(p.x - old.x, p.y - old.y);
                  if (diff > tolerance) {
                    console.warn(`⚠ Overwriting ${key} with different coords! Δ=${diff.toFixed(3)}mm`);
                  }
                }
                positions[key] = mappedPositions[key];
              }

              // Set current anchor at TR
              currentAnchor = mappedPositions[TR];
              prevTRangle = angleTR;
              firstBoxPlaced = true;

              // kOffset adjustment for first box
              const diffFrom45 = (Math.PI / 4) - (angleTR * Math.PI/180);
              kOffset += diffFrom45;
              console.log(`First box TR angle diff from 45°: ${(diffFrom45 * 180 / Math.PI).toFixed(2)}°, cumulative kOffset now ${(kOffset * 180 / Math.PI).toFixed(2)}°`);
              console.log(`First box TR(${TR}) becomes anchor:`, currentAnchor);

            } else {
              // Compute hinge angle: 180° - (prev TR + current TL)
              const hingeDeg = 180 - (prevTRangle + angleTL);
              const hingeRad = (hingeDeg * Math.PI) / 180;
              console.log(`Hinge angle = 180 - (${prevTRangle.toFixed(2)} + ${angleTL.toFixed(2)}) = ${hingeDeg.toFixed(2)}°`);

              // Accumulate global rotation
              globalAngleRad += hingeRad;
              console.log(`Global rotation now: ${(globalAngleRad * 180 / Math.PI).toFixed(2)}°`);

              // Place this box relative to current anchor
              const genericPlaced = drawBoxAt(pts, xyDistances, currentAnchor, globalAngleRad);

              // ✅ Map generic ABCD → actual TL,TR,BR,BL
              const mappedPositions = {
                [TL]: genericPlaced["A"],
                [TR]: genericPlaced["B"],
                [BR]: genericPlaced["C"],
                [BL]: genericPlaced["D"]
              };

              console.log(`Placed box ${boxName} mapped:`);
              for (const key in mappedPositions) {
                const pos = mappedPositions[key];
                console.log(`  ${key}: (x=${pos.x.toFixed(3)}, y=${pos.y.toFixed(3)})`);
              }

              // Merge with conflict check
              for (const key in mappedPositions) {
                if (positions[key]) {
                  const old = positions[key];
                  const p = mappedPositions[key];
                  const diff = Math.hypot(p.x - old.x, p.y - old.y);
                  if (diff > tolerance) {
                    console.warn(`⚠ Overwriting ${key} with different coords! Δ=${diff.toFixed(3)}mm`);
                  }
                }
                positions[key] = mappedPositions[key];
              }

              // Update anchor + prev TR angle
              currentAnchor = mappedPositions[TR];
              prevTRangle = angleTR;
              console.log(`Box ${boxName} TR(${TR}) becomes new anchor:`, currentAnchor);

              // ✅ For subsequent boxes add TL angle to kOffset
              kOffset += angleTL * Math.PI/180;
              console.log(`Added TL angle ${(angleTL).toFixed(2)}°, cumulative kOffset now ${(kOffset * 180 / Math.PI).toFixed(2)}°`);
            }
          }

          if (pts.length === 3) {
            console.log(`Box ${boxName} is a TRIANGLE`);

            const [A, B, C] = pts;
            const AB = xyDistances[`${A}${B}`] ?? xyDistances[`${B}${A}`];
            const BC = xyDistances[`${B}${C}`] ?? xyDistances[`${C}${B}`];
            const AC = xyDistances[`${A}${C}`] ?? xyDistances[`${C}${A}`];

            console.log(`Triangle distances: AB=${AB}, BC=${BC}, AC=${AC}`);

            // Place triangle flat
            let tri = {};
            tri["A"] = { x: 0, y: 0 };
            tri["B"] = { x: AB, y: 0 };
            const Cx = (AC ** 2 - BC ** 2 + AB ** 2) / (2 * AB);
            const Cy = Math.sqrt(Math.max(0, AC ** 2 - Cx ** 2));
            tri["C"] = { x: Cx, y: Cy };

            // Calculate internal angle at A
            const triAngleA = lawCosine(AB, AC, BC);
            console.log(`Triangle internal angle @${A}: ${triAngleA.toFixed(2)}°`);

            // ✅ Compute hinge relative to prevTRangle, same as quads
            const hingeDeg = 180 - (prevTRangle + triAngleA);
            const hingeRad = (hingeDeg * Math.PI) / 180;
            globalAngleRad += hingeRad;
            console.log(`Triangle hinge rotates by ${hingeDeg.toFixed(2)}°, global rotation now ${(globalAngleRad*180/Math.PI).toFixed(2)}°`);

            // You can still track kOffset if needed
            kOffset += triAngleA * Math.PI/180;
            console.log(`Triangle added ${triAngleA.toFixed(2)}° to kOffset, cumulative ${(kOffset*180/Math.PI).toFixed(2)}°`);

            console.log(`Triangle local coords: A=(0,0), B=(${AB},0), C=(${Cx.toFixed(2)},${Cy.toFixed(2)})`);

            // Rotate + translate triangle into place relative to current anchor
            const mappedTri = {};
            for (const [key, p] of Object.entries(tri)) {
              const rotated = rotatePointCounterclockwise(p.x, p.y, globalAngleRad);
              mappedTri[
                key === "A" ? A : key === "B" ? B : C
              ] = {
                x: rotated.x + currentAnchor.x,
                y: rotated.y + currentAnchor.y
              };
            }

            console.log(`Triangle ${boxName} placed at:`, mappedTri);

            // Merge with conflict check
            for (const key in mappedTri) {
              if (positions[key]) {
                const old = positions[key];
                const p = mappedTri[key];
                const diff = Math.hypot(p.x - old.x, p.y - old.y);
                if (diff > tolerance) {
                  console.warn(`⚠ Overwriting ${key} with different coords! Δ=${diff.toFixed(3)}mm`);
                }
              }
              positions[key] = mappedTri[key];
            }

            // Update currentAnchor & prevTRangle
            currentAnchor = mappedTri[B]; // hinge next? depends on which should be next anchor
            prevTRangle = triAngleA; // last internal angle becomes prev for completeness
          }

        });

        console.log(`\n=== FINAL cumulative kOffset: ${(kOffset * 180 / Math.PI).toFixed(2)}° ===`);
        console.log("\n=== FINAL positions ===", positions);
      }


      let fabricPrice = getPriceByFabric(data.edgeMeterCeilMeters, data.fabricType);


      return {
        edgeMeter,
        edgeMeterCeilMeters,
        positions,
        discrepancies,
        blame,
        fabricPrice,
        ...(boxes ? { boxes } : {})
      };
    },




    drawFunction: (ctx, data) => {

      

        ctx.clearRect(0, 0, 1000, 1000);
        ctx.save();
        ctx.font = '32px Arial';
        ctx.lineWidth = 2;

        let ypos = 1000;

        ctx.fillStyle = '#b00020';

        if (data.discrepancies) {
          ctx.fillText(
            `Discrepancies:`,
            100,
            ypos
          );

          ypos += 60;

          // Convert discrepancies object → array of [key, value] pairs and sort by absolute value
          const sortedDiscrepancies = Object.entries(data.discrepancies)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])); // descending by abs diff

          const discrepanciesWithValues = sortedDiscrepancies.filter(([_, value]) => value);

          if (discrepanciesWithValues.length === 0) {
            ctx.fillText("Provide all dimensions and heights for discrepancy", 100, ypos);
          } else {
            discrepanciesWithValues.forEach(([key, value]) => {
              const [a, b, c, d] = key.split('');
              const dimKey = `${b}${d}`;
              const measured = data.dimensions?.[dimKey];

              const abs = Math.abs(value);
              const percent = measured ? ((abs / measured) * 100).toFixed(1) : '?';

              ctx.fillText(
                `${key}: ${abs.toFixed(1)}mm (${percent}%)`,
                100,
                ypos
              );

              ypos += 40;
            });
          }
        }

        ypos += 100;

        if (data.blame) {
          ctx.fillText(
            `Blame:`,
            100,
            ypos
          );

          ypos += 60;
          // Convert blame object → array of [key, value] pairs
          const sortedBlame = Object.entries(data.blame)
            .sort((a, b) => b[1] - a[1]); // descending by score

          sortedBlame.forEach(([key, value]) => {
            const text = `${key}: ${value.toFixed(2)}`;
            
            // Example: draw on canvas
            ctx.fillText(text, 100, ypos);

            // Move down for next entry
            ypos += 40;
          });
        }

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
        for (const [pid, p] of Object.entries(data.positions)) {
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
    }
  }
];


const priceList = {
  1: { // Category 1 - Coolshade / Commercial 95
    15: 490, 16: 530, 17: 570, 18: 610, 19: 650,
    20: 690, 21: 730, 22: 770, 23: 810, 24: 850,
    25: 900, 26: 950, 27: 1005, 28: 1060, 29: 1115,
    30: 1170, 31: 1230, 32: 1290, 33: 1350, 34: 1410,
    35: 1475, 36: 1530, 37: 1605, 38: 1650, 39: 1710,
    40: 1775, 41: 1840, 42: 1910, 43: 1980, 44: 2050,
    45: 2125, 46: 2195, 47: 2270, 48: 2345, 49: 2420,
    50: 2505
  },
  2: { // Category 2 - Rainbow Z16 / Dual Shade / Comm 95FR / Comm Heavy 430
    15: 565, 16: 605, 17: 645, 18: 685, 19: 725,
    20: 765, 21: 825, 22: 875, 23: 925, 24: 975,
    25: 1025, 26: 1085, 27: 1145, 28: 1205, 29: 1265,
    30: 1325, 31: 1385, 32: 1445, 33: 1505, 34: 1565,
    35: 1630, 36: 1695, 37: 1765, 38: 1835, 39: 1905,
    40: 1975, 41: 2050, 42: 2120, 43: 2195, 44: 2270,
    45: 2350, 46: 2430, 47: 2510, 48: 2590, 49: 2670,
    50: 2755
  },
  3: { // Category 3 - Extreme 32
    15: 645, 16: 685, 17: 725, 18: 765, 19: 815,
    20: 870, 21: 925, 22: 985, 23: 1040, 24: 1100,
    25: 1160, 26: 1225, 27: 1285, 28: 1350, 29: 1415,
    30: 1485, 31: 1560, 32: 1630, 33: 1700, 34: 1770,
    35: 1840, 36: 1915, 37: 1980, 38: 2050, 39: 2130,
    40: 2190, 41: 2270, 42: 2350, 43: 2435, 44: 2520,
    45: 2605, 46: 2690, 47: 2780, 48: 2870, 49: 2960,
    50: 3115
  },
  4: { // Category 4 - Monotec 370 / Comm Heavy 430FR / Polyfab Xtra / Extrablock FR
    15: 775, 16: 825, 17: 875, 18: 925, 19: 975,
    20: 1035, 21: 1095, 22: 1145, 23: 1235, 24: 1285,
    25: 1385, 26: 1435, 27: 1535, 28: 1605, 29: 1675,
    30: 1735, 31: 1805, 32: 1875, 33: 1945, 34: 2020,
    35: 2100, 36: 2180, 37: 2250, 38: 2335, 39: 2430,
    40: 2515, 41: 2605, 42: 2700, 43: 2795, 44: 2885,
    45: 2960, 46: 3050, 47: 3160, 48: 3250, 49: 3360,
    50: 3550
  },
  5: { // Category 5 - Weather Resistant Shade Sail (DriZ)
    15: 890, 16: 960, 17: 1030, 18: 1105, 19: 1180,
    20: 1255, 21: 1365, 22: 1450, 23: 1535, 24: 1620,
    25: 1710, 26: 1800, 27: 1890, 28: 1985, 29: 2080,
    30: 2180, 31: 2280, 32: 2380, 33: 2485, 34: 2595,
    35: 2705, 36: 2815, 37: 2930, 38: 3045, 39: 3160,
    40: 3280
  }
};

// Helper function to get price by edge meter & category
function getPrice(edgeMeter, category) {
  const catPrices = priceList[category];
  if (!catPrices) {
    console.warn(`Invalid category: ${category}`);
    return null;
  }

  // Get all available edge meter keys for the category
  const edgeKeys = Object.keys(catPrices).map(Number).sort((a, b) => a - b);
  const minEdge = edgeKeys[0];
  const maxEdge = edgeKeys[edgeKeys.length - 1];

  // If below the lowest edge, use the lowest
  if (edgeMeter <= minEdge) {
    return catPrices[minEdge];
  }

  // If exact match, return directly
  if (catPrices[edgeMeter] !== undefined) {
    return catPrices[edgeMeter];
  }

  // If above highest, you can choose:
  // 1) use the highest value (clamp)
  // 2) or return null / throw warning
  // Here we'll just use the highest available
  if (edgeMeter >= maxEdge) {
    return catPrices[maxEdge];
  }

  // Otherwise, you could choose to:
  // - round down to the nearest available key
  // - or round up
  // - or interpolate (optional)
  //
  // For now, we'll just round down:
  const lowerEdge = edgeKeys.reduce((prev, curr) => (curr <= edgeMeter ? curr : prev), minEdge);
  return catPrices[lowerEdge];
}

const fabricToCategory = {
  "Coolshade": 1,
  "Commercial 95": 1,
  "Rainbow Z16": 2,
  "Dual Shade": 2,
  "Comm 95FR": 2,
  "Comm Heavy 430": 2,
  "Extreme 32": 3,
  "Monotec 370": 4,
  "Comm Heavy 430FR": 4,
  "Polyfab Xtra": 4,
  "Extrablock FR": 4,
  "DriZ": 5 // Weather Resistant Shade Sail
};

function getPriceByFabric(edgeMeter, fabricName) {
  const category = fabricToCategory[fabricName];
  if (!category) {
    console.warn(`Unknown fabric: ${fabricName}`);
    return null;
  }
  return getPrice(edgeMeter, category);
}
