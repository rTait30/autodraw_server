import { renderCover, setupEstimateTableListeners } from './renderCover.js';
import { renderSail } from './renderSail.js';
import { renderBase } from './renderBase.js';

const renderers = {
    cover: renderCover,
    sail: renderSail,
    // Add more as needed
};

const token = localStorage.getItem('access_token');

// Example: /copelands/project/123
const pathParts = window.location.pathname.split('/');
const projectId = pathParts[pathParts.length - 1];

async function getUserRole() {
    const res = await fetch('/copelands/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return "client";
    const user = await res.json();
    return user.role || "client";
}

async function fetchProjectAndRender() {
    const role = await getUserRole();
    const res = await fetch(`/copelands/api/project/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
        document.getElementById('project-detail').innerText = "Failed to load project.";
        return;
    }
    const project = await res.json();
    const renderer = renderers[project.type] || renderBase;
    document.getElementById('project-detail').innerHTML = renderer(project, role);


    if (role === "estimator" || role === "admin") {
        setupEstimateTableListeners(project);
    }
}

fetchProjectAndRender();