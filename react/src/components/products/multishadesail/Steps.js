

export const Steps = [
  {
    title: 'Step 0: Discrepancy & Top View',
    id: 'discrepancy',
    dependencies: [],
    isLive: false,
    isAsync: false,
    calcFunction: (data) => {

      for (const sail of data) {
        // perform discrepancy calculations
        sail.edgeMeter = sumEdges(sail.dimensions, sail.pointCount);
      }
      return data;
    },

    drawFunction: (ctx, data) => {

      let sailIndex = 1;
    
      for (const sail of data) {
        // draw top view
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        const offsetX = 50 + (sailIndex - 1) * 300;
        const offsetY = 50;
        const pointCount = sail.pointCount;
        ctx.fillText(`Sail ${sailIndex}`, offsetX, offsetY - 20);
      }
    }
  }
];

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
