import React, { useEffect, useState } from 'react';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/copelands/api/projects/list')
      .then(res => res.json()) // Now that it's working, parse as JSON
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch project list:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading projects...</p>;

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Projects</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Name</th>
            <th style={th}>Type</th>
            <th style={th}>Status</th>
            <th style={th}>Client</th>
            <th style={th}>Created</th>
            <th style={th}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <tr key={project.id}>
              <td style={td}>{project.id}</td>
              <td style={td}>{project.name}</td>
              <td style={td}>{project.type}</td>
              <td style={td}>{project.status}</td>
              <td style={td}>{project.client}</td>
              <td style={td}>{formatDate(project.created_at)}</td>
              <td style={td}>{formatDate(project.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "0.5rem",
  borderBottom: "2px solid #ccc",
  backgroundColor: "#f0f0f0"
};

const td = {
  padding: "0.5rem",
  borderBottom: "1px solid #ddd"
};

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

export default Projects;