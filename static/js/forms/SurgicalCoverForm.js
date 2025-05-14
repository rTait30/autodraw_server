/**
 * Manages the surgical cover configuration form.
 * @class
 */
class SurgicalCoverForm {
    /**
     * Initializes the form and attaches event listeners.
     * @param {string} formId - ID of the form element.
     * @param {Function} onSubmit - Callback to handle form data.
     */
    static init(formId, onSubmit) {
        const form = document.getElementById(formId);
        if (!form) {
            throw new Error(`Form with ID ${formId} not found`);
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                company: form.querySelector('#surgicalCompany').value,
                project: form.querySelector('#surgicalName').value,
                length: parseFloat(form.querySelector('#surgicalLength').value) || 100,
                width: parseFloat(form.querySelector('#surgicalWidth').value) || 100,
                height: parseFloat(form.querySelector('#surgicalHeight').value) || 100,
                seam: parseFloat(form.querySelector('#surgicalSeam').value) || 0,
                hem: parseFloat(form.querySelector('#surgicalHem').value) || 0,
                quantity: parseInt(form.querySelector('#surgicalQuantity').value) || 1,
                fabricWidth: parseFloat(form.querySelector('#surgicalFabricWidth').value) || 1500,
                iterations: parseInt(form.querySelector('#surgicalIterations').value) || 100,
                fabricCost: parseFloat(form.querySelector('#surgicalFabricCost').value) || 10,
                seamCost: parseFloat(form.querySelector('#surgicalSeamCost').value) || 5
            };
            onSubmit(data);
        });

        // Handle save button
        const saveBtn = document.getElementById('saveSurgicalBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                form.dispatchEvent(new Event('submit'));
            });
        }
    }
}

export default SurgicalCoverForm;