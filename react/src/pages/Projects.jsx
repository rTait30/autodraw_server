import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { apiFetch } from '../services/auth';
import ProjectTable from '../components/ProjectTable';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/projects/list');
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading projects...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center justify-between mb-6">
        <h1 className="headingStyle">Projects</h1>
      </div>
      <button
        onClick={() => navigate('/copelands/newproject')}
        className="buttonStyle w-full md:w-auto mb-6"
      >
        New Project
      </button>
      
      <div className="mt-2 flex flex-col">
        <ProjectTable projects={projects} />
      </div>
    </div>
  );
}

export default Projects;
