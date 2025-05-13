class CanvasManager {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with ID ${containerId} not found`);
        }
        this.virtualWidth = options.virtualWidth || 1000;
        this.virtualHeight = options.virtualHeight || 1000;
        this.steps = [];
        this.rainbowColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];
        this.animationFrameId = null;
        this.resizeHandler = this.resizeAll.bind(this);
        window.addEventListener('resize', this.resizeHandler);
        this.animate = this.animate.bind(this);
        this.animate();
    }

    addStep({ title, drawFunction, initialData = {}, dependencies = [], isLive = false }) {
        const stepContainer = document.createElement('div');
        stepContainer.className = 'step-container';
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        stepContainer.appendChild(canvas);
        this.container.appendChild(stepContainer);
        
        const step = {
            canvas,
            ctx,
            title,
            drawFunction,
            data: initialData,
            dependencies,
            isLive,
            scale: 1,
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
        this.resizeStep(step);
        if (!step.isLive) {
            this.drawStep(step);
        }
        
        return step;
    }

    resizeStep(step) {
        const maxWidth = this.container.clientWidth;
        const maxHeight = this.container.clientHeight / (this.steps.length || 1);
        
        const aspectRatio = this.virtualWidth / this.virtualHeight;
        let width = maxWidth;
        let height = width / aspectRatio;
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
        
        step.canvas.width = width * window.devicePixelRatio;
        step.canvas.height = height * window.devicePixelRatio;
        step.canvas.style.width = `${width}px`;
        step.canvas.style.height = `${height}px`;
        
        step.scale = Math.min(
            step.canvas.width / (this.virtualWidth * window.devicePixelRatio),
            step.canvas.height / (this.virtualHeight * window.devicePixelRatio)
        );
        
        step.ctx.setTransform(
            step.scale * window.devicePixelRatio,
            0,
            0,
            step.scale * window.devicePixelRatio,
            (step.canvas.width - this.virtualWidth * step.scale * window.devicePixelRatio) / 2,
            (step.canvas.height - this.virtualHeight * step.scale * window.devicePixelRatio) / 2
        );
    }

    resizeAll() {
        this.steps.forEach(step => this.resizeStep(step));
        this.steps.forEach(step => {
            if (!step.isLive) {
                this.drawStep(step);
            }
        });
    }

    drawStep(step) {
        step.ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);
        step.ctx.save();
        
        // Draw rainbow border
        const borderColor = this.rainbowColors[this.steps.indexOf(step) % this.rainbowColors.length];
        step.ctx.strokeStyle = borderColor;
        step.ctx.lineWidth = 10;
        step.ctx.strokeRect(0, 0, this.virtualWidth, this.virtualHeight);
        
        // Draw step title
        step.ctx.fillStyle = 'black';
        step.ctx.font = '40px Arial';
        step.ctx.fillText(step.title, 50, 50);
        
        // Draw step content
        const depData = step.dependencies.map(dep => dep.data);
        step.drawFunction(step.ctx, this.virtualWidth, this.virtualHeight, step.data, depData);
        step.ctx.restore();
    }

    animate() {
        this.steps.forEach(step => {
            if (step.isLive) {
                this.drawStep(step);
            }
        });
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    destroy() {
        window.removeEventListener('resize', this.resizeHandler);
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.container.innerHTML = '';
        this.steps = [];
    }
}