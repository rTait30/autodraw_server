export function validate3DEdges(points, edgeLengthsObj, maxSlope = 3.0) {
    let invalid = false;

    const edgeEntries = Object.entries(edgeLengthsObj); // e.g. { "A-B": 7 }

    // 1. Triangle inequality check
    for (let i = 0; i < edgeEntries.length; i++) {
        const [thisKey, thisLen] = edgeEntries[i];
        const othersSum = edgeEntries.reduce(
            (sum, [key, len], j) => i === j ? sum : sum + len,
            0
        );

        if (thisLen >= othersSum) {
            invalid = true;
            const input = document.querySelector(`input[name="edge-${thisKey}"]`);
            if (input) input.classList.add('input-error');
        } else {
            const input = document.querySelector(`input[name="edge-${thisKey}"]`);
            if (input) input.classList.remove('input-error');
        }
    }

    // 2. Optional slope warning only (3D lengths already account for height)
    for (const [key, len] of edgeEntries) {
        const match = key.match(/^([A-Z])-([A-Z])$/);
        if (!match) continue;

        const [, from, to] = match;
        const dz = Math.abs(points[from].height - points[to].height);

        if (dz > len) {
            console.warn(`Invalid: vertical difference (${dz}) exceeds edge length (${len})`);
            const warning = document.getElementById('warning');
            if (warning) warning.innerText += " " + warning;
            invalid = true;
            const input = document.querySelector(`input[name="edge-${key}"]`);
            if (input) input.classList.add('input-error');
        } else {
            // Optional slope warning
            const horizontalLength = Math.sqrt(len*len - dz*dz);
            const slope = dz / (horizontalLength || 1);
            if (slope > maxSlope) {
                console.warn(`Warning: steep edge ${key} (slope ≈ ${slope.toFixed(2)})`);
            }
        }
    }

    const warning = document.getElementById('edgeWarning');
    if (warning) {
        warning.style.display = invalid ? 'block' : 'none';
    }
}

export function getShadeSailCoords(Points, Edges, Diagonals) {
    const coords = {};
    const placed = new Set();
    const allPoints = Object.keys(Points);

    function getDistance(p1, p2) {
        return Edges[`${p1}-${p2}`] || Edges[`${p2}-${p1}`] ||
               Diagonals[`${p1}-${p2}`] || Diagonals[`${p2}-${p1}`];
    }

    function getEdge(p1, p2) {
        return Edges[`${p1}-${p2}`] || Edges[`${p2}-${p1}`];
    }

    function getDiagonal(p1, p2) {
        return Diagonals[`${p1}-${p2}`] || Diagonals[`${p2}-${p1}`];
    }

    function triangleCheck(r1, r2, base, tolerance = 0.02) {
        const min = Math.abs(r1 - r2) * (1 - tolerance);
        const max = (r1 + r2) * (1 + tolerance);
        return base > min && base < max;
    }

    if (allPoints.length < 2) return null;

    const A = allPoints[0];
    coords[A] = { x: 0, y: 0, z: Points[A]?.height ?? 0 };
    placed.add(A);

    const B = allPoints.find(p => p !== A && getDistance(A, p));
    if (!B) return null;

    const AB = getDistance(A, B);
    coords[B] = { x: AB, y: 0, z: Points[B]?.height ?? 0 };
    placed.add(B);

    let progressMade = true;
    while (placed.size < allPoints.length && progressMade) {
        progressMade = false;

        for (const P of allPoints) {
            if (placed.has(P)) continue;

            const knownPairs = Array.from(placed).flatMap(p1 =>
                Array.from(placed).filter(p2 => p2 !== p1).map(p2 => [p1, p2])
            );

            let bestPair = null;
            let bestD1 = null;
            let bestD2 = null;

            for (const [p1, p2] of knownPairs) {
                const edge1 = getEdge(p1, P);
                const edge2 = getEdge(p2, P);
                const diag1 = getDiagonal(p1, P);
                const diag2 = getDiagonal(p2, P);

                if (edge1 && edge2) {
                    bestPair = [p1, p2];
                    bestD1 = edge1;
                    bestD2 = edge2;
                    break;
                } else if ((edge1 && diag2) || (diag1 && edge2)) {
                    bestPair = [p1, p2];
                    bestD1 = edge1 || diag1;
                    bestD2 = edge2 || diag2;
                }
            }

            if (!bestPair) continue;

            const [p1, p2] = bestPair;
            const p1Coord = coords[p1];
            const p2Coord = coords[p2];

            const z1 = p1Coord.z ?? 0;
            const z2 = p2Coord.z ?? 0;
            const zP = Points[P]?.height ?? 0;

            const dz1 = zP - z1;
            const dz2 = zP - z2;

            const r1Squared = bestD1 ** 2 - dz1 ** 2;
            const r2Squared = bestD2 ** 2 - dz2 ** 2;
            if (r1Squared < 0 || r2Squared < 0) continue;

            const r1 = Math.sqrt(r1Squared);
            const r2 = Math.sqrt(r2Squared);

            const dx = p2Coord.x - p1Coord.x;
            const dy = p2Coord.y - p1Coord.y;
            const dz = p2Coord.z - p1Coord.z;
            const d3 = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (!triangleCheck(r1, r2, d3)) continue;

            const a = (r1 ** 2 - r2 ** 2 + d3 ** 2) / (2 * d3);
            const hSquared = r1 ** 2 - a ** 2;
            if (hSquared < 0) continue;

            const h = Math.sqrt(hSquared);
            const px = p1Coord.x + (a * dx) / d3;
            const py = p1Coord.y + (a * dy) / d3;

            const ox = h * (dy / d3);
            const oy = h * (dx / d3);

            const candidate1 = { x: px + ox, y: py - oy, z: zP };
            const candidate2 = { x: px - ox, y: py + oy, z: zP };

            // Always choose the candidate with lower average Y
            const avgY1 = (candidate1.y + p1Coord.y + p2Coord.y) / 3;
            const avgY2 = (candidate2.y + p1Coord.y + p2Coord.y) / 3;

            coords[P] = avgY1 < avgY2 ? candidate1 : candidate2;

            placed.add(P);
            progressMade = true;
            break;
        }
    }

    if (placed.size < allPoints.length) return null;
    return coords;
}

function validateEdges(edges, cornerCount) {
    const edgeKeys = [];
    for (let i = 0; i < cornerCount; i++) {
        const from = String.fromCharCode(65 + i);
        const to = String.fromCharCode(65 + ((i + 1) % cornerCount));
        edgeKeys.push(`edge-${from}-${to}`);
    }

    let invalid = false;
    let lengths = edgeKeys.map(name => {
        const input = document.querySelector(`input[name="${name}"]`);
        const val = parseFloat(input?.value);
        return isNaN(val) ? 0 : val;
    });

    // Simple validation: sum of any edge must be < sum of others
    for (let i = 0; i < lengths.length; i++) {
        const thisEdge = lengths[i];
        const others = lengths.reduce((sum, l, j) => i === j ? sum : sum + l, 0);
        if (thisEdge >= others) {
            invalid = true;
            const name = edgeKeys[i];
            const input = document.querySelector(`input[name="${name}"]`);
            if (input) input.classList.add('input-error');
        } else {
            const input = document.querySelector(`input[name="${edgeKeys[i]}"]`);
            if (input) input.classList.remove('input-error');
        }
    }

    const warning = document.getElementById('edgeWarning');
    if (warning) {
        warning.style.display = invalid ? 'block' : 'none';
    }
}