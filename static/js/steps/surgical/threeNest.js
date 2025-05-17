const threeNest = {
    title: 'Step 3: Nesting',
    initialData: { },
    dependencies: [],
    isLive: false,

    drawFunction: (ctx, virtualWidth, virtualHeight, data, depData) => {



        // ----------------------------------- DRAW -------------------------------------------

        let yOffset = 500;
        ctx.font = '20px Arial';
    
        function drawKeyValue(ctx, key, value, x, y, indentLevel = 0) {
            const indent = '    '.repeat(indentLevel); // 4 spaces per indent
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                ctx.fillText(`${indent}${key}:`, x, y);
                y += 25;
                for (const [subKey, subValue] of Object.entries(value)) {
                    y = drawKeyValue(ctx, subKey, subValue, x, y, indentLevel + 1);
                }
                return y;
            } else {
                ctx.fillText(`${indent}${key}: ${value}`, x, y);
                return y + 25;
            }
        }
    
        Object.entries(data.finalPanels).forEach(([key, value]) => {
            yOffset = drawKeyValue(ctx, key, value, 500, yOffset, 0);
        });

        // ----------------------------------- END DRAW --------------------------------------

        return data;
        
    } 
};

export default threeNest;