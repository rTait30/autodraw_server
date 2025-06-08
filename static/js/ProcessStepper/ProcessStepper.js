class StepRunner {
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
        this.stepOffsetY = options.stepOffsetY || 300;
        this.virtualWidth = options.virtualWidth || 1000;
        this.virtualHeight = options.virtualHeight || 1000;
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
        this.data = { ...this.data, ...initialData };

        if (this.hasCanvas) {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        for (const step of this.steps) {
            await this.executeStep(step);
        }

        return this.data;
    }

    async executeStep(step) {
        const needsCalc = step.provides.length === 0 || step.provides.some(k => !(k in this.data));

        if (needsCalc && step.calcFunction) {
            const result = step.calcFunction({ ...this.data });
            this.data = result instanceof Promise ? await result : result;
        }

        if (this.hasCanvas && this.draw && step.drawFunction) {
            const index = this.steps.indexOf(step);
            const offsetX = 0;
            const offsetY = index * this.stepOffsetY;
            this.ctx.setTransform(this.scaleFactor, 0, 0, this.scaleFactor, offsetX, offsetY);
            if (step.isAsync) {
                await step.drawFunction(this.ctx, this.virtualWidth, this.virtualHeight, this.data);
            } else {
                step.drawFunction(this.ctx, this.virtualWidth, this.virtualHeight, this.data);
            }
        }

        if (this.showData && this.hasCanvas) {
            this.ctx.fillStyle = 'black';
            this.ctx.font = '20px Arial';
            const dataText = JSON.stringify(this.data, null, 2);
            const lines = dataText.split('\n');
            lines.forEach((line, i) => {
                this.ctx.fillText(line, 10, 100 + i * 20);
            });
        }
    }

    getData() {
        return this.data;
    }
}

export default StepRunner;