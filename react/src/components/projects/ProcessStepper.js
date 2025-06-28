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
        this.scaleFactor = options.scaleFactor || 0.5;
        this.stepOffsetY = options.stepOffsetY || 400;
        this.virtualWidth = options.virtualWidth || 1000;
        this.virtualHeight = options.virtualHeight || 1000;
        this.data = {};

        console.log('ProcessStepper: created', {
            hasCanvas: this.hasCanvas,
            draw: this.draw,
        });
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
        console.log('ProcessStepper: runAll called with data', initialData);
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
            const offsetX = 0;
            const offsetY = index * this.stepOffsetY;
            this.ctx.setTransform(this.scaleFactor, 0, 0, this.scaleFactor, offsetX, offsetY);
            if (step.isAsync) {
                await step.calcFunction(this.data);
                step.drawFunction(this.ctx, this.virtualWidth, this.virtualHeight, this.data);
            } else {
                step.calcFunction(this.data);
                step.drawFunction(this.ctx, this.virtualWidth, this.virtualHeight, this.data);
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
        }

        else {
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