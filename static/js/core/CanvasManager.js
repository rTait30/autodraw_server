/**
 * Manages a multi-step visualization on a single canvas, supporting static and live steps.
 * @class
 */
class CanvasManager {
    /**
     * Creates a new CanvasManager instance.
     * @param {string} canvasId - ID of the canvas element.
     * @param {Object} [options] - Configuration options.
     * @param {number} [options.virtualWidth=1000] - Virtual canvas width per step.
     * @param {number} [options.virtualHeight=1000] - Virtual canvas height per step.
     * @param {boolean} [options.showData=false] - Whether to display step data as text.
     * @throws {Error} If canvasId is not found.
     */
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas with ID ${canvasId} not found`);
        }
        this.ctx = this.canvas.getContext('2d');
        this.virtualWidth = options.virtualWidth || 1000;
        this.virtualHeight = options.virtualHeight || 1000;
        this.showData = true;
        this.steps = [];
        this.rainbowColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];
        this.animationFrameId = null;
        this.resizeHandler = this.resizeAll.bind(this);
        window.addEventListener('resize', this.resizeHandler);
        this.animate = this.animate.bind(this);
        this.resizeAll();
        this.animate();


        this.data = {};
    }

    /**
     * Adds a new step to the visualization.
     * @param {Object} config - Step configuration or constructor.
     * @param {Array} [dependencies=[]] - Array of dependent steps.
     * @returns {Object} The created step object with an update method.
     */
    addStep(config, dependencies = []) {
        const step = {
            title: config.title,
            drawFunction: config.drawFunction,
            data: config.initialData || {},
            dependencies: dependencies || config.dependencies || [],
            isLive: config.isLive || false,
            update: (newData) => {
                step.data = { ...step.data, ...newData };
                if (!step.isLive) {
                    this.drawStep(step);
                    this.steps.forEach(s => {
                        if (s.dependencies.includes(step) && !s.isLive) {
                            this.drawStep(s);
                        }
                    });
                }
            }
        };
        
        this.steps.push(step);
        this.resizeAll();
        if (!step.isLive) {
            this.drawStep(step);
        }
        
        return step;
    }

    /**
     * Updates all steps with the provided data.
     * @param {Object} data - Data to update steps (e.g., { step1: { length, width, height }, step2: { ... } }).
     */
    updateAll(initialData) {
        let currentData = initialData;
        for (const step of this.steps) {
            currentData = this.drawStep(step, currentData);
        }
    }

    /**
     * Resizes the canvas to fit the wrapper, scaling steps to fill the full width and adjusting height by step count.
     * @private
     */
    resizeAll() {
        const wrapper = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const stepCount = this.steps.length || 1;
        const virtualAspectRatio = this.virtualWidth / this.virtualHeight;

        // Use wrapper's full clientWidth, respecting CSS max-width: 600px
        let stepSize = wrapper.clientWidth;

        // Set canvas pixel dimensions for DPR, CSS dimensions for display
        this.canvas.width = stepSize * dpr;
        this.canvas.height = stepSize * stepCount * dpr;
        this.canvas.style.width = `${stepSize}px`;
        this.canvas.style.height = `${stepSize * stepCount}px`;

        // Scale steps to fit
        this.steps.forEach((step, index) => {
            step.scale = stepSize / this.virtualWidth;
            step.offsetX = 0;
            step.offsetY = index * stepSize * dpr * 2; //idk really know why * 2 grok did this
        });

        // Redraw non-live steps
        /*
        this.steps.forEach(step => {
            if (!step.isLive) {
                this.drawStep(step);
            }
        });*/
    }

    /**
     * Draws a single step, including border, title, and optional data.
     * @param {Object} step - The step to draw.
     * @private
     */


    drawStep(step, newData) {

        
        if (newData) {

            this.data = newData;
        }

        const index = this.steps.indexOf(step);
        const dpr = window.devicePixelRatio || 1;
        this.ctx.save();
        this.ctx.translate(step.offsetX, step.offsetY / dpr);
        this.ctx.scale(step.scale * dpr, step.scale * dpr);

        this.ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);

        // Draw rainbow border
        const borderColor = this.rainbowColors[index % this.rainbowColors.length];
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 10 / step.scale;
        this.ctx.strokeRect(0, 0, this.virtualWidth, this.virtualHeight);

        // Draw step title
        this.ctx.fillStyle = 'black';
        this.ctx.font = '60px Arial';
        this.ctx.fillText(step.title, 10, 70);



        // Draw step content and get updated data
        const updatedData = step.drawFunction(this.ctx, this.virtualWidth, this.virtualHeight, this.data);

        // Draw step data if showData is true
        if (this.showData) {
            let yOffset = 100;
            this.ctx.font = '20px Arial';
        
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
        
            Object.entries(this.data).forEach(([key, value]) => {
                yOffset = drawKeyValue(this.ctx, key, value, 10, yOffset, 0);
            });
        }

        this.ctx.restore();

        return updatedData || data; // Return updated data or original if unchanged
    }

    /**
     * Animates live steps using requestAnimationFrame.
     * @private
     */
    animate() {
        this.steps.forEach(step => {
            if (step.isLive) {
                this.drawStep(step);
            }
        });
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    /**
     * Cleans up resources and removes event listeners.
     */
    destroy() {
        window.removeEventListener('resize', this.resizeHandler);
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.steps = [];
    }
}

export default CanvasManager;