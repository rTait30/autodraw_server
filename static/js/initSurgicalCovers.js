import { saveConfig } from './api.js';
import CanvasManager from './core/CanvasManager.js';
import zeroVisualise from './steps/surgical/zeroVisualise.js';
import oneFlatten from './steps/surgical/oneFlatten.js';
import twoNest from './steps/surgical/twoNest.js';

/**
 * Initializes the surgical cover estimation application.
 */
export function initSurgicalCovers() {
    console.log("🔧 initSurgicalCovers called");

    // Initialize CanvasManager
    const manager = new CanvasManager('surgicalCanvas', {
        virtualWidth: 1000,
        virtualHeight: 1000
    });

    // Add placeholder steps
    const step0 = manager.addStep(zeroVisualise);
    const step1 = manager.addStep(oneFlatten);
    const step2 = manager.addStep(twoNest, [step1]);
    

    
    // Debounce helper
    function debounce(func, delay = 500) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    }

    // Shared function to get current form values
    function getLiveSurgicalData() {
        return {
            company: document.getElementById('surgicalCompany')?.value || '',
            name: document.getElementById('surgicalName')?.value || '',
            length: parseFloat(document.getElementById('surgicalLength')?.value) || 1,
            width: parseFloat(document.getElementById('surgicalWidth')?.value) || 1,
            height: parseFloat(document.getElementById('surgicalHeight')?.value) || 1,
            seam: parseFloat(document.getElementById('surgicalSeam')?.value) || 0,
            hem: parseFloat(document.getElementById('surgicalHem')?.value) || 0,
            quantity: parseInt(document.getElementById('surgicalQuantity')?.value) || 1,
            fabricwidth: parseFloat(document.getElementById('surgicalFabricWidth')?.value) || 10,
            iterations: parseInt(document.getElementById('surgicalIterations')?.value) || 10
        };
    }

    // Initial update
    const initialData = getLiveSurgicalData();
    manager.updateAll(initialData);

    // Debounced live update listener
    const handleLiveUpdate = debounce(() => {
        const liveData = getLiveSurgicalData();
        console.log("📦 Live Surgical Config Updated:", liveData);
        manager.updateAll(liveData);
    }, 500);

    // Attach live update to form inputs
    [
        'surgicalCompany',
        'surgicalName',
        'surgicalLength',
        'surgicalWidth',
        'surgicalHeight',
        'surgicalSeam',
        'surgicalHem',
        'surgicalQuantity',
        'surgicalFabricWidth',
        'surgicalIterations'
    ].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', handleLiveUpdate);
        }
    });

    // Save button logic
    const saveButton = document.getElementById("saveSurgicalBtn");
    if (saveButton) {
        console.log("✅ Found Save Surgical Covers Config Button");
        saveButton.addEventListener('click', () => {
            console.log("🟢 Pressed Save Surgical Covers Config Button");
            const data = {
                category: 'surgical',
                ...getLiveSurgicalData()
            };
            console.log("🟡 Collected Data:", data);
            saveConfig(data, "surgical").then(() => {
                window.loadConfigs?.();
                manager.updateAll({
                    step1: { length: data.length, width: data.width, height: data.height }
                });
            });
        });
    } else {
        console.warn("❌ Save button not found");
    }
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initSurgicalCovers);