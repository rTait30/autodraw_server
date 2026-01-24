import React from 'react';

export default function ProjectConfirmation({ project, productName }) {
  if (!project) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
          Please review the project details below before saving.
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
          General
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <span className="text-gray-500">Name:</span>
          <span className="font-medium text-right">{project?.general?.name || '-'}</span>
          <span className="text-gray-500">Product:</span>
          <span className="font-medium text-right">{productName}</span>
        </div>
      </div>

      {/* Dynamic Attribute Summary */}
      {project?.project_attributes && Object.keys(project.project_attributes).length > 0 && (
        <div className="space-y-2 text-sm pt-2">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
            Specifications
          </h4>
          {Object.entries(project.project_attributes)
            .filter(([k, v]) => typeof v !== 'object' && v !== null && k !== 'nest' && k !== 'nested_panels')
            .map(([key, val]) => (
              <div key={key} className="grid grid-cols-2 gap-2">
                <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                <span className="font-medium text-right">{String(val)}</span>
              </div>
            ))}
        </div>
      )}

      {/* Products List Summary */}
      {project?.products && project.products.length > 0 && (
        <div className="space-y-2 text-sm pt-2">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
            Items ({project.products.length})
          </h4>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
            {project.products.slice(0, 5).map((p, i) => (
              <li key={i}>
                {p.name || `Item ${i + 1}`} {p.qty ? `(x${p.qty})` : ''}
              </li>
            ))}
            {project.products.length > 5 && <li>...and {project.products.length - 5} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
