/**
 * Manages a multi-step visualization on a single canvas.
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

        // Configuration options
        this.virtualWidth = options.virtualWidth || 1000;
        this.virtualHeight = options.virtualHeight || 1000;
        this.showData = options.showData || false;

        // Internal state
        this.steps = [];
        this.scaleFactor = 0.5; // Hardcoded scaling factor for easy adjustment
        this.stepOffsetY = 400; // Vertical offset between steps
        this.data = {};

        // Initialize canvas dimensions
        //this.canvas.width = this.virtualWidth;
        //this.canvas.height = this.virtualHeight;

        // Bind methods
        this.animate = this.animate.bind(this);
        this.animationFrameId = null;

        // Start animation loop
        this.animate();
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
            }
        };

        this.steps.push(step);
        //this.canvas.height = this.stepOffsetY * this.steps.length;

        return step;
    }
    
    /**
     * Updates all steps with the provided data.
     * @param {Object} initialData - Data to update steps.
     */
    async updateAll(initialData) {
        let currentData = initialData;

        // Clear the entire canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and redraw each step
        for (const step of this.steps) {
            currentData = await this.drawStep(step, currentData);
        }
    }

    /**
     * Draws a single step, including optional data display.
     * @param {Object} step - The step to draw.
     * @param {Object} newData - Data to pass to the step's draw function.
     * @returns {Object} Updated data from the step.
     */
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

    /**
     * Animates live steps using requestAnimationFrame.
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
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.steps = [];
    }
}

export default CanvasManager;