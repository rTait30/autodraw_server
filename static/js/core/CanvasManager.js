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
        this.showData = false;
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
          // update still merges new data but doesn't auto-draw
          update: (newData) => {
            step.data = { ...step.data, ...newData };
          }
        };
    
        this.steps.push(step);
        this.resizeAll();
    
        return step;
    }

    /**
     * Updates all steps with the provided data.
     * @param {Object} data - Data to update steps (e.g., { step1: { length, width, height }, step2: { ... } }).
     */
    async updateAll(initialData) {
        let currentData = initialData;

        // Clear the entire canvas
        if (this.ctx && this.canvas) {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Update and redraw each step
        for (const step of this.steps) {
            currentData = await this.drawStep(step, currentData);
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
    
        // Save current canvas content
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.drawImage(this.canvas, 0, 0);
    
        // Calculate new dimensions
        const stepSize = wrapper.clientWidth;
        const scale = stepSize / this.virtualWidth;
        const scaledHeight = this.virtualHeight * scale;
    
        this.canvas.width = stepSize * dpr;
        this.canvas.height = scaledHeight * stepCount * dpr;
        this.canvas.style.width = `${stepSize}px`;
        this.canvas.style.height = `${scaledHeight * stepCount}px`;
    
        // Update step offsets and scaling
        this.steps.forEach((step, index) => {
            step.scale = scale;
            step.offsetX = 0;
            step.offsetY = index * scaledHeight * 2; // 🚀 use scaled height
        });
    
        // Restore saved content
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation
        this.ctx.drawImage(tempCanvas, 0, 0);
    }

    /**
     * Draws a single step, including border, title, and optional data.
     * @param {Object} step - The step to draw.
     * @private
     */


    async drawStep(step, newData) {
        if (newData) {
            this.data = newData;
        }
    
        this.ctx.setLineDash([]);
    
        const index = this.steps.indexOf(step);
        const dpr = window.devicePixelRatio || 1;
        const scale = step.scale;
        const canvasScale = scale * dpr;
    
        const offsetX = step.offsetX * canvasScale;
        const offsetY = step.offsetY * canvasScale;
    
        // 🔥 Only clear this step's canvas pixel region
        this.ctx.setTransform(canvasScale, 0, 0, canvasScale, offsetX, offsetY);
        this.ctx.clearRect(offsetX, offsetY, this.virtualWidth * canvasScale, this.virtualHeight * canvasScale);
    
        // ✅ Set transform: scale and position in canvas pixel space
        this.ctx.setTransform(canvasScale, 0, 0, canvasScale, offsetX, offsetY);
    
        // Border
        const borderColor = this.rainbowColors[index % this.rainbowColors.length];
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 10 / scale;
        this.ctx.strokeRect(0, 0, this.virtualWidth, this.virtualHeight);
    
        // Title
        /*
        this.ctx.fillStyle = 'black';
        this.ctx.font = '60px Arial';
        this.ctx.fillText(step.title, 10, 70);
        */
    
        // Draw function
        let updatedData;
        if (step.isAsync) {
            // Draw a placeholder while waiting for async data
            this.ctx.fillStyle = 'gray';
            this.ctx.font = '30px Arial';
            this.ctx.fillText('Loading...', this.virtualWidth / 2 - 50, this.virtualHeight / 2);
    
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
    
        // Ensure consistent formatting after async operations
        this.ctx.setTransform(canvasScale, 0, 0, canvasScale, offsetX, offsetY);
    
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