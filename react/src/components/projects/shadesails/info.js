export const title = 'New Shade Sail';

export function getInitialFormData() {
  const pointCount = 4;
  const points = Array.from({ length: pointCount }, (_, i) =>
    String.fromCharCode(65 + i)
  );
  const edges = points.map((p, i) => `${p}${points[(i + 1) % pointCount]}`);
  const diagonals = [];

  for (let i = 0; i < pointCount; i++) {
    for (let j = i + 1; j < pointCount; j++) {
      if ((j === (i + 1) % pointCount) || (i === 0 && j === pointCount - 1)) continue;
      diagonals.push(`${points[i]}${points[j]}`);
    }
  }

  const formData = {
    pointCount,
    fabricType: 'PVC',
    points: {},
  };

  edges.forEach((e) => (formData[e] = ''));
  diagonals.forEach((d) => (formData[d] = ''));

  return formData;
}
