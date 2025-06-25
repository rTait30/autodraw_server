export function renderBase(project, role) {
    let html = `<ul>
        <li><b>Name:</b> ${project.name}</li>
        <li><b>Type:</b> ${project.type}</li>
        <li><b>Status:</b> ${project.status}</li>
        <li><b>Due Date:</b> ${project.due_date || ''}</li>
        <li><b>Info:</b> ${project.info || ''}</li>
        <li><b>Created At:</b> ${project.created_at || ''}</li>
        <li><b>Last updated At:</b> ${project.updated_at || ''}</li>
        <li><b>Client ID:</b> ${project.client_id || ''}</li>
    `;
    if (role === "admin") {
        html += `<li><b>Internal ID:</b> ${project.id}</li>`;
    }
    html += `</ul>`;
    return html;
}