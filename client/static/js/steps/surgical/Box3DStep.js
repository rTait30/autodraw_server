import CanvasManager from './core/CanvasManager.js';
import SurgicalCoverForm from './forms/SurgicalCoverForm.js';
import Box3DStep from './steps/surgicalCovers/Box3DStep.js';

/**
 * Initializes the surgical cover estimation application.
 */
function init() {
    // Initialize CanvasManager
    const manager = new CanvasManager('surgicalCanvas', {
        virtualWidth: 1000,
        virtualHeight: 1000
    });

    // Add Step 1: 3D Box
    const step1 = manager.addStep(Box3DStep);
    const step2 = manager.addStep(Box3DStep);

    // Placeholder for Step 2: Flatten Panels
    // const step2 = manager.addStep({
    //     title: 'Step 2: Flattened Panels',
    //     drawFunction: (ctx, width, height, data, depData) => {
    //         // TODO: Draw flattened panels using depData[0] (step1.data)
    //         ctx.fillStyle = 'black';
    //         ctx.font = '40px Arial';
    //         ctx.fillText('Placeholder: Flattened Panels', 50, 100);
    //     },
    //     initialData: {},
    //     dependencies: [step1]
    // });

    // Placeholder for Step 3: Nesting
    // const step3 = manager.addStep({
    //     title: 'Step 3: Panel Nesting',
    //     drawFunction: (ctx, width, height, data, depData) => {
    //         // TODO: Draw nested panels using depData[0] (step2.data)
    //         ctx.fillStyle = 'black';
    //         ctx.font = '40px Arial';
    //         ctx.fillText('Placeholder: Nested Panels', 50, 100);
    //     },
    //     initialData: {},
    //     dependencies: [step2]
    // });

    // Initialize Form with debounced updates
    SurgicalCoverForm.init('formSurgical', (data) => {
        step1.update({
            length: data.length,
            width: data.width,
            height: data.height
        });
        step2.update({
            length: data.length,
            width: data.width,
            height: data.height
        });
        // TODO: Update step2 and step3 with relevant data
        // step2.update({ seam: data.seam, hem: data.hem });
        // step3.update({ fabricWidth: data.fabricWidth, iterations: data.iterations });
    });
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', init);