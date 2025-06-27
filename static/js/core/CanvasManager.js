


class CanvasManager {



    constructor(canvasId, options = {}) {
        this.canvas = canvasId ? document.getElementById(canvasId) : null;
        this.hasCanvas = !!this.canvas;

        if (canvasId && !this.canvas) {
            throw new Error(`Canvas with ID ${canvasId} not found`);
        }

        this.ctx = this.hasCanvas ? this.canvas.getContext('2d') : null;

        this.showData = options.showData || false;

        // Draw only if canvas is available and drawing is enabled
        this.draw = this.hasCanvas && options.draw !== false;

        // Internal state
        this.steps = [];
        this.scaleFactor = 0.5;
        this.stepOffsetY = 300;
        this.data = {};

    }
    


    addStep(config, dependencies = []) {
        const step = {
            title: config.title,
            drawFunction: config.drawFunction,
            data: config.initialData || {},
            dependencies: dependencies || config.dependencies || [],
            isLive: config.isLive || false,
            update: (newData) => {
                step.data = { ...step.data, ...newData };
            }
        };

        this.steps.push(step);
        //this.canvas.height = this.stepOffsetY * this.steps.length;

        return step;
    }



    getData() {
        return this.data;
    }



    async updateAll(initialData) {

        console.log('Updating all steps with initial data:', initialData);
        let currentData = initialData;

        // Clear the entire canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and redraw each step
        for (const step of this.steps) {
            currentData = await this.drawStep(step, currentData);
        }
    }
    


    async drawStep(step, newData) {
        if (newData) {
            this.data = newData;
        }

        const index = this.steps.indexOf(step);
        const offsetX = 0;
        const offsetY = index * this.stepOffsetY;

        // Set transform for scaling and positioning
        this.ctx.setTransform(this.scaleFactor, 0, 0, this.scaleFactor, offsetX, offsetY);

        // Draw function

        this.ctx.setLineDash([]);
        let updatedData;
        if (step.isAsync) {
            // Draw a placeholder while waiting for async data
            this.ctx.fillStyle = 'gray';
            this.ctx.font = '30px Arial';
            this.ctx.fillText('Loading...', this.virtualWidth / 2, this.virtualHeight / 2);

            // Wait for async operation
            updatedData = await step.drawFunction(
                this.ctx,
                this.virtualWidth,
                this.virtualHeight,
                this.data
            );
        } else {
            updatedData = step.drawFunction(
                this.ctx,
                this.virtualWidth,
                this.virtualHeight,
                this.data
            );
        }

        // Optional: Show data if enabled
        if (this.showData) {
            this.ctx.fillStyle = 'black';
            this.ctx.font = '20px Arial';
            const dataText = JSON.stringify(this.data, null, 2);
            const lines = dataText.split('\n');
            lines.forEach((line, i) => {
                this.ctx.fillText(line, 10, 100 + i * 20);
            });
        }

        return updatedData || this.data;
    }

    
}



export default CanvasManager;