import React from 'react';
import { useNavigate } from 'react-router-dom';
import GenericTable from './GenericTable';

export default function ProjectTable({ projects = [], onOpen }) {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "client";
  const isClient = role === 'client';

  const handleProjectClick = (id) => {
    if (onOpen) {
      onOpen(id);
    } else {
      navigate(`/copelands/projects/${id}`);
    }
  };

  if (!projects.length) {
    return <div className="text-gray-500 italic p-4">No projects found.</div>;
  }

  // Filter projects by status
  const currentProjects = projects.filter(p => !p.status?.toLowerCase().includes("completed"));
  const completedProjects = projects.filter(p => p.status?.toLowerCase().includes("completed"));

  const columns = [
    { header: 'ID', accessor: 'id', cellClassName: 'font-medium' },
    ...(!isClient ? [{ header: 'Client', accessor: 'client' }] : []),
    { header: 'Name', accessor: 'name' },
    { header: 'Type', accessor: 'type' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (project) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(project.status)}`}>
          {project.status}
        </span>
      )
    }
  ];

  const renderProjectList = (projList, showHeader) => {
    if (!projList.length) return null;

    return (
      <div className="mb-8 last:mb-0">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
          {showHeader} ({projList.length})
        </h3>
        
        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-4">
          {projList.map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project.id)}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase">ID: {project.id}</span>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{project.name || "Untitled"}</h3>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  getStatusColor(project.status)
                }`}>
                  {project.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                {!isClient && (
                  <div>
                    <span className="text-gray-500 text-xs block">Client</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{project.client}</span>
                  </div>
                )}
                <div className={isClient ? "col-span-2" : ""}>
                  <span className="text-gray-500 text-xs block">Type</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{project.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <GenericTable 
            columns={columns}
            data={projList}
            onRowClick={(row) => handleProjectClick(row.id)}
            className="hidden md:block" // GenericTable handles the shadow/rounded/overflow
        />
      </div>
    );
  };

  return (
    <>
      {renderProjectList(currentProjects, "Active Projects")}
      {renderProjectList(completedProjects, "Completed Projects")}
    </>
  );
}

function getStatusColor(status) {
  const s = (status || "").toLowerCase();
  if (s.includes('completed') || s.includes('despatch')) return 'bg-green-50 text-green-700 ring-green-600/20';
  if (s.includes('cancel')) return 'bg-red-50 text-red-700 ring-red-600/20';
  if (s.includes('hold')) return 'bg-yellow-50 text-yellow-800 ring-yellow-600/20';
  if (s.includes('progress') || s.includes('wip')) return 'bg-blue-50 text-blue-700 ring-blue-700/10';
  return 'bg-gray-50 text-gray-600 ring-gray-500/10';
}
