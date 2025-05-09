import { saveConfig } from './api.js';

export function setupSurgicalForm() {
    console.log("🔧 setupSurgicalForm called");

    const saveButton = document.getElementById("saveSurgicalBtn");
    if (saveButton) {
        console.log("✅ Found Save Surgical Covers Config Button");

        saveButton.addEventListener('click', () => {
            console.log("🟢 Pressed Save Surgical Covers Config Button");

            const data = {
                category: 'surgical',
                company: document.getElementById('surgicalCompany')?.value || '',
                name: document.getElementById('surgicalName')?.value || '',
                length: parseFloat(document.getElementById('surgicalLength')?.value) || 0,
                width: parseFloat(document.getElementById('surgicalWidth')?.value) || 0,
                height: parseFloat(document.getElementById('surgicalHeight')?.value) || 0,
                seam: parseFloat(document.getElementById('surgicalSeam')?.value) || 0,
                hem: parseFloat(document.getElementById('surgicalHem')?.value) || 0,
                quantity: parseInt(document.getElementById('surgicalQuantity')?.value) || 0
            };

            console.log("🟡 Collected Data:", data);

            saveConfig(data, "surgical").then(() => {
                
                window.loadConfigs?.();
            });
        });
    } else {
        console.warn("❌ Save button inside #formSurgical not found");
    }
}