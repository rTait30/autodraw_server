import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../services/auth';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/projects/list'); // no /api prefix
        if (!res.ok) throw new Error('Failed to fetch project list');
        const data = await res.json();
        if (!cancelled) setProjects(data);
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch project list:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (loading) return <p>Loading projects...</p>;

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Projects</h1>

      {/* Horizontal scroll wrapper */}
      <div className="table-scroll">
        <table className="tableBase w-full" style={{ width: 'max-content', minWidth: '100%' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Client</th>
              <th>Created</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <tr
                key={project.id}
                className="clickable-row"
                onClick={() => navigate(`/copelands/projects/${project.id}`)}
              >
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

      <style>
        {`
          /* Prevent whole-page sideways scroll on mobile */
          @media (max-width: 799px) {
            html, body { overflow-x: hidden; }
          }

          /* The wrapper that scrolls horizontally */
          .table-scroll {
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-x: contain; /* don't bubble to page */
            scrollbar-gutter: stable both-edges;
          }

          /* Optional: avoid header wrapping that causes tall rows */
          .table-scroll th, .table-scroll td {
            white-space: nowrap;
          }

          /* Clickable row styles */
          .clickable-row {
            cursor: pointer;
            transition: background-color 0.15s ease;
          }
          .clickable-row:hover {
            background-color: #f0f4ff;
          }
        `}
      </style>
    </div>
  );
}

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