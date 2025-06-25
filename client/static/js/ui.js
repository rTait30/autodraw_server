export function setupTabs() {
    document.querySelectorAll('.tab-buttons button').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;

            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            const tab = document.getElementById(tabId);
            if (tab) {
                tab.classList.add('active');
            } else {
                console.warn(`Tab with ID "${tabId}" not found.`);
            }
        });
    });
}

export function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    } else {
        console.warn(`Tab with ID "${tabId}" not found.`);
    }
}

window.showTab = showTab; // if you're using onclick in HTML
