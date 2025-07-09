export const steps = [
  {
    title: 'Step 1: Basic Operation',
    calcFunction: (data) => {
      const { a, b, operation } = data;
      const result1 = operation === 'add' ? a + b : a * b;
      return { ...data, result1 };
    },
    drawFunction: (ctx, data) => {
      if (!ctx || !data) return;
      ctx.fillStyle = '#28a745';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Step 1: ${data.a} ${data.operation === 'add' ? '+' : '*'} ${data.b} = ${data.result1}`, 50, 100);
    },
  },
  {
    title: 'Step 2: Multiply Result1 by C',
    calcFunction: (data) => {
      const result2 = data.result1 * data.c;
      return { ...data, result2 };
    },
    drawFunction: (ctx, data) => {
      if (!ctx || !data) return;
      ctx.fillStyle = '#dc3545';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Step 2: ${data.result1} * ${data.c} = ${data.result2}`, 50, 100);
    },
  },
];
