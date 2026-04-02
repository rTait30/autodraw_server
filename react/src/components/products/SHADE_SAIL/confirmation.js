function getPointLabel(index) {
  if (index === null || index === undefined || index === '') {
    return index;
  }

  const numericIndex = typeof index === 'string' ? Number(index) : index;
  if (!Number.isInteger(numericIndex) || numericIndex < 0) {
    return index;
  }

  let value = numericIndex;
  let label = '';

  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

function mapPointRefs(item, keys) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return item;
  }

  const next = { ...item };
  keys.forEach((key) => {
    if (key in next) {
      next[key] = getPointLabel(next[key]);
    }
  });

  if ('from' in next && 'to' in next && !next.__label) {
    next.__label = `${next.from}-${next.to}`;
  }

  return next;
}

function transformAttributes(attributes) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return attributes;
  }

  const next = { ...attributes };

  if ('exitPoint' in next) {
    next.exitPoint = getPointLabel(next.exitPoint);
  }

  if ('logoPoint' in next) {
    next.logoPoint = getPointLabel(next.logoPoint);
  }

  if (Array.isArray(next.points)) {
    next.points = next.points.map((point, index) => {
      if (!point || typeof point !== 'object' || Array.isArray(point)) {
        return point;
      }

      const sourceIndex = Number.isInteger(point.__index) ? point.__index : index;
      return {
        ...point,
        __label: getPointLabel(sourceIndex),
      };
    });
  }

  if (Array.isArray(next.connections)) {
    next.connections = next.connections.map((entry) => mapPointRefs(entry, ['from', 'to']));
  }

  if (Array.isArray(next.sailTracks)) {
    next.sailTracks = next.sailTracks.map((entry) => mapPointRefs(entry, ['from', 'to']));
  }

  if (Array.isArray(next.edgeCutouts)) {
    next.edgeCutouts = next.edgeCutouts.map((entry) => mapPointRefs(entry, ['from', 'to']));
  }

  if (Array.isArray(next.traceCables)) {
    next.traceCables = next.traceCables.map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return entry;
      }

      const { pointIndex, ...rest } = entry;
      return {
        point: getPointLabel(pointIndex),
        ...rest,
      };
    });
  }

  if (Array.isArray(next.ufcs)) {
    next.ufcs = next.ufcs.map((entry) => mapPointRefs(entry, ['from', 'to']));
  }

  return next;
}

export function transformConfirmationData({ generalSection, projectAttributes, products }) {
  return {
    generalSection,
    projectAttributes,
    products: Array.isArray(products)
      ? products.map((product) => {
          if (!product || typeof product !== 'object' || Array.isArray(product)) {
            return product;
          }

          return {
            ...product,
            attributes: transformAttributes(product.attributes),
          };
        })
      : products,
  };
}
