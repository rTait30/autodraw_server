import { saveConfig } from './api.js';
//import CanvasManager from './core/CanvasManager.js';
//import zeroVisualise from './steps/covers/zeroVisualise.js';
//import oneFlatten from './steps/covers/oneFlatten.js';
//import twoExtra from './steps/covers/twoExtra.js';
//import threeNest from './steps/covers/threeNest.js';



import ProcessStepper from './ProcessStepper/processStepper.js';
import { zeroVisualise, oneFlatten } from './ProcessStepper/Covers.js';

/**
 * Initializes the surgical cover estimation application.
 */
export function initSurgicalCoversOLD(mode) {

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
    }, 2000);

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
        saveButton.addEventListener('click', async () => {
            console.log("🟢 Pressed Save Surgical Covers Config Button");

            // Collect attributes and calculated data
            const attributes = getLiveSurgicalData();
            const calculated = manager.getData ? manager.getData() : {};

            // Top-level project fields
            const data = {
                name: attributes.name || '', // or get from a separate input if needed
                type: 'cover',
                client_id: localStorage.getItem('id'), // set as needed
                category: 'surgical',
                attributes,   // all form data under 'attributes'
                calculated    // all calculated data under 'calculated'
            };

            console.log("🟡 Data to submit:", data);

            // Get JWT token from localStorage
            const token = localStorage.getItem('access_token');
            if (!token) {
                alert("You must be logged in to save a project.");
                return;
            }

            try {
                const res = await fetch('/copelands/api/projects/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });
                const response = await res.json();
                if (res.ok && response.id) {
                    console.log(`✅ Config saved with ID: ${response.id}`);
                    alert(`Config saved with ID: ${response.id}`);
                } else {
                    alert(`Failed to save: ${response.error || 'Unknown error'}`);
                }
                window.loadConfigs?.();
                manager.updateAll(getLiveSurgicalData());
            } catch (err) {
                console.error("Error saving config:", err);
                alert("An error occurred while saving.");
            }
        });
    } else {
        console.warn("❌ Save button not found");
    }
}



export function initSurgicalCovers(mode) {

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

    const manager = new ProcessStepper('surgicalCanvas', {});

    // Always include step 0
    manager.addStep(zeroVisualise);

    if (mode === 'estimator') {
        manager.addStep(oneFlatten);
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
    manager.runAll(getLiveSurgicalData());


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
        manager.runAll(liveData);
    }, 2000);

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
        saveButton.addEventListener('click', async () => {
            console.log("🟢 Pressed Save Surgical Covers Config Button");

            // Collect attributes and calculated data
            const attributes = getLiveSurgicalData();
            const calculated = manager.getData ? manager.getData() : {};

            // Top-level project fields
            const data = {
                name: attributes.name || '', // or get from a separate input if needed
                type: 'cover',
                client_id: localStorage.getItem('id'), // set as needed
                category: 'surgical',
                attributes,   // all form data under 'attributes'
                calculated    // all calculated data under 'calculated'
            };

            console.log("🟡 Data to submit:", data);

            // Get JWT token from localStorage
            const token = localStorage.getItem('access_token');
            if (!token) {
                alert("You must be logged in to save a project.");
                return;
            }

            try {
                const res = await fetch('/copelands/api/projects/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });
                const response = await res.json();
                if (res.ok && response.id) {
                    console.log(`✅ Config saved with ID: ${response.id}`);
                    alert(`Config saved with ID: ${response.id}`);
                } else {
                    alert(`Failed to save: ${response.error || 'Unknown error'}`);
                }
                window.loadConfigs?.();
                manager.updateAll(getLiveSurgicalData());
            } catch (err) {
                console.error("Error saving config:", err);
                alert("An error occurred while saving.");
            }
        });
    } else {
        console.warn("❌ Save button not found");
    }
}





async function getUserRole() {
    const token = localStorage.getItem('access_token');
    if (!token) return "client";
    try {
        const res = await fetch('/copelands/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            return user.role || "client";
        }
    } catch (e) {
        console.error("Failed to fetch user role:", e);
    }
    return "client";
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Use the global variable set in base.html

    const role = await getUserRole();

    console.log(`🔍 Current User Role: ${role}`);

    initSurgicalCovers(role);
});