import { loadConfigs } from './api.js';
import { setupTabs } from './ui.js';
import { setupShadesailForm } from './formShadesail.js';
import { setupSurgicalForm } from './formSurgical.js';

window.onload = () => {
    loadConfigs();
    setupTabs();
    setupShadesailForm();
    setupSurgicalForm();
};
