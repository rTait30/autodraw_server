import { saveConfig } from './api.js';
import CanvasManager from './core/CanvasManager.js';
import zeroVisualise from './steps/surgical/zeroVisualise.js';
import oneFlatten from './steps/surgical/oneFlatten.js';
import twoExtra from './steps/surgical/twoExtra.js';
import threeNest from './steps/surgical/threeNest.js';

/**
 * Initializes the surgical cover estimation application.
 */
export function initSurgicalCovers() {
    console.log("🔧 initSurgicalCovers called");

    // Initialize CanvasManager
    const manager = new CanvasManager('surgicalCanvas', {});

    // Add placeholder steps
    const step0 = manager.addStep(zeroVisualise);
    const step1 = manager.addStep(oneFlatten);
    const step2 = manager.addStep(twoExtra);
    const step3 = manager.addStep(threeNest);
    

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
            fabricWidth: parseFloat(document.getElementById('surgicalFabricWidth')?.value) || 1
        };
    }

    // Initial update
    const initialData = getLiveSurgicalData();
    manager.updateAll(initialData);


    // Debounce helper
    function debounce(func, delay = 2000) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    }

    // Debounced live update listener
    const handleLiveUpdate = debounce(() => {
        const liveData = getLiveSurgicalData();
        console.log("📦 Live Surgical Config Updated:", liveData);
        manager.updateAll(liveData);
    }, 2000);

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
            saveConfig(data, "surgical").then(response => {
                if (response.id) {
                    console.log(`✅ Config saved with ID: ${response.id}`);
                    alert(`Config saved with ID: ${response.id}`);
                }
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