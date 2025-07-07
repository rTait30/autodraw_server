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
    const initialKeys = Object.keys(initialData);
    const clone = JSON.parse(JSON.stringify(initialData));
    const cloneKeys = Object.keys(clone);

    console.log('🧪 initialData keys:', initialKeys);
    console.log('🧪 cloned keys:', cloneKeys);

    if (cloneKeys.length !== initialKeys.length) {
      console.warn('❗ DATA MUTATED BEFORE CLONING — keys changed');
    }

    

    if (this.hasCanvas) {
      this.ctx.setLineDash([]);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      console.log(`Running step ${i}`);
      await this.executeStep(step, clone, i);
    }

    this.data = clone; // Store final data in stepper instance

    return clone; // ✅ returns only local result
  }

  async executeStep(step, data, index) {
    console.groupCollapsed(`🧪 Step ${index}: ${step.title}`);

    // Log keys seen by the calcFunction
    console.log('📥 Data before calcFunction:', JSON.parse(JSON.stringify(data)));

    // Run the calculation
    const result = step.isAsync
      ? await step.calcFunction(data)
      : step.calcFunction(data);

    // Merge returned result into data
    if (typeof result === 'object' && result !== null) {
      Object.assign(data, result);
    }

    console.log('📤 Data after calcFunction (merged):', JSON.parse(JSON.stringify(data)));

    // Draw step if applicable
    if (this.hasCanvas && step.drawFunction) {
      const squareSize = 1000;
      const scale = this.canvas.width / squareSize;
      const offsetX = 0;
      const offsetY = index * this.stepOffsetY * scale;

      this.ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

      console.log('🎨 Drawing with data:', JSON.parse(JSON.stringify(data)));
      step.drawFunction(this.ctx, squareSize, squareSize, data);
    }

    console.groupEnd();
  }

  getData() {
    return this.data || {};
  }
}

export default ProcessStepper;
