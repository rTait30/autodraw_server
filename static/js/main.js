import { loadConfigs } from './api.js';
import { setupTabs } from './ui.js';

import { initSurgicalCovers } from './covers.js';


window.onload = () => {

    loadConfigs();
    setupTabs();
    
    initSurgicalCovers();

};
