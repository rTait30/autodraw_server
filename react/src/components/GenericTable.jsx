import React from 'react';

/**
 * A reusable table component that mimics the styling of ProjectTable
 * but uses Tailwind utility classes instead of index.css classes.
 */
export default function GenericTable({ 
    columns = [], 
    data = [], 
    keyFn, 
    onRowClick,
    className = ""
}) {
  if (!data || data.length === 0) {
      return <div className="text-gray-500 italic p-4 dark:text-gray-400">No data found.</div>;
  }

  return (
    <div className={`overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg ${className}`}>
      <table className="min-w-full divide-y divide-warm-grey dark:divide-gray-700 border border-warm-grey dark:border-gray-700 bg-white dark:bg-gray-900">
        <thead className="bg-warm-grey dark:bg-gray-800">
          <tr>
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                scope="col"
                className={`px-3 py-3.5 text-left text-sm font-semibold text-primary dark:text-gray-200 ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-warm-grey dark:divide-gray-700 bg-white dark:bg-gray-900">
          {data.map((row, rowIdx) => (
            <tr 
                key={keyFn ? keyFn(row) : rowIdx} 
                onClick={() => onRowClick && onRowClick(row)}
                className={`
                    ${onRowClick ? "cursor-pointer hover:bg-warm-grey/50 dark:hover:bg-gray-800 transition-colors" : ""}
                    ${rowIdx % 2 === 1 ? 'bg-warm-grey/20 dark:bg-gray-800/50' : ''} 
                `}
            >
              {columns.map((col, colIdx) => (
                <td 
                    key={colIdx} 
                    className={`whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white ${col.cellClassName || ''}`}
                >
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
