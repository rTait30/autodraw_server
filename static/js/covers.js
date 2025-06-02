import { saveConfig } from './api.js';
import CanvasManager from './core/CanvasManager.js';
import zeroVisualise from './steps/covers/zeroVisualise.js';
import oneFlatten from './steps/covers/oneFlatten.js';
import twoExtra from './steps/covers/twoExtra.js';
import threeNest from './steps/covers/threeNest.js';

/**
 * Initializes the surgical cover estimation application.
 */
export function initSurgicalCovers(mode = "estimator") {

    mode = "estimator"

    console.log(`🔧 initSurgicalCovers called (mode: ${mode})`);

    // Adjust canvas height for estimator
    const canvas = document.getElementById('surgicalCanvas');
    if (canvas) {
        if (mode === 'estimator') {
            canvas.height = 2000; // or any height you want for estimator
            canvas.width = 1000
        } else {
            canvas.height = 500; // default for client
        }
    }

    const manager = new CanvasManager('surgicalCanvas', {});

    // Always include step 0
    manager.addStep(zeroVisualise);

    if (mode === 'estimator') {
        manager.addStep(oneFlatten);
        manager.addStep(twoExtra);
        manager.addStep(threeNest);
    }
    

    // Shared function to get current form values
    function getLiveSurgicalData() {
        const base = {
            company: document.getElementById('surgicalCompany')?.value || '',
            name: document.getElementById('surgicalName')?.value || '',
            length: parseFloat(document.getElementById('surgicalLength')?.value) || 1,
            width: parseFloat(document.getElementById('surgicalWidth')?.value) || 1,
            height: parseFloat(document.getElementById('surgicalHeight')?.value) || 1,
            seam: parseFloat(document.getElementById('surgicalSeam')?.value) || 0,
            hem: parseFloat(document.getElementById('surgicalHem')?.value) || 0,
            quantity: parseInt(document.getElementById('surgicalQuantity')?.value) || 1,
            zips: document.getElementById('surgicalZips')?.checked || false,
            stayputs: document.getElementById('surgicalStayPuts')?.checked || false,
            notes: document.getElementById('surgicalNotes')?.value || ''
        };

        if (mode === 'estimator') {
            base.fabricWidth = parseFloat(document.getElementById('surgicalFabricWidth')?.value) || 1;
            base.iterations = parseInt(document.getElementById('surgicalIterations')?.value) || 1;
        }

        if (mode === 'client') {

        }

        return base;
    }

    // Initial update
    //const initialData = getLiveSurgicalData();
    manager.updateAll(getLiveSurgicalData());


    // Debounce helper
    function debounce(func, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    }

    const handleLiveUpdate = debounce(() => {
        const liveData = getLiveSurgicalData();
        console.log("📦 Live Surgical Config Updated:", liveData);
        manager.updateAll(liveData);
    }, 100);

    // Attach live update to inputs
    const fieldIds = [
        'surgicalCompany',
        'surgicalName',
        'surgicalLength',
        'surgicalWidth',
        'surgicalHeight',
        'surgicalSeam',
        'surgicalHem',
        'surgicalQuantity',
    ];

    if (mode === 'estimator') {
        fieldIds.push('surgicalFabricWidth', 'surgicalIterations');
    }
    
    if (mode === 'client') {
        fieldIds.push('surgicalZips', 'surgicalStayPuts', 'surgicalNotes');
    }

    fieldIds.forEach(id => {
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
                manager.updateAll(getLiveSurgicalData());
            });
        });
    } else {
        console.warn("❌ Save button not found");
    }
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Default to "client" if not set
    const mode = window.surgicalUserRole || "client";
    initSurgicalCovers(mode);
});