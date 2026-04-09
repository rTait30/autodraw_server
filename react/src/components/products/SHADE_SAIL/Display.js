/**
 * SHADE_SAIL Display (Full Visual Replication + Responsive)
 * Mirrors original drawFunction logic from Steps.js with dynamic scaling for mobile/desktop.
 */

const normalizePointId = (value) => {
  const str = String(value ?? '').trim();
  if (/^[A-Za-z]$/.test(str)) return String(str.toUpperCase().charCodeAt(0) - 65);
  return str;
};

const DEFAULT_SAIL_TRACK_CUTOUT = 50;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getNumericPointId = (value) => {
  const normalized = normalizePointId(value);
  if (normalized === '') return null;

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const getFiniteMeasurement = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getEdgeKey = (from, to) => [Number(from), Number(to)].sort((a, b) => a - b).join('-');

const normalizeSailTrackEntry = (key, track) => {
  const sep = key.includes(',') ? ',' : '-';
  const [fromStr, toStr] = key.split(sep);
  const from = getNumericPointId(fromStr);
  const to = getNumericPointId(toStr);
  if (from === null || to === null || from === to) return null;
  const minPt = Math.min(from, to);
  const maxPt = Math.max(from, to);
  return {
    from: minPt,
    to: maxPt,
    fromSideCutout: track?.fromSideCutout ?? DEFAULT_SAIL_TRACK_CUTOUT,
    toSideCutout: track?.toSideCutout ?? DEFAULT_SAIL_TRACK_CUTOUT,
  };
};

const normalizeSailTracks = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value)
    .map(([key, track]) => normalizeSailTrackEntry(key, track))
    .filter(Boolean);
};

const normalizeEdgeCutouts = (sailTracksValue) => {
  if (!sailTracksValue || typeof sailTracksValue !== 'object' || Array.isArray(sailTracksValue)) return [];
  return Object.entries(sailTracksValue)
    .map(([key, track]) => {
      if (!track?.cutout) return null;
      const sep = key.includes(',') ? ',' : '-';
      const [fromStr, toStr] = key.split(sep);
      const from = getNumericPointId(fromStr);
      const to = getNumericPointId(toStr);
      if (from === null || to === null || from === to) return null;
      const minPt = Math.min(from, to);
      const maxPt = Math.max(from, to);
      return {
        from: minPt,
        to: maxPt,
        fromCutout: track.cutout.fromCutout ?? '',
        toCutout: track.cutout.toCutout ?? '',
        cutoutWidth: track.cutout.cutoutWidth ?? '',
        cutoutProjection: track.cutout.cutoutProjection ?? '',
      };
    })
    .filter(Boolean);
};

const getEdgeGeometry = (fromPos, toPos, centroidX, centroidY, edgeLength, isStraightEdge = false) => {
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const displayedLength = Math.hypot(dx, dy);
  const length = getFiniteMeasurement(edgeLength);

  if (!displayedLength || !length || length <= 0) {
    return null;
  }

  const unitX = dx / displayedLength;
  const unitY = dy / displayedLength;
  const midX = (fromPos.x + toPos.x) / 2;
  const midY = (fromPos.y + toPos.y) / 2;
  let normalX = -unitY;
  let normalY = unitX;
  const toCenterX = centroidX - midX;
  const toCenterY = centroidY - midY;
  const toCenterLen = Math.hypot(toCenterX, toCenterY) || 1;
  const dip = 0.1 * displayedLength;
  const control = isStraightEdge
    ? null
    : {
        x: midX + (toCenterX / toCenterLen) * dip,
        y: midY + (toCenterY / toCenterLen) * dip,
      };

  if ((toCenterX * normalX) + (toCenterY * normalY) < 0) {
    normalX *= -1;
    normalY *= -1;
  }

  return {
    start: fromPos,
    end: toPos,
    unitX,
    unitY,
    normalX,
    normalY,
    displayedLength,
    length,
    mmToPx: displayedLength / length,
    angle: Math.atan2(dy, dx),
    centroidX,
    centroidY,
    control,
  };
};

const getQuadraticPoint = (start, control, end, t) => {
  const mt = 1 - t;
  return {
    x: (mt * mt * start.x) + (2 * mt * t * control.x) + (t * t * end.x),
    y: (mt * mt * start.y) + (2 * mt * t * control.y) + (t * t * end.y),
  };
};

const getQuadraticTangent = (start, control, end, t) => ({
  x: (2 * (1 - t) * (control.x - start.x)) + (2 * t * (end.x - control.x)),
  y: (2 * (1 - t) * (control.y - start.y)) + (2 * t * (end.y - control.y)),
});

const getEdgeOffsetRatio = (edgeGeometry, offsetMm) => {
  if (!edgeGeometry.length) return 0;
  return clamp(offsetMm, 0, edgeGeometry.length) / edgeGeometry.length;
};

const getPointOnEdge = (edgeGeometry, offsetMm) => {
  const clampedOffset = clamp(offsetMm, 0, edgeGeometry.length);
  const t = getEdgeOffsetRatio(edgeGeometry, clampedOffset);

  if (edgeGeometry.control) {
    return getQuadraticPoint(edgeGeometry.start, edgeGeometry.control, edgeGeometry.end, t);
  }

  const distancePx = clampedOffset * edgeGeometry.mmToPx;

  return {
    x: edgeGeometry.start.x + (edgeGeometry.unitX * distancePx),
    y: edgeGeometry.start.y + (edgeGeometry.unitY * distancePx),
  };
};

const getEdgeNormal = (edgeGeometry, offsetMm) => {
  if (!edgeGeometry.control) {
    return { x: edgeGeometry.normalX, y: edgeGeometry.normalY };
  }

  const t = getEdgeOffsetRatio(edgeGeometry, offsetMm);
  const point = getQuadraticPoint(edgeGeometry.start, edgeGeometry.control, edgeGeometry.end, t);
  const tangent = getQuadraticTangent(edgeGeometry.start, edgeGeometry.control, edgeGeometry.end, t);
  const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
  let normalX = -(tangent.y / tangentLength);
  let normalY = tangent.x / tangentLength;
  const toCenterX = edgeGeometry.centroidX - point.x;
  const toCenterY = edgeGeometry.centroidY - point.y;

  if ((toCenterX * normalX) + (toCenterY * normalY) < 0) {
    normalX *= -1;
    normalY *= -1;
  }

  return { x: normalX, y: normalY };
};

const getEdgeCutoutSpan = (cutout, edgeLength) => {
  const fromOffset = getFiniteMeasurement(cutout?.fromCutout);
  const toOffset = getFiniteMeasurement(cutout?.toCutout);
  const width = getFiniteMeasurement(cutout?.cutoutWidth);

  let start = fromOffset === null ? null : clamp(fromOffset, 0, edgeLength);
  const endFromTo = toOffset === null ? null : clamp(edgeLength - toOffset, 0, edgeLength);

  if (start !== null && endFromTo !== null && endFromTo > start) {
    if (width !== null && width > 0) {
      const center = (start + endFromTo) / 2;
      start = clamp(center - (width / 2), 0, edgeLength);
      return {
        start,
        end: clamp(center + (width / 2), 0, edgeLength),
      };
    }

    return { start, end: endFromTo };
  }

  if (width !== null && width > 0) {
    if (start !== null) {
      return { start, end: clamp(start + width, 0, edgeLength) };
    }

    if (endFromTo !== null) {
      return { start: clamp(endFromTo - width, 0, edgeLength), end: endFromTo };
    }
  }

  return null;
};

const drawSquareMarker = (ctx, centerX, centerY, angle, size, lineWidth, strokeStyle) => {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.rect(-(size / 2), -(size / 2), size, size);
  ctx.stroke();
  ctx.restore();
};

const drawSailTrackSideMarker = (ctx, edgeGeometry, offsetMm, strokeScale, strokeStyle) => {
  const offset = getFiniteMeasurement(offsetMm);
  if (offset === null || offset < 0) {
    return;
  }

  const point = getPointOnEdge(edgeGeometry, offset);
  const normal = getEdgeNormal(edgeGeometry, offset);
  const size = clamp(12 * strokeScale, 10, 16);
  const edgeOffset = 4 + (size / 2);
  const centerX = point.x + (normal.x * edgeOffset);
  const centerY = point.y + (normal.y * edgeOffset);

  drawSquareMarker(
    ctx,
    centerX,
    centerY,
    edgeGeometry.angle,
    size,
    2 * strokeScale,
    strokeStyle,
  );
};

const drawEdgeCutout = (ctx, edgeGeometry, cutout, strokeScale, strokeStyle) => {
  const span = getEdgeCutoutSpan(cutout, edgeGeometry.length);
  const projection = getFiniteMeasurement(cutout?.cutoutProjection);

  if (!span || span.end <= span.start || projection === null || projection <= 0) {
    return;
  }

  const startPoint = getPointOnEdge(edgeGeometry, span.start);
  const endPoint = getPointOnEdge(edgeGeometry, span.end);
  const startNormal = getEdgeNormal(edgeGeometry, span.start);
  const endNormal = getEdgeNormal(edgeGeometry, span.end);
  const depthPx = Math.max(10, projection * edgeGeometry.mmToPx);
  const innerStartX = startPoint.x + (startNormal.x * depthPx);
  const innerStartY = startPoint.y + (startNormal.y * depthPx);
  const innerEndX = endPoint.x + (endNormal.x * depthPx);
  const innerEndY = endPoint.y + (endNormal.y * depthPx);

  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 4 * strokeScale;
  ctx.beginPath();
  ctx.moveTo(startPoint.x, startPoint.y);
  ctx.lineTo(innerStartX, innerStartY);
  ctx.lineTo(innerEndX, innerEndY);
  ctx.lineTo(endPoint.x, endPoint.y);
  ctx.stroke();
  ctx.restore();
};

const buildDimensionsMap = (attributes = {}) => {
  const dimensionsMap = {};
  const conns = attributes.connections;

  if (conns && typeof conns === 'object' && !Array.isArray(conns)) {
    Object.entries(conns).forEach(([key, value]) => {
      if (!value?.value) return;
      const sep = key.includes(',') ? ',' : '-';
      const [p1, p2] = key.split(sep);
      if (p1 === undefined || p2 === undefined) return;
      const normKey = [normalizePointId(p1), normalizePointId(p2)]
        .sort((a, b) => Number(a) - Number(b))
        .join('-');
      dimensionsMap[normKey] = value.value;
    });
  }

  return dimensionsMap;
};

const getQuotePointIds = (attributes = {}, positions = {}, dimensionsMap = {}) => {
  const pointCount = Number(attributes.pointCount) || (Array.isArray(attributes.points) ? attributes.points.length : 0);
  if (pointCount >= 3) {
    return Array.from({ length: pointCount }, (_, index) => String(index));
  }

  const positionIds = Object.keys(positions).sort((a, b) => Number(a) - Number(b));
  if (positionIds.length >= 3) return positionIds;

  const maxIndex = Object.keys(dimensionsMap).reduce((currentMax, key) => {
    const [p1, p2] = key.split('-').map(Number);
    if (!Number.isFinite(p1) || !Number.isFinite(p2)) return currentMax;
    return Math.max(currentMax, p1, p2);
  }, -1);

  if (maxIndex >= 2) {
    return Array.from({ length: maxIndex + 1 }, (_, index) => String(index));
  }

  return [];
};

const buildQuotePositions = (ids, dimensionsMap) => {
  const rawLengths = ids.map((id, index) => {
    const nextId = ids[(index + 1) % ids.length];
    const edgeKey = [id, nextId].sort((a, b) => Number(a) - Number(b)).join('-');
    const value = Number(dimensionsMap[edgeKey]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  });

  const knownLengths = rawLengths.filter((value) => value > 0);
  const fallbackLength = knownLengths.length > 0
    ? knownLengths.reduce((sum, value) => sum + value, 0) / knownLengths.length
    : 1000;
  const lengths = rawLengths.map((value) => (value > 0 ? value : fallbackLength));
  const perimeter = lengths.reduce((sum, value) => sum + value, 0) || (ids.length * fallbackLength);
  const radius = perimeter / (Math.PI * 2);
  let angle = Math.PI / 2;

  return Object.fromEntries(ids.map((id, index) => {
    const point = [id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }];
    angle -= (lengths[index] / perimeter) * Math.PI * 2;
    return point;
  }));
};

const isPerimeterEdge = (pointCount, p1, p2) => {
  const delta = Math.abs(Number(p1) - Number(p2));
  return delta === 1 || delta === pointCount - 1;
};

const getPointCount = (attributes = {}) => Math.max(
  3,
  Number(attributes.pointCount) || (Array.isArray(attributes.points) ? attributes.points.length : 0) || 0,
);

const getPointLabel = (value) => String.fromCharCode(65 + Number(value));

const getDimensionLabel = (p1, p2) => `${getPointLabel(p1)}${getPointLabel(p2)}`;

const chunkItems = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const getRequiredJobDimensions = (attributes = {}) => {
  const pointCount = getPointCount(attributes);
  const edges = Array.from({ length: pointCount }, (_, index) => ({
    p1: index,
    p2: (index + 1) % pointCount,
  }));

  const mandatoryKeys = new Set();
  if (pointCount >= 4) {
    const maxK = Math.floor((pointCount - 4) / 2);
    for (let k = 0; k <= maxK; k += 1) {
      const topL = k;
      const topR = k + 1;
      const botR = pointCount - k - 2;
      const botL = pointCount - k - 1;

      mandatoryKeys.add([topL, botR].sort((a, b) => a - b).join('-'));
      mandatoryKeys.add([topR, botL].sort((a, b) => a - b).join('-'));
      mandatoryKeys.add([topL, botL].sort((a, b) => a - b).join('-'));
      mandatoryKeys.add([topR, botR].sort((a, b) => a - b).join('-'));
    }
  }

  const mandatory = [...mandatoryKeys]
    .map((key) => {
      const [p1, p2] = key.split('-');
      return { p1, p2 };
    })
    .filter(({ p1, p2 }) => !isPerimeterEdge(pointCount, p1, p2));

  const tip = [];
  if (pointCount >= 5 && pointCount % 2 !== 0) {
    const tipIdx = Math.floor(pointCount / 2);
    for (let start = 0; start < pointCount; start += 1) {
      for (let end = start + 2; end < pointCount; end += 1) {
        if (start === 0 && end === pointCount - 1) continue;
        if (start !== tipIdx && end !== tipIdx) continue;

        const key = [start, end].join('-');
        if (!mandatoryKeys.has(key)) {
          tip.push({ p1: start, p2: end });
        }
      }
    }
  }

  return { edges, mandatory, tip };
};

const buildRequiredDimensionLines = (requiredDimensions) => {
  const lines = [];
  const pushList = (prefix, items, separator, chunkSize) => {
    if (!items.length) return;
    chunkItems(items, chunkSize).forEach((chunk, index) => {
      lines.push(`${index === 0 ? prefix : ''}${chunk.join(separator)}`);
    });
  };

  pushList('Edges: ', requiredDimensions.edges.map(({ p1, p2 }) => getDimensionLabel(p1, p2)), ', ', 5);
  pushList('Checks: ', requiredDimensions.mandatory.map(({ p1, p2 }) => getDimensionLabel(p1, p2)), ', ', 5);
  pushList('Tip check (one needed): ', requiredDimensions.tip.map(({ p1, p2 }) => getDimensionLabel(p1, p2)), ' or ', 3);

  return lines;
};

const hasDimensionValue = (dimensionsMap, p1, p2) => {
  const key = [String(p1), String(p2)].sort((a, b) => Number(a) - Number(b)).join('-');
  const value = Number(dimensionsMap[key]);
  return Number.isFinite(value) && value > 0;
};

const hasRequiredJobDimensions = (requiredDimensions, dimensionsMap = {}) => {
  for (const { p1, p2 } of requiredDimensions.edges) {
    if (!hasDimensionValue(dimensionsMap, p1, p2)) {
      return false;
    }
  }

  for (const { p1, p2 } of requiredDimensions.mandatory) {
    if (!hasDimensionValue(dimensionsMap, p1, p2)) {
      return false;
    }
  }

  if (requiredDimensions.tip.length > 0 && !requiredDimensions.tip.some(({ p1, p2 }) => hasDimensionValue(dimensionsMap, p1, p2))) {
    return false;
  }

  return true;
};

export function render(canvas, data) {
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sails = data.products || [];
  const showQuoteWarning = data.general?.order_type === 'quote';

  // Layout configuration tuned for the 1000x1000 overlay canvas.
  const perSailHeight = 1000;
  const sectionPadding = 50;
  const sectionGap = 12;
  const textSectionHeight = 256;
  const sailDrawingHeight = perSailHeight - (sectionPadding * 2) - sectionGap - textSectionHeight;
  
  canvas.height = perSailHeight * sails.length;

  // Responsive scale factors based on viewport width
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const baseScale = 3.0; // leaner base scaling
  const strokeScale = 1.08;
  const fontScale = 1.08;
  const paddingScale = 1.0;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.lineWidth = 2 * baseScale * strokeScale;
  ctx.strokeStyle = '#1a1a1a';

  const padX = isMobile ? 44 : 92;
  const padY = isMobile ? 34 : 40;

  sails.forEach((sail, idx) => {
    const startY = idx * perSailHeight;
    const drawingTop = startY + sectionPadding;
    const infoTop = drawingTop + sailDrawingHeight + sectionGap;
    
    const attributes = { ...(sail.attributes || {}), ...(sail.calculated || {}) };
    const points = attributes.points || {};
    const dimensionsMap = buildDimensionsMap(attributes);
    const sourcePositions = attributes.positions || {};
    const sourcePositionIds = Object.keys(sourcePositions).sort((a, b) => Number(a) - Number(b));
    const requiredDimensions = getRequiredJobDimensions(attributes);
    const hasMeasuredGeometry = hasRequiredJobDimensions(requiredDimensions, dimensionsMap);
    const expectedPointCount = getPointCount(attributes);
    const hasSolvedPositions = hasMeasuredGeometry && sourcePositionIds.length >= expectedPointCount;
    const useQuoteFallback = showQuoteWarning && !hasSolvedPositions;
    const ids = useQuoteFallback
      ? getQuotePointIds(attributes, sourcePositions, dimensionsMap)
      : (hasSolvedPositions ? sourcePositionIds : []);
    if (!ids.length) {
      if (!useQuoteFallback) {
        const warningLines = buildRequiredDimensionLines(requiredDimensions);
        const warningStartY = startY + (perSailHeight / 2) - ((warningLines.length + 1) * 20);

        ctx.save();
        ctx.fillStyle = '#dc2626';
        ctx.font = `bold ${Math.round(42 * fontScale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Please provide required dimensions', canvas.width / 2, warningStartY);

        ctx.font = `${Math.round(26 * fontScale)}px Arial`;
        warningLines.forEach((line, lineIndex) => {
          ctx.fillText(line, canvas.width / 2, warningStartY + 54 + (lineIndex * 32));
        });
        ctx.restore();
      }
      return;
    }
    const positions = useQuoteFallback ? buildQuotePositions(ids, dimensionsMap) : sourcePositions;

    // Build a set of problematic line keys (unordered pairs) from boxes
    const problematicLines = new Set();
    const boxesData = attributes.boxes || {};
    Object.entries(boxesData).forEach(([boxKey, box]) => {
      if (!box?.problem || !boxKey) return;
      
      const corners = boxKey.includes('-') ? boxKey.split('-') : boxKey.split('');

      if (corners.length === 2) {
        problematicLines.add(corners.sort().join('-'));
        return;
      }
      
      if (corners.length < 4) return;
      
      const [A, B, C, D] = corners;
      const pairs = [
        [A, B], [B, C], [C, D], [D, A],
        [A, C], [B, D],
      ];
      
      pairs.forEach(([p1, p2]) => {
          const key = [p1, p2].sort().join('-');
          problematicLines.add(key);
      });
    });

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
    
    const innerW = canvas.width - padX * 2;
    const innerH = sailDrawingHeight - padY * 2;
    
    const scale = Math.min(innerW / shapeW, innerH / shapeH);
    
    // Center in the drawing area
    const drawnW = shapeW * scale;
    const drawnH = shapeH * scale;
    const offsetX = (canvas.width - drawnW) / 2;
    const offsetY = drawingTop + (sailDrawingHeight - drawnH) / 2;

    const mapped = {};
    // Map coordinates ensuring positive X -> right, positive Y -> up
    for (const [id, p] of Object.entries(positions)) {
      const mappedX = offsetX + (p.x - minX) * scale;
      const mappedY = offsetY + (maxY - p.y) * scale;
      mapped[id] = { x: mappedX, y: mappedY };
    }

    // Map workpoints (tension points) if available
    const mappedWorkpoints = {};
    const workpoints = useQuoteFallback ? {} : (attributes.workpoints || {});
    const hasWorkpoints = Object.keys(workpoints).length > 0;
    
    if (hasWorkpoints) {
      for (const [id, wp] of Object.entries(workpoints)) {
        const mappedX = offsetX + (wp.x - minX) * scale;
        const mappedY = offsetY + (maxY - wp.y) * scale;
        mappedWorkpoints[id] = { x: mappedX, y: mappedY };
      }
    }

    // Determine which points define the sail perimeter (workpoints if available, else posts)
    const perimeterPoints = hasWorkpoints ? mappedWorkpoints : mapped;

    // Use pre-calculated centroid from backend if available, mapped to canvas
    let cx = 0, cy = 0;
    if (!useQuoteFallback && attributes.centroid) {
        cx = offsetX + (attributes.centroid.x - minX) * scale;
      cy = offsetY + (maxY - attributes.centroid.y) * scale;
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
    const sailTracks = normalizeSailTracks(attributes.sailTracks);
    const edgeCutouts = normalizeEdgeCutouts(attributes.sailTracks);
    const sailTrackMap = new Map(sailTracks.map((track) => [getEdgeKey(track.from, track.to), track]));

    // Draw tensioners (lines from post to workpoint)
    if (hasWorkpoints) {
        ctx.save();
        ctx.strokeStyle = '#666'; 
        ctx.lineWidth = 1 * baseScale * strokeScale;
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
    // Pre-build sail track edge set for efficient lookup
    const sailTrackEdges = new Set();
    sailTracks.forEach((track) => {
      const k = getEdgeKey(track.from, track.to);
      sailTrackEdges.add(k);
    });

    for (let i = 0; i < ordered.length; i++) {
      const p1 = ordered[i];
      const p2 = ordered[(i + 1) % ordered.length];

      // Draw straight red line between posts (measured points)
      const post1 = mapped[p1];
      const post2 = mapped[p2];
      if (post1 && post2) {
          ctx.save();
          ctx.strokeStyle = '#000'; 
          ctx.lineWidth = 1 * baseScale * strokeScale;
          ctx.beginPath();
          ctx.moveTo(post1.x, post1.y);
          ctx.lineTo(post2.x, post2.y);
          ctx.stroke();
          ctx.restore();
      }

      const pos1 = perimeterPoints[p1];
      const pos2 = perimeterPoints[p2];
      if (!pos1 || !pos2) continue;

      const lineKey = [p1, p2].sort().join('-');
      const numericKey = [Number(p1), Number(p2)].sort((a,b) => a-b).join('-');
      const isProblematicPerimeter = problematicLines.has(lineKey);

      // Skip sail track edges here — they are drawn in a separate pass below
      if (sailTrackEdges.has(numericKey) || sailTrackEdges.has(lineKey)) continue;

      const edgeColor = isProblematicPerimeter ? '#EB1C24' : '#004A7C';

      ctx.save();
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 4 * strokeScale;
      ctx.beginPath();
      // Catenary curve (quadratic, dipped toward center)
      const mx = (pos1.x + pos2.x) / 2;
      const my = (pos1.y + pos2.y) / 2;
      const length = Math.hypot(pos2.x - pos1.x, pos2.y - pos1.y);
      const dip = 0.1 * length;
      const toCenterX = cx - mx;
      const toCenterY = cy - my;
      const toCenterLen = Math.hypot(toCenterX, toCenterY) || 1;
      const cx1 = mx + (toCenterX / toCenterLen) * dip;
      const cy1 = my + (toCenterY / toCenterLen) * dip;
      ctx.moveTo(pos1.x, pos1.y);
      ctx.quadraticCurveTo(cx1, cy1, pos2.x, pos2.y);
      ctx.stroke();
      ctx.restore();
    }

    // Draw sail track edges separately (uses logical indices, not polar order)
    for (const stKey of sailTrackEdges) {
      const [sp1, sp2] = stKey.split('-');
      const sPos1 = perimeterPoints[sp1] || mapped[sp1];
      const sPos2 = perimeterPoints[sp2] || mapped[sp2];
      if (!sPos1 || !sPos2) continue;

      const stLineKey = [sp1, sp2].sort().join('-');
      const isProblematic = problematicLines.has(stLineKey);
      const stColor = isProblematic ? '#EB1C24' : '#004A7C';

      // Draw straight line for sail track
      ctx.save();
      ctx.strokeStyle = stColor;
      ctx.lineWidth = 8 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(sPos1.x, sPos1.y);
      ctx.lineTo(sPos2.x, sPos2.y);
      ctx.stroke();
      ctx.restore();

      const sailTrack = sailTrackMap.get(stKey);
      if (sailTrack) {
        const edgeGeometry = getEdgeGeometry(sPos1, sPos2, cx, cy, dimensionsMap[stKey], true);
        if (edgeGeometry) {
          drawSailTrackSideMarker(ctx, edgeGeometry, sailTrack.fromSideCutout, strokeScale, stColor);
          drawSailTrackSideMarker(ctx, edgeGeometry, edgeGeometry.length - Number(sailTrack.toSideCutout), strokeScale, stColor);
        }
      }

      // Draw "Sail Track" label outside the sail
      ctx.save();
      const midX = (sPos1.x + sPos2.x) / 2;
      const midY = (sPos1.y + sPos2.y) / 2;
      const toOutX = midX - cx;
      const toOutY = midY - cy;
      const toOutLen = Math.hypot(toOutX, toOutY) || 1;
      const offsetDist = 14;
      const lblX = midX + (toOutX / toOutLen) * offsetDist;
      const lblY = midY + (toOutY / toOutLen) * offsetDist;
      let lblAngle = Math.atan2(sPos2.y - sPos1.y, sPos2.x - sPos1.x);
      if (lblAngle > Math.PI / 2 || lblAngle < -Math.PI / 2) lblAngle += Math.PI;
      ctx.font = `bold ${Math.round(32 * fontScale)}px Arial`;
      ctx.fillStyle = stColor;
      ctx.textAlign = 'center';
      ctx.translate(lblX, lblY);
      ctx.rotate(lblAngle);
      ctx.fillText('Sail Track', 0, 0);
      ctx.restore();
    }

    edgeCutouts.forEach((cutout) => {
      const edgeKey = getEdgeKey(cutout.from, cutout.to);
      if (!sailTrackMap.has(edgeKey)) return;

      const fromId = String(cutout.from);
      const toId = String(cutout.to);
      const lineKey = [fromId, toId].sort().join('-');
      const cutoutColor = problematicLines.has(lineKey) ? '#EB1C24' : '#004A7C';
      const fromPos = perimeterPoints[fromId] || mapped[fromId];
      const toPos = perimeterPoints[toId] || mapped[toId];
      if (!fromPos || !toPos) return;

      const edgeGeometry = getEdgeGeometry(fromPos, toPos, cx, cy, dimensionsMap[edgeKey], sailTrackEdges.has(edgeKey));
      if (!edgeGeometry) return;

      drawEdgeCutout(ctx, edgeGeometry, cutout, strokeScale, cutoutColor);
    });

    // Draw UFCs as thick blue lines between the referenced corners
    (attributes.ufcs || []).forEach((ufc) => {
      const fromId = normalizePointId(ufc?.from);
      const toId = normalizePointId(ufc?.to);
      const fromPos = perimeterPoints[fromId] || mapped[fromId];
      const toPos = perimeterPoints[toId] || mapped[toId];
      if (!fromPos || !toPos || fromId === toId) return;

      const midX = (fromPos.x + toPos.x) / 2;
      const midY = (fromPos.y + toPos.y) / 2;
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const length = Math.hypot(dx, dy);
      const unitX = length ? dx / length : 0;
      const unitY = length ? dy / length : 0;
      const dimensionKey = [fromId, toId].sort((a, b) => Number(a) - Number(b)).join('-');
      const dimensionValue = Number(dimensionsMap[dimensionKey]);

      ctx.save();
      ctx.font = `bold ${Math.round(24 * fontScale)}px Arial`;
      const dimensionLabel = Number.isFinite(dimensionValue) && dimensionValue > 0
        ? `${getDimensionLabel(fromId, toId)}: ${dimensionValue.toFixed(0)}mm`
        : getDimensionLabel(fromId, toId);
      const dimensionWidth = ctx.measureText(dimensionLabel).width;
      ctx.restore();

      const gapHalf = Math.max(0, Math.min((length / 2) - 12, (dimensionWidth / 2) + 42));

      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 6 * strokeScale;
      ctx.beginPath();
      if (gapHalf > 0) {
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(midX - (unitX * gapHalf), midY - (unitY * gapHalf));
        ctx.moveTo(midX + (unitX * gapHalf), midY + (unitY * gapHalf));
        ctx.lineTo(toPos.x, toPos.y);
      } else {
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);
      }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      let angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
      ctx.font = `bold ${Math.round(28 * fontScale)}px Arial`;
      ctx.fillStyle = '#2563eb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(midX, midY);
      ctx.rotate(angle);
      ctx.fillText('UFC', 0, 28);
      ctx.restore();
    });

    // Point labels & metadata (responsive sizing)
    ordered.forEach(id => {
      const p = mapped[id];
      if (!p) return;
      let vx = p.x - cx; let vy = p.y - cy; let vlen = Math.hypot(vx, vy) || 1; vx /= vlen; vy /= vlen;
      const baseDist = 24;
      const labelHalfWidth = 22;
      const labelHalfHeight = 22;
      const anchorX = p.x + vx * baseDist;
      const anchorY = p.y + vy * baseDist;
      const minLabelX = padX + labelHalfWidth;
      const maxLabelX = canvas.width - padX - labelHalfWidth;
      const labelX = Math.max(minLabelX, Math.min(anchorX, maxLabelX));
      const minLabelY = drawingTop + labelHalfHeight;
      const maxLabelY = infoTop - labelHalfHeight;
      const labelY = Math.max(minLabelY, Math.min(anchorY, maxLabelY));

      // Point circle (with reflex angle highlight if provided)
      const isReflex = attributes.reflexAngleValues && attributes.reflexAngleValues[id] != null;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (isReflex ? 8 : 5), 0, Math.PI * 2);
      ctx.fillStyle = isReflex ? '#dc2626' : '#2563eb';
      ctx.fill();
      ctx.strokeStyle = '#004A7C'; ctx.lineWidth = 1 * strokeScale; ctx.stroke();

      ctx.save();
      ctx.fillStyle = '#000';
      ctx.font = `bold ${Math.round(48 * fontScale)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Convert id 0->A, 1->B, 2->C...
      const labelChar = String.fromCharCode(65 + Number(id));
      ctx.fillText(`${labelChar}`, labelX, labelY);
      
      ctx.font = `bold ${Math.round(24 * fontScale)}px Arial`;

      if (points[id] && points[id].height !== undefined && points[id].height !== '') {
        ctx.fillText(`Height: ${points[id].height}`, labelX + 100, labelY + 50);
      }


      ctx.restore();

      /*

      

      ctx.font = `bold ${Math.round(24 * fontScale)}px Arial`;

      let nextY = labelY + lineSpacingLarge;
      if (points[id] && points[id].height !== undefined && points[id].height !== '') {
        ctx.fillText(`Height: ${points[id].height}`, labelX, nextY); nextY += lineSpacingSmall;
      }

      if (!data.discrepancyChecker) {
        if (points[id]?.cornerFitting !== undefined && points[id]?.cornerFitting !== '') {
          ctx.fillText(`Fitting: ${points[id]?.cornerFitting ?? ''}`, labelX, nextY); nextY += lineSpacingSmall;
        }
        if (points[id]?.tensionHardware !== undefined && points[id]?.tensionHardware !== '') {
          ctx.fillText(`Hardware: ${points[id]?.tensionHardware ?? ''}`, labelX, nextY); nextY += lineSpacingSmall;
        }
        if (points[id]?.tensionAllowance !== undefined && points[id]?.tensionAllowance !== '') {
          ctx.fillText(`Allowance: ${points[id]?.tensionAllowance ?? ''}`, labelX, nextY); nextY += lineSpacingSmall;
        }
      }

      ctx.font = `bold ${Math.round(32 * fontScale)}px Arial`;
      ctx.fillStyle = '#EB1C24';
      if (attributes.exitPoint === id && !data.discrepancyChecker) { ctx.fillText('Exit Point', labelX, nextY); nextY += lineSpacingSmall; }
      if (attributes.logoPoint === id && !data.discrepancyChecker) { ctx.fillText('Logo', labelX, nextY); nextY += lineSpacingSmall; }
      
      */

      /*
      reflex not working yet
      if (isReflex) {
        ctx.fillStyle = '#dc2626'; ctx.font = `bold ${Math.round(16 * fontScale)}px Arial`;
        ctx.fillText(`${Math.round(attributes.reflexAngleValues[id])}°`, labelX, nextY);
      }
      */
    });

    // Convert index to Label (0 -> A)
    const getLabel = (idx) => {
        const n = Number(idx);
        if (isNaN(n)) return idx; // fallback if already a letter
        return String.fromCharCode(65 + n);
    };

    const getEvaluatedDimension = (p1, p2) => {
      if (useQuoteFallback) return null;

      const pos1 = positions[p1];
      const pos2 = positions[p2];
      if (!pos1 || !pos2) return null;

      const point1 = points[p1] || {};
      const point2 = points[p2] || {};
      const z1 = Number(point1.z ?? point1.height ?? 0);
      const z2 = Number(point2.z ?? point2.height ?? 0);
      const dx = Number(pos2.x) - Number(pos1.x);
      const dy = Number(pos2.y) - Number(pos1.y);
      const dz = z2 - z1;

      if ([dx, dy, dz].some(Number.isNaN)) return null;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    // Dimensions (edges + diagonals) with rotated labels
    ctx.lineWidth = 1 * strokeScale; ctx.fillStyle = '#333';
    ctx.font = `bold ${Math.round(24 * fontScale)}px Arial`;
    const drawnLines = new Set();
    const isPerimeterEdge = (p1, p2) => {
      const i1 = ordered.indexOf(p1); const i2 = ordered.indexOf(p2);
      if (i1 === -1 || i2 === -1) return false;
      return Math.abs(i1 - i2) === 1 || Math.abs(i1 - i2) === ordered.length - 1;
    };
    
    for (const [edgeKey, dimValue] of Object.entries(dimensionsMap)) {
      if (dimValue === '' || dimValue === undefined || dimValue === null || isNaN(Number(dimValue))) continue;
      
      const [p1, p2] = edgeKey.split('-');
      const lineKey = [p1, p2].sort().join('-'); // string sort for unique set key
      const isProblematicDimension = problematicLines.has(lineKey);
      
      if (drawnLines.has(lineKey)) continue;
      drawnLines.add(lineKey);
      
      const pos1 = mapped[p1]; const pos2 = mapped[p2];
      // If p1/p2 (indices) are not in mapped positions, skip
      if (!pos1 || !pos2) continue;
      if (!isPerimeterEdge(p1, p2)) {
        ctx.strokeStyle = isProblematicDimension ? '#EB1C24' : '#999';
        ctx.lineWidth = 1 * baseScale * strokeScale; ctx.beginPath(); ctx.moveTo(pos1.x, pos1.y); ctx.lineTo(pos2.x, pos2.y); ctx.stroke();
      }
      const midX = (pos1.x + pos2.x) / 2; const midY = (pos1.y + pos2.y) / 2; 
      let angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
      // Flip if upside down (angle between π/2 and 3π/2)
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
        angle += Math.PI;
      }
      
      // Convert indices to labels for display
      const L1 = getLabel(p1);
      const L2 = getLabel(p2);
      const enteredDimension = Number(dimValue);
      const evaluatedDimension = getEvaluatedDimension(p1, p2);
      const enteredText = Number.isFinite(enteredDimension) ? enteredDimension.toFixed(0) : String(dimValue);
      const evaluatedText = Number.isFinite(evaluatedDimension) ? ` (${evaluatedDimension.toFixed(0)}mm)` : '';
      const label = `${L1}-${L2}: ${enteredText}mm${evaluatedText}`;


      //console.log("[DEBUG] Drawing dimension label:", label, "at", midX, midY, "angle", angle);

      ctx.save();
      ctx.fillStyle = isProblematicDimension ? '#EB1C24' : '#333';
      ctx.translate(midX, midY);
      ctx.rotate(angle);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, -6);
      ctx.restore();
    }

    // Summary metrics in a fixed bottom section for each sail
    const maxInfoRows = 4;
    const yPos = infoTop;
    const textBlockWidth = Math.min(canvas.width - sectionPadding * 2, 900);
    const startX = Math.max(sectionPadding, (canvas.width - textBlockWidth) / 2);
    const boxPadding = 20;
    const col1X = startX + boxPadding;
    const col2X = startX + 400; // Second column start

    // Prepare data first to calculate layout
    const sortedBoxes = Object.entries(boxesData)
      .filter(([, box]) => box.discrepancy != null && Number.isFinite(box.discrepancy))
      .sort((a, b) => Math.abs(b[1].discrepancy) - Math.abs(a[1].discrepancy))
      .slice(0, maxInfoRows);

    // Build blame from connections
    const conns = attributes.connections || {};
    const blameGroups = new Map();
    Object.entries(conns).forEach(([key, conn]) => {
      const blame = Number(conn?.blame || 0);
      if (blame <= 1) return;
      const rounded = Math.abs(blame).toFixed(2);
      if (!blameGroups.has(rounded)) blameGroups.set(rounded, []);
      const sep = key.includes(',') ? ',' : '-';
      const [p1, p2] = key.split(sep);
      const normKey = [p1, p2].sort((a, b) => Number(a) - Number(b)).join('-');
      blameGroups.get(rounded).push(normKey);
    });
    const groupedBlame = Array.from(blameGroups.entries())
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .slice(0, maxInfoRows);

    const hasData = (attributes.pointCount || 0) >= 4;
    const isProblem = attributes.discrepancyProblem;

    const translateKey = (k) => {
        if (!k) return k;
        return k.split('-').map(p => getLabel(p)).join('-');
    };

    let suggestionText = "";
    if (isProblem && groupedBlame.length > 0) {
       const topSuspectKeys = groupedBlame[0][1];
       if (topSuspectKeys.length > 3) {
          suggestionText = "Cannot determine specific problem dimension.";
       } else {
          const topSuspects = topSuspectKeys.map(k => translateKey(k)).join(' or ');
         suggestionText = `Check Dimension ${topSuspects} or similar.`;
       }
    }

    // Draw Box
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX, yPos, textBlockWidth, textSectionHeight);
    
    ctx.strokeStyle = isProblem ? '#fca5a5' : '#86efac';
    ctx.lineWidth = 1 * strokeScale;
    ctx.strokeRect(startX, yPos, textBlockWidth, textSectionHeight);
    
    // Draw Header Content
    let currentY = yPos + 26;
    
    ctx.font = `bold ${Math.round(24 * fontScale)}px Arial`;
    ctx.fillStyle = "#111";
    ctx.fillText(`Max Discrepancy: ${(attributes.maxDiscrepancy || 0).toFixed(0)} mm`, col1X, currentY);

    ctx.fillStyle = isProblem ? '#dc2626' : '#16a34a'; // Red or Green
    ctx.fillText(isProblem ? "These dimensions have discrepancies." : "Specifications Valid", col2X, currentY);

    currentY += 28;
    ctx.fillStyle = "#4b5563";
    ctx.font = `italic ${Math.round(22 * fontScale)}px Arial`;

    if (isProblem) {
       ctx.fillText("Shape does not close geometrically.", col1X, currentY);
    } else {
       ctx.fillText("Measurements form a consistent geometric shape.", col1X, currentY);
    }

    // Draw Tables
    if (hasData && (sortedBoxes.length > 0 || groupedBlame.length > 0)) {
        currentY += 28;
        const tableHeaderY = currentY;
        
        ctx.font = `bold ${Math.round(24 * fontScale)}px Arial`;
        ctx.fillStyle = "#111";
        if (sortedBoxes.length > 0) ctx.fillText("Discrepancies (Loop Errors):", col1X, tableHeaderY);
        if (groupedBlame.length > 0) ctx.fillText("Likely Error Source:", col2X, tableHeaderY);
        
        currentY += 24;
        ctx.font = `${Math.round(22 * fontScale)}px Arial`;
        
        const maxRows = Math.max(sortedBoxes.length, groupedBlame.length);
        for(let i=0; i<maxRows; i++) {
          let rowY = currentY + (i * 24);
           
           if (i < sortedBoxes.length) {
              const [boxKey, box] = sortedBoxes[i];
              const displayBox = translateKey(boxKey);
              const value = box.discrepancy;
              const corners = boxKey.split('-');

              let longestBoxEdge = 0;
              for (let ci = 0; ci < corners.length; ci++) {
                for (let cj = ci + 1; cj < corners.length; cj++) {
                   const normK = [corners[ci], corners[cj]].sort((a,b)=>Number(a)-Number(b)).join('-');
                   const l = dimensionsMap[normK];
                   if (typeof l === 'number' && l > longestBoxEdge) longestBoxEdge = l;
                }
              }
              const pct = ((value / (longestBoxEdge || 1)) * 100).toFixed(0);
              
              ctx.fillStyle = "#374151";
              ctx.fillText(`- ${displayBox}: ${value.toFixed(0)} mm (${pct}%)`, col1X + 5, rowY);
           }

           if (i < groupedBlame.length) {
              const [rounded, keys] = groupedBlame[i];
              const displayKeys = keys.map(k => translateKey(k)).join(', ');
              ctx.fillStyle = "#ef4444";
              ctx.fillText(`- ${displayKeys}: ~${parseFloat(rounded).toFixed(0)} mm`, col2X + 5, rowY);
           }
        }
    }

    if (isProblem && suggestionText) {
      ctx.save();
      ctx.font = `bold ${Math.round(32 * fontScale)}px Arial`;
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(suggestionText, startX + (textBlockWidth / 2), yPos + textSectionHeight - 28);
      ctx.restore();
    }
    ctx.restore();

    if (showQuoteWarning) {
      ctx.save();
      ctx.translate(canvas.width / 2, startY + (perSailHeight / 2));
      //ctx.rotate(-Math.PI / 10);
      ctx.font = `bold ${Math.round(48 * fontScale)}px Arial`;
      ctx.fillStyle = 'rgba(220, 38, 38, 0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('QUOTE ONLY - DIMENSIONS NOT FINAL', 0, -200);

      ctx.font = `bold ${Math.round(36 * fontScale)}px Arial`;
      
      ctx.fillText('CANNOT PROCEED WITH PRODUCTION', 0, -100);
      ctx.restore();
    }
  });

  ctx.restore();
}

