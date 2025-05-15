import { loadConfigs } from './api.js';
import { setupTabs } from './ui.js';

import { initSurgicalCovers } from './initSurgicalCovers.js';


window.onload = () => {

    loadConfigs();
    setupTabs();
    
    initSurgicalCovers();

};
