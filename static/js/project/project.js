import { renderCover, estimatorCoverUI } from './renderCover.js';
import { renderSail } from './renderSail.js';
import { renderBase } from './renderBase.js';

const renderers = {
    cover: renderCover,
    sail: renderSail,
    // Add more as needed
};

const token = localStorage.getItem('access_token');
const projectId = window.projectId; // Set this in your template

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

        // Call estimatorCoverUI if estimator or admin and project is cover
    if ((role === "estimator" || role === "admin") && project.type === "cover") {
        setTimeout(() => estimatorCoverUI(project, role), 0);
    }
}

fetchProjectAndRender();