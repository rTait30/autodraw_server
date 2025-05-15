/**
 * Placeholder step for 3D box visualization.
 */
const Box3DStep = {
    title: 'Step 1: 3D Box',
    drawFunction: (ctx, width, height, data) => {
        ctx.fillStyle = 'black';
        ctx.font = '40px Arial';
        ctx.fillText(`Box: L = ${data.length || 100}, W = ${data.width || 100}, H = ${data.height || 100}`, 50, 100);
    },
    initialData: { length: 100, width: 100, height: 100 },
    dependencies: [],
    isLive: false
};

export default Box3DStep;