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
        this.steps = [];
        this.rainbowColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];
        this.animationFrameId = null;
        this.resizeHandler = this.resizeAll.bind(this);
        window.addEventListener('resize', this.resizeHandler);
        this.animate = this.animate.bind(this);
        this.resizeAll();
        this.animate();
    }

    /**
     * Adds a new step to the visualization.
     * @param {Object} config - Step configuration.
     * @param {string} config.title - Step title.
     * @param {Function} config.drawFunction - Function to draw the step (ctx, width, height, data, depData).
     * @param {Object} [config.initialData={}] - Initial data for the step.
     * @param {Array} [config.dependencies=[]] - Array of dependent steps.
     * @param {boolean} [config.isLive=false] - Whether the step is live (animated).
     * @returns {Object} The created step object with an update method.
     */
    addStep({ title, drawFunction, initialData = {}, dependencies = [], isLive = false }) {
        const step = {
            title,
            drawFunction,
            data: initialData,
            dependencies,
            isLive,
            /**
             * Updates the step's data and redraws if not live.
             * @param {Object} newData - New data to merge with existing data.
             */
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
     * Resizes the canvas to fit the wrapper, scaling steps to fill the full width and adjusting height by step count.
     * @private
     */
    resizeAll() {
        const wrapper = this.canvas.parentElement;
        const maxWidth = Math.min(wrapper.clientWidth, 600); // Respect wrapper's max-width: 600px
        const stepCount = this.steps.length || 1;
        const virtualAspectRatio = this.virtualWidth / this.virtualHeight; // 1:1 for 1000x1000
        
        // Calculate step dimensions to maximize width
        let stepWidth = maxWidth;
        let stepHeight = stepWidth / virtualAspectRatio; // Maintain 1:1 virtual aspect ratio
        
        // Set canvas dimensions
        this.canvas.width = stepWidth * window.devicePixelRatio;
        this.canvas.height = stepHeight * stepCount * window.devicePixelRatio;
        this.canvas.style.width = `${stepWidth}px`;
        this.canvas.style.height = `${stepHeight * stepCount}px`;
        
        // Update step scales and offsets
        this.steps.forEach((step, index) => {
            // Scale to fill the canvas width
            step.scale = stepWidth / this.virtualWidth;
            step.offsetX = 0;
            step.offsetY = index * stepHeight * window.devicePixelRatio;
        });
        
        // Redraw non-live steps
        this.steps.forEach(step => {
            if (!step.isLive) {
                this.drawStep(step);
            }
        });
    }

    /**
     * Draws a single step, including border and title.
     * @param {Object} step - The step to draw.
     * @private
     */
    drawStep(step) {
        const index = this.steps.indexOf(step);
        this.ctx.save();
        this.ctx.translate(step.offsetX, step.offsetY / window.devicePixelRatio);
        this.ctx.scale(step.scale, step.scale);
        
        this.ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);
        
        // Draw rainbow border
        const borderColor = this.rainbowColors[index % this.rainbowColors.length];
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 10;
        this.ctx.strokeRect(0, 0, this.virtualWidth, this.virtualHeight);
        
        // Draw step title
        this.ctx.fillStyle = 'black';
        this.ctx.font = '40px Arial';
        this.ctx.fillText(step.title, 50, 50);
        
        // Draw step content
        const depData = step.dependencies.map(dep => dep.data);
        step.drawFunction(this.ctx, this.virtualWidth, this.virtualHeight, step.data, depData);
        
        this.ctx.restore();
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