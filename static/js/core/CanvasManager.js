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
    async addStep(config, dependencies = []) {
        const step = {
            title: config.title,
            drawFunction: config.drawFunction,
            data: config.initialData || {},
            dependencies: dependencies || config.dependencies || [],
            isLive: config.isLive || false,
            update: async (newData) => {
                step.data = { ...step.data, ...newData };
                if (!step.isLive) {
                    await this.drawStep(step);
                    for (const s of this.steps) {
                        if (s.dependencies.includes(step) && !s.isLive) {
                            await this.drawStep(s);
                        }
                    }
                }
            }
        };
    
        this.steps.push(step);
        this.resizeAll();

        
        if (!step.isLive) {
            await this.drawStep(step);
        }
        
    
        return step;
    }

    /**
     * Updates all steps with the provided data.
     * @param {Object} data - Data to update steps (e.g., { step1: { length, width, height }, step2: { ... } }).
     */
    async updateAll(initialData) {
        let currentData = initialData;

        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        for (const step of this.steps) {
            const result = await this.drawStep(step, currentData);
            currentData = result ?? currentData;
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
    
        let stepSize = wrapper.clientWidth;

            
        const scale = stepSize / this.virtualWidth;
    
        const scaledHeight = this.virtualHeight * scale;
    
        this.canvas.width = stepSize * dpr;
        this.canvas.height = scaledHeight * stepCount * dpr;
        this.canvas.style.width = `${stepSize}px`;
        this.canvas.style.height = `${scaledHeight * stepCount}px`;


        this.steps.forEach((step, index) => {
            step.scale = scale;
            step.offsetX = 0;
            step.offsetY = index * scaledHeight * 1.67; // 🚀 use scaled height
        });
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
        this.ctx.fillStyle = 'black';
        this.ctx.font = '60px Arial';
        this.ctx.fillText(step.title, 10, 70);
    
        // Draw function
        const updatedData = await step.drawFunction(
            this.ctx,
            this.virtualWidth,
            this.virtualHeight,
            this.data
        );
    
        // Optional data overlay
        if (this.showData) {
            let yOffset = 100;
            this.ctx.font = '20px Arial';
    
            function drawKeyValue(ctx, key, value, x, y, indentLevel = 0) {
                const indent = '    '.repeat(indentLevel);
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
                yOffset = drawKeyValue(this.ctx, key, value, 50, yOffset, 0);
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