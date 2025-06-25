/**
 * Placeholder step for 3D box visualization.
 */
const zeroVisualise = {
    title: 'Step 0: Visualise covers',
    initialData: { length: 1, width: 1, height: 1 },
    dependencies: [],
    isLive: false,
    isAsync: false,

    // Calculation step: does nothing for this step
    calcFunction: (data) => {
        // No calculation, just return data as-is
        return data;
    },

    drawFunction: (ctx, virtualWidth, virtualHeight, data) => {

        

        // ----------------------------------- DRAW -------------------------------------------


        const quantity = Math.max(1, data.quantity || 1);
        const width = data.width || 1;
        const height = data.height || 1;
        const length = data.length || 1;
        const hem = data.hem || 0;

        const padding = 100;
        const spacing = width / 4;

        // Total visual space required includes hem and projection
        const totalWidthUnits = quantity * width + (quantity - 1) * spacing + length;
        const totalHeightUnits = height + hem + length;
    
        const maxDrawWidth = 1000 - 2 * padding;
        const maxDrawHeight = 1000 - 2 * padding;
    
        const scale = Math.min(
            maxDrawWidth / totalWidthUnits,
            maxDrawHeight / totalHeightUnits
        );
    
        const boxW = width * scale;
        const boxH = height * scale;
        const boxD = length * scale;
        const boxHem = hem * scale;
        const unitSpacing = spacing * scale;
    
        // Include hem height in vertical offset
        const contentWidth = quantity * boxW + (quantity - 1) * unitSpacing + boxD;
        const contentHeight = boxH + boxHem + boxD;
    
        const startX = (1000 - contentWidth) / 2;
        const startY = (1000 - contentHeight) / 2 + boxD;

        ctx.font = "18px sans-serif";
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
    
        for (let i = 0; i < quantity; i++) {
            const x = startX + i * (boxW + unitSpacing);
            const y = startY;
    
            // Draw front face
            ctx.strokeRect(x, y, boxW, boxH);
    
            // Draw hem
            if (hem > 0) {
                ctx.fillStyle = '#ccc';
                ctx.fillRect(x, y + boxH, boxW, boxHem);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(x, y + boxH, boxW, boxHem);
    
                ctx.fillStyle = '#000';
                ctx.font = "14px sans-serif";
                ctx.fillText(`${hem} mm hem`, x + boxW / 2 - 30, y + boxH + boxHem / 2 + 5);
            }
    
            // 3D box projection
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + boxD, y - boxD);
            ctx.moveTo(x + boxW, y);
            ctx.lineTo(x + boxW + boxD, y - boxD);
            ctx.moveTo(x + boxW, y + boxH);
            ctx.lineTo(x + boxW + boxD, y + boxH - boxD);
            ctx.moveTo(x, y + boxH);
            ctx.lineTo(x + boxD, y + boxH - boxD);
            ctx.stroke();
    
            // Back panel
            ctx.beginPath();
            ctx.moveTo(x + boxD, y - boxD);
            ctx.lineTo(x + boxW + boxD, y - boxD);
            ctx.lineTo(x + boxW + boxD, y + boxH - boxD);
            ctx.lineTo(x + boxD, y + boxH - boxD);
            ctx.closePath();
            ctx.stroke();
    
            // Projected hem (if any)
            if (hem > 0) {
                ctx.beginPath();
                ctx.moveTo(x, y + boxH + boxHem);
                ctx.lineTo(x + boxD, y + boxH + boxHem - boxD);
                ctx.moveTo(x + boxW, y + boxH + boxHem);
                ctx.lineTo(x + boxW + boxD, y + boxH + boxHem - boxD);
    
                ctx.moveTo(x + boxD, y + boxH - boxD);
                ctx.lineTo(x + boxD, y + boxH + boxHem - boxD);
                ctx.moveTo(x + boxW + boxD, y + boxH - boxD);
                ctx.lineTo(x + boxW + boxD, y + boxH + boxHem - boxD);
    
                ctx.moveTo(x + boxD, y + boxH + boxHem - boxD);
                ctx.lineTo(x + boxW + boxD, y + boxH + boxHem - boxD);
                ctx.stroke();
            }
    
            // Dimension labels
            ctx.fillStyle = '#000';
            ctx.font = "18px sans-serif";
    
            // Width
            ctx.fillText(`${width} mm`, x + boxW / 2 - 30, y + boxH + boxHem + 20);
    
            // Height (excluding hem)
            ctx.save();
            ctx.translate(x - 20, y + boxH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${height} mm`, -30, 0);
            ctx.restore();
    
            // Total height (including hem)
            ctx.save();
            ctx.translate(x - 50, y + (boxH + boxHem) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${height + hem} mm total`, -40, 0);
            ctx.restore();
    
            // Depth
            ctx.save();
            ctx.translate(x + boxW + boxD + 10, y - boxD - 10);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(`${length} mm`, 0, 0);
            ctx.restore();
        }
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        //------------------------------------- END DRAW ----------------------------------------
        
        return data;

    } 
};

export default zeroVisualise;