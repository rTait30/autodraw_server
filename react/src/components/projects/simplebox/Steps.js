export const steps = [
  {
    title: 'Visualise Box',
    calcFunction: (data) => {
      // Just copy data for now
      return { ...data, result: { volume: data.width * data.height * data.depth } };
    },
    drawFunction: (ctx, data) => {
      if (!ctx || !data) return;
      const { width, height } = data;
      ctx.fillStyle = '#007BFF';
      ctx.fillRect(50, yOffset, width / 10, height / 10);

      ctx.strokeStyle = "#00f";
        ctx.beginPath();
        ctx.lineWidth = 5;
        ctx.moveTo(100, 100);
        ctx.lineTo(500, 500);
        ctx.stroke();
    }
  },
  {
    title: 'Visualise Box 2',
    calcFunction: (data) => {
      // Just copy data for now
      return { ...data, result: { volume: data.width * data.height * data.depth } };
    },
    drawFunction: (ctx, data) => {
      if (!ctx || !data) return;
      const { width, height } = data;
      ctx.fillStyle = '#007BFF';
      ctx.fillRect(50, yOffset, width / 10, height / 10);

      ctx.strokeStyle = "#00f";
        ctx.beginPath();
        ctx.lineWidth = 5;
        ctx.moveTo(900, 100);
        ctx.lineTo(500, 500);
        ctx.stroke();
    }
  }
];
