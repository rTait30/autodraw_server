import { saveConfig } from './api.js';
import CanvasManager from './core/CanvasManager.js';
import Box3DStep from './steps/surgical/box3d.js';

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
    const step1 = manager.addStep(Box3DStep);
    


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
            length: parseFloat(document.getElementById('surgicalLength')?.value) || 100,
            width: parseFloat(document.getElementById('surgicalWidth')?.value) || 100,
            height: parseFloat(document.getElementById('surgicalHeight')?.value) || 100,
            seam: parseFloat(document.getElementById('surgicalSeam')?.value) || 0,
            hem: parseFloat(document.getElementById('surgicalHem')?.value) || 0,
            quantity: parseInt(document.getElementById('surgicalQuantity')?.value) || 1,
            fabricwidth: parseFloat(document.getElementById('surgicalFabricWidth')?.value) || 1500,
            iterations: parseInt(document.getElementById('surgicalIterations')?.value) || 100
        };
    }

    // Initial update
    const initialData = getLiveSurgicalData();
    manager.updateAll({
        step1: { length: initialData.length, width: initialData.width, height: initialData.height },
        step2: { length: initialData.length, width: initialData.width, height: initialData.height, seam: initialData.seam, hem: initialData.hem },
        step3: { fabricWidth: initialData.fabricwidth, iterations: initialData.iterations }
    });

    // Debounced live update listener
    const handleLiveUpdate = debounce(() => {
        const liveData = getLiveSurgicalData();
        console.log("📦 Live Surgical Config Updated:", liveData);
        manager.updateAll({
            step1: { length: liveData.length, width: liveData.width, height: liveData.height }
            

        });
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
                    step1: { length: data.length, width: data.width, height: data.height },
                    step2: { length: data.length, width: data.width, height: data.height, seam: data.seam, hem: data.hem },
                    step3: { fabricWidth: data.fabricwidth, iterations: data.iterations }
                });
            });
        });
    } else {
        console.warn("❌ Save button not found");
    }
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initSurgicalCovers);