export class VirtualCanvas {
    constructor(canvas, virtualWidth = 1000, virtualHeight = 4000) {
        this.canvas = canvas;
        this.virtualWidth = virtualWidth;
        this.virtualHeight = virtualHeight;
        this.ctx = canvas.getContext('2d');
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        const width = Math.floor(rect.width * dpr);
        const height = Math.floor(rect.height * dpr);

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
        this.ctx.clearRect(0, 0, width, height);

        this.scale = Math.min(width / this.virtualWidth, height / this.virtualHeight);
        this.offsetX = (width - this.virtualWidth * this.scale) / 2;
        this.offsetY = (height - this.virtualHeight * this.scale) / 2;

        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);
    }

    withStep(stepIndex, drawFn) {
        const ctx = this.ctx;
        const yOffset = stepIndex * 1000;

        ctx.save();
        ctx.translate(0, yOffset); // move into the step's region
        drawFn(ctx); // draw inside 1000x1000 space
        ctx.restore();
    }

    finish() {
        this.ctx.restore(); // restore base transform
    }
}
