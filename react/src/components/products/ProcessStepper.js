export class ProcessStepper {

  constructor(stepOffsetY = 1000, showData = false) {

    this.canvas = null;
    this.ctx = null;
    this.hasCanvas = false;
    this.draw = false;

    this.showData = showData;
    this.steps = [];
    this.stepOffsetY = stepOffsetY;

    this.data = {}
  }

  addCanvas(canvas) {

    this.canvas = canvas

    this.ctx = this.canvas.getContext('2d');
    this.hasCanvas = true;
    this.draw = true;
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

    // Debug: check canvas and context
    console.log('ProcessStepper.runAll: canvas', this.canvas);
    console.log('ProcessStepper.runAll: ctx', this.ctx);



    if (!this.ctx) {
      console.warn('❗ No canvas context available. Cannot draw.');
    } else {
      this.ctx.fillStyle = "#0ea5e9";        // any CSS color: "red", "#ff0", "rgba(0,0,0,.5)", "hsl(200 80% 50%)"
      this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      this.ctx.fillStyle = '#b00020';
      this.ctx.font = '32px sans-serif';
      this.ctx.fillText(`CANVAS ACTIVE`, 200, 200);
    }

    //const initialKeys = Object.keys(initialData);
    //const clone = JSON.parse(JSON.stringify(initialData));
    //const cloneKeys = Object.keys(clone);

    //console.log('🧪 initialData keys:', initialKeys);
    //console.log('🧪 cloned keys:', cloneKeys);

    /*
    if (cloneKeys.length !== initialKeys.length) {
      console.warn('❗ DATA MUTATED BEFORE CLONING — keys changed');
    }

    */

    if (this.hasCanvas) {
      this.ctx.setLineDash([]);
      //this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.data = structuredClone(initialData);
    const originalKeys = Object.keys(initialData);

    console.log("initial data: ", initialData)

    const { ctx, stepOffsetY } = this;

    for (let i = 0; i < this.steps.length; i++) {
      // compute data first
      this.data = await this.steps[i].calcFunction(this.data);

      if (i === 0) {
        // draw first step with no shift
        this.steps[i].drawFunction(ctx, this.data);
        continue;
      }

      // draw step i shifted by i * stepOffsetY

      console.log("stepOffsetY", stepOffsetY);

      ctx.save();
      ctx.translate(0, i * stepOffsetY);
      this.steps[i].drawFunction(ctx, this.data);
      ctx.restore();
    }
    const scale = 100;
    // Offset Y in canvas pixels
    //const offsetY = index * this.stepOffsetY * scale;

    // Reset then apply scale and translation
    //this.ctx.scale(2, 2);

    // Split final result into original vs new fields
    const attributes = {};
    const calculated = {};

    for (const [key, value] of Object.entries(this.data)) {
      if (originalKeys.includes(key)) attributes[key] = value;
      else calculated[key] = value;
    }

    return { calculated };
  }

  async executeStep(step, data, index) {
    //console.groupCollapsed(`🧪 Step ${index}: ${step.title}`);

    try {
      console.log('📥 Data before calcFunction:', JSON.parse(JSON.stringify(data)));

      let result;
      try {
        result = step.isAsync
          ? await step.calcFunction(data)
          : step.calcFunction(data);
      } catch (calcError) {
        console.error(`❌ Error in calcFunction (Step ${index} "${step.title}"):`, calcError);
        data._errors = data._errors || {};
        data._errors[`calc_${step.id}`] = calcError.message || 'Unknown calc error';
        return; // Skip drawing if calculation failed
      }

      console.log('📤 Data after calcFunction (merged ):', JSON.parse(JSON.stringify(data)));

      if (this.hasCanvas && step.drawFunction) {
        // Scale so 1000 units = canvas width
        //const scale = this.canvas.width / 1000;


        // Draw the step
        step.drawFunction(this.ctx, data);

        // Optionally reset transform after drawing
        //this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      return (data);
    } finally {
      //console.groupEnd();
    }
  }

  getData() {
    return this.data || {};
  }
}
