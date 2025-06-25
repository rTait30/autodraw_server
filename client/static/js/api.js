export const local = false;
export const base = local ? '' : '/copelands';

export function loadConfigs() {
    const categories = ['shadesail', 'surgical'];
    const fetches = categories.map(category =>
        fetch(`${base}/list_configs/${category}`)
            .then(res => res.json())
            .then(files => ({ category, files }))
    );

    Promise.all(fetches).then(results => {
        let html = '';
        results.forEach(({ category, files }) => {
            if (files.length > 0) {
                html += `<h3>${category}</h3><ul>`;
                files.forEach(file => {
                    html += `<li><a href=\"${base}/get_config/${category}/${file}\" target=\"_blank\">${file}</a></li>`;
                });
                html += '</ul>';
            }
        });
        document.getElementById('configsList').innerHTML = html;
    });
}


export function saveConfig(data, category) {
    return fetch(`${base}/save_config`, {
        method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(response => {
        alert("Saved successfully!");
        loadConfigs();  // ⬅️ Refresh just the config list
    });
}
