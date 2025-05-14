/**
 * Step configuration for visualizing a 3D box for surgical covers.
 * @module
 */
const Box3DStep = {
    title: 'Step 1: 3D Box Visualization',
    /**
     * Draws a wireframe 3D box.
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {number} width - Virtual canvas width.
     * @param {number} height - Virtual canvas height.
     * @param {Object} data - Step data (length, width, height).
     * @param {Array} depData - Dependency data.
     */
    drawFunction: (ctx, width, height, data, depData) => {

        //const { length, width, height } = data;
        
        // Simple 3D projection (isometric placeholder)
        const scale = Math.min(width / (length + width), height / (width + height)) * 0.5;
        const cx = width / 2;
        const cy = height / 2;
        
        // Define box vertices
        const vertices = [
            [0, 0, 0], [length, 0, 0], [length, width, 0], [0, width, 0], // Bottom face
            [0, 0, height], [length, 0, height], [length, width, height], [0, width, height] // Top face
        ];
        
        // Isometric projection
        const projected = vertices.map(([x, y, z]) => {
            const px = x - y * 0.5;
            const py = -z + y * 0.5;
            return [cx + px * scale, cy + py * scale];
        });
        
        // Draw edges
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        // Bottom face
        for (let i = 0; i < 4; i++) {
            ctx.moveTo(projected[i][0], projected[i][1]);
            ctx.lineTo(projected[(i + 1) % 4][0], projected[(i + 1) % 4][1]);
        }
        
        // Top face
        for (let i = 4; i < 8; i++) {
            ctx.moveTo(projected[i][0], projected[i][1]);
            ctx.lineTo(projected[4 + (i + 1 - 4) % 4][0], projected[4 + (i + 1 - 4) % 4][1]);
        }
        
        // Connecting edges
        for (let i = 0; i < 4; i++) {
            ctx.moveTo(projected[i][0], projected[i][1]);
            ctx.lineTo(projected[i + 4][0], projected[i + 4][1]);
        }
        
        ctx.stroke();
        
        // Display dimensions
        ctx.fillStyle = 'black';
        ctx.font = '40px Arial';
        ctx.fillText(`L: ${length}, W: ${width}, H: ${height}`, 50, 100);
    },
    initialData: { length: 100, width: 100, height: 100 }
};

export default Box3DStep;