class ProcessStepper {
  constructor(canvasOrId = null, options = {}) {
    if (canvasOrId) {
      this.canvas =
        typeof canvasOrId === 'string'
          ? document.getElementById(canvasOrId)
          : canvasOrId;
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
    this.stepOffsetY = options.stepOffsetY || 800;
  }

  addStep(config) {
    const step = {
      id: config.id || config.title,
      title: config.title,
      calcFunction: config.calcFunction,
      drawFunction: config.drawFunction,
      isAsync: config.isAsync || false,
      provides: config.provides || [],
    };
    this.steps.push(step);
    return step;
  }

  async runAll(initialData = {}) {
    // Local state scoped only to this run
    const data = structuredClone(initialData);

    if (this.hasCanvas) {
      this.ctx.setLineDash([]);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      console.log(`Running step ${i}`);
      console.log(data);
      await this.executeStep(step, data, i);
    }

    return data;
  }

  async executeStep(step, data, index) {
    const result = step.isAsync
      ? await step.calcFunction(data)
      : step.calcFunction(data);

    // Merge step result into shared run-local data
    if (typeof result === 'object' && result !== null) {
      Object.assign(data, result);
    }

    if (this.hasCanvas && step.drawFunction) {
      const squareSize = 1000;
      const scale = this.canvas.width / squareSize;
      const offsetX = 0;
      const offsetY = index * this.stepOffsetY * scale;

      this.ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      step.drawFunction(this.ctx, squareSize, squareSize, data);

      if (this.showData) {
        this.ctx.fillStyle = 'black';
        this.ctx.font = '20px Arial';
        const dataText = JSON.stringify(data, null, 2);
        const lines = dataText.split('\n');
        lines.forEach((line, i) => {
          this.ctx.fillText(line, 10, 100 + i * 20);
        });
      }
    }
  }
}

export default ProcessStepper;
