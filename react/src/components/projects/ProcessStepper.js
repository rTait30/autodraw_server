class ProcessStepper  {
    constructor(canvasOrId = null, options = {}) {
        if (canvasOrId) {
            this.canvas = typeof canvasOrId === 'string' ? document.getElementById(canvasOrId) : canvasOrId;
            if (!this.canvas) {
                throw new Error(`Canvas not found: ${canvasOrId}`);
            }
            this.ctx = this.canvas.getContext('2d');
            this.hasCanvas = true;
            this.draw = options.draw !== false;
        } else {
            this.canvas = null;
            this.ctx = null;
            this.hasCanvas = false;
            this.draw = false;
        }

        this.showData = options.showData || false;
        this.steps = [];
        this.stepOffsetY = options.stepOffsetY || 800; // Each step gets a 1000px square by default
        this.data = {};

    }

    addStep(config) {
        const step = {
            id: config.id || config.title,
            title: config.title,
            calcFunction: config.calcFunction,
            drawFunction: config.drawFunction,
            isAsync: config.isAsync || false,
            provides: config.provides || []
        };
        this.steps.push(step);
        
        return step;
    }

    async runAll(initialData = {}) {
        this.data = initialData;

        if (this.hasCanvas) {
            this.ctx.setLineDash([]);
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        for (const step of this.steps) {
            await this.executeStep(step);
        }

        return this.data;
    }

    async executeStep(step) {
        if (this.hasCanvas) {
            const index = this.steps.indexOf(step);
            // Each step gets a 1000x1000 square, scaled to fit the canvas width
            const squareSize = 1000;
            const scale = this.canvas.width / squareSize;
            const offsetX = 0;
            const offsetY = index * this.stepOffsetY * scale;

            this.ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

            if (step.isAsync) {
                await step.calcFunction(this.data);
                step.drawFunction(this.ctx, squareSize, squareSize, this.data);
            } else {
                step.calcFunction(this.data);
                step.drawFunction(this.ctx, squareSize, squareSize, this.data);
            }

            if (this.showData) {
                this.ctx.fillStyle = 'black';
                this.ctx.font = '20px Arial';
                const dataText = JSON.stringify(this.data, null, 2);
                const lines = dataText.split('\n');
                lines.forEach((line, i) => {
                    this.ctx.fillText(line, 10, 100 + i * 20);
                });
            }
        } else {
            if (step.isAsync) {
                await step.calcFunction(this.data);
            } else {
                step.calcFunction(this.data);
            }
        }
    }

    getData() {
        return this.data;
    }
}

export default ProcessStepper;