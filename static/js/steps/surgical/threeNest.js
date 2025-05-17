async function sendPanelData(panelData) {
    
    try {
      const response = await fetch('/copelands/nest_panels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(panelData)
      });
  
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
  
      const result = await response.json();
      console.log('Received nest:', result);

      return result;

    } catch (error) {
      console.error('Error sending panel data:', error);
    }
}



const threeNest = {

    title: 'Step 3: Nesting',
    initialData: { },
    dependencies: [],
    isLive: false,

    drawFunction: async (ctx, virtualWidth, virtualHeight, data, depData) => {
      // ----------------------------------- DRAW -------------------------------------------

        if (data.length > 0) {

            const nestData = await sendPanelData(data.finalPanels);

            console.log("got data:");
            console.log(nestData);
            
            let yOffset = 500;
            ctx.font = '10px Arial';
        
            function drawKeyValue(ctx, key, value, x, y, indentLevel = 0) {
                const indent = '    '.repeat(indentLevel); // 4 spaces per indent
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    ctx.fillText(`${indent}${key}:`, x, y);
                    y += 15;
                    for (const [subKey, subValue] of Object.entries(value)) {
                        y = drawKeyValue(ctx, subKey, subValue, x, y, indentLevel + 1);
                    }
                    return y;
                } else {
                    ctx.fillText(`${indent}${key}: ${value}`, x, y);
                    return y + 15;
                }
            }
        
            Object.entries(nestData).forEach(([key, value]) => {
                yOffset = drawKeyValue(ctx, key, value, 500, yOffset, 0);
            });

        }
    }
};

export default threeNest;