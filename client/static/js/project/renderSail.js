import { renderBase } from './renderBase.js';

export function renderSail(project, role) {
    let html = renderBase(project, role);
    html += `<h4>Sail Attributes</h4>
        <pre>${JSON.stringify(project.attributes, null, 2)}</pre>`;
    // Add more sail-specific UI here
    return html;
}