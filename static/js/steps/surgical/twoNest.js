const twoNest = {
    title: 'Step 2: Nest in fabric',
    initialData: { },
    dependencies: [],
    isLive: false,

    drawFunction: (ctx, virtualWidth, virtualHeight, data) => {



        // ----------------------------------- DRAW -------------------------------------------


        let i = 0

        ctx.fillText(`flatMainHeight: ${data.flatMainHeight}`, 20, 500 + i++ * 25);
        ctx.fillText(`flatMainWidth: ${flatMainWidth}`, 20, 500 + i++ * 25);


        // ----------------------------------- END DRAW --------------------------------------

        return data;
        
    } 
};

export default twoNest;