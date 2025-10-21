

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

      //console.log('Total edgeMeter:', edgeMeter);

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
                if (blameKey.length == 2) {
                  blame[blameKey] += discrepancy;
                }

                else {

                  //it might help to scale down the height blame contribution since heights arent generally as error-prone as lengths
                  blame[blameKey] += discrepancy;
                }
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

      console.log("dimensions:", data.dimensions);
      
      const edgeMeter = sumEdges(data.dimensions, data.pointCount);

      const edgeMeterCeilMeters = Math.ceil(edgeMeter / 1000);

      data.edgeMeter = edgeMeter;
      data.edgeMeterCeilMeters = edgeMeterCeilMeters;

      console.log("fabric type:", data.fabricType, "edgeMeterCeilMeters:", edgeMeterCeilMeters);

      let fabricPrice = getPriceByFabric(data.fabricType, edgeMeterCeilMeters);

      console.log("fabricPrice:", fabricPrice);

      data.fabricPrice = fabricPrice;

      let fittingCounts = {};

      for (const point of Object.values(data.points)) {
        const { cornerFitting } = point;
        if (cornerFitting) {
          fittingCounts[cornerFitting] = (fittingCounts[cornerFitting] || 0) + 1;
        }
      }

      data.fittingCounts = fittingCounts;

      console.log("sailTracks:", data.sailTracks);

      let totalSailLength = 0;
      for (const sailTrack of data.sailTracks || []) {
        totalSailLength += data.dimensions[sailTrack] || 0;
      }

      data.totalSailLength = totalSailLength;

      let totalSailLengthCeilMeters = Math.ceil(totalSailLength / 1000);

      data.totalSailLengthCeilMeters = totalSailLengthCeilMeters;

      let discrepancyProblem = false;

      console.log("Fabric category:", data.fabricCategory);

      let allowance = 40;

      if (data.fabricCategory === "ShadeCloth") {
        allowance = 80;
      } else if (data.fabricCategory === "PVC") {
        allowance = 40;
      }
      
      if (allowance === 0) {
        console.warn("Unknown fabric category, cannot set discrepancy allowance");
      }

      console.log(discrepancies)

      for (const key in discrepancies) {

        console.log(`Checking discrepancy ${key}: ${discrepancies[key]} against allowance ${allowance}`);

        if (discrepancies[key] > allowance) {
          discrepancyProblem = key;
          break;
        }
      }

      let cablePrice = 0;

      

      //data.edgeMeter = edgeMeter
      //data.edgeMeterCeilMeters = edgeMeterCeilMeters,
      data.positions = positions,
      data.discrepancies = discrepancies,
      data.blame = blame
      data.fabricPrice = fabricPrice,
      data.discrepancyProblem = discrepancyProblem,
      data.boxes = boxes

      return data;
    },




    drawFunction: (ctx, data) => {

      

        ctx.clearRect(0, 0, 1000, 1000);
        ctx.save();
        ctx.font = '32px Arial';
        ctx.lineWidth = 2;

        let ypos = 200;

        ctx.fillStyle = '#b00020';

        if (data.discrepancies) {

// Convert discrepancies object → array of [key, value] pairs and sort by absolute value
          const sortedDiscrepancies = Object.entries(data.discrepancies)
          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5); // descending by abs diff

          if (data.discrepancyProblem) {

            ctx.fillStyle = 'red';
            ctx.font = 'bold 40px Arial';
            ctx.fillText(
              `Discrepancy too high for ${data.fabricCategory} (${data.discrepancyProblem})`,
              50,
              100
            );
            ctx.font = '32px Arial';

            if (data.pointCount > 4) {

              ctx.fillText(
                "Possible Cause",
                100,
                200
              ) 

              ypos += 60;

              const sortedBlame = Object.entries(data.blame || {})
              .sort((a, b) => Number(b[1]) - Number(a[1])); // descending by score

              sortedBlame.slice(0, 5).forEach(([key, rawValue]) => {
                const value = Number(rawValue);

                if (key.length === 1) {
                  ctx.fillText(`Height ${key}`, 100, ypos);
                } else if (key.length === 2) {
                  ctx.fillText(`Dimension ${key} `, 100, ypos);
                }

                ypos += 40; // Move down for next entry
              });
            }

            ypos += 40;
          }
          else {

            ctx.fillStyle = 'green';
            ctx.fillText(
              `Maximum Discrepancy: ${Math.max(...Object.values(data.discrepancies)).toFixed(1)}mm`,
              100,
              800
            );
          }
          ctx.fillText(
            `Discrepancies:`,
            100,
            ypos
          );

          ypos += 60;

          

          const discrepanciesWithValues = sortedDiscrepancies.filter(([_, value]) => value);

          if (discrepanciesWithValues.length === 0) {
            ctx.fillText("Provide all dimensions and heights to calculate discrepancy", 100, ypos);
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

        ypos = 200;

        if (data.blame) {
          ctx.fillText(
            `Blame:`,
            600,
            ypos
          );

          ypos += 60;
          // Convert blame object → array of [key, value] pairs
          
          const sortedBlame = Object.entries(data.blame)
            .sort((a, b) => Number(b[1]) - Number(a[1])); // descending by score

          for (const [key, rawValue] of sortedBlame.slice(0, 10)) {
            const value = Number(rawValue);
            ctx.fillText(
              `${key}: ${value.toFixed(2)}`,
              600,
              ypos
            );
            ypos += 40;
          }
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
            y: 1000 + pad + (p.y - minY) * scale
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


const pricelist = {
  "Rainbow Z16": {
    15: 585, 16: 615, 17: 660, 18: 700, 19: 740, 20: 780,
    21: 840, 22: 890, 23: 940, 24: 990, 25: 1040, 26: 1100,
    27: 1160, 28: 1210, 29: 1280, 30: 1340, 31: 1400, 32: 1460,
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
    15: 890, 16: 960, 17: 1030, 18: 1105, 19: 1180, 20: 1255,
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

function getPriceByFabric(fabric, edgeMeter) {

  if (edgeMeter < 15) {
    return pricelist[fabric][15];
  }

  return pricelist[fabric][edgeMeter] || 0;
}


const sumEdges = (dimensions, pointCount) => {
  let total = 0;
  for (let i = 0; i < pointCount; i++) {
    const a = String.fromCharCode(65 + i);                // A, B, C...
    const b = String.fromCharCode(65 + ((i + 1) % pointCount)); // next point, wraps around
    const key = `${a}${b}`;
    total += Number(dimensions[key]) || 0;
  }
  return total;
};


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
