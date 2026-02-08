import React from 'react';
import { Button } from './UI';
import { apiFetch } from '../services/auth';
import { TOAST_TAGS } from "../config/toastRegistry";

export default function ProjectDocuments({ project, showToast, isStaff }) {
  if (!project) return null;

  // New: detect if nesting data exists (required for DXF on COVER products)
  const hasNestData = Boolean(
    project?.project_attributes?.nest &&
    (project.project_attributes.nested_panels || project.project_attributes.all_meta_map)
  );
  
  // Shade sails don't need nesting data for DXF
  const canGenerateDXF = project?.product?.name !== 'COVER' || hasNestData;

  const fetchDXF = async () => {
    if (!project?.id) return;
    try {
      const response = await apiFetch('/project/get_dxf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${project.id}.dxf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      showToast(TOAST_TAGS.DXF_DOWNLOAD_FAILED, { args: [e.message] });
    }
  };

  const fetchPDF = async (includeBom = false) => {
    if (!project?.id) return;
    try {
      const response = await apiFetch('/project/get_pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, include_bom: includeBom }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${project.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      showToast(TOAST_TAGS.PDF_DOWNLOAD_FAILED, { args: [e.message] });
    }
  };

  const fetchDocument = async (docId) => {
    if (!project?.id) return;
    try {
      const response = await apiFetch('/project/generate_document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, doc_id: docId }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();

      // Determine filename from header or fallback to type
      let filename = `document_${project.id}`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition) {
          const matchStar = disposition.match(/filename\*\s*=\s*([^']*)'[^']*'([^;]+)\s*;?/i);
          if (matchStar && matchStar[2]) {
            try { filename = decodeURIComponent(matchStar[2]); } catch { filename = matchStar[2]; }
          } else {
            const match = disposition.match(/filename\s*=\s*"?([^"]+)"?/i);
            if (match && match[1]) filename = match[1];
          }
      } else {
          // Fallback if header missing/inaccessible
          const docMeta = project.product?.capabilities?.documents?.find(d => d.id === docId);
          if (docMeta?.type) {
              filename += `.${docMeta.type}`;
          }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Failed: ${e.message}`);
    }
  };

  const capabilities = project?.product?.capabilities || {};
  const documents = capabilities.documents || [];
  
  // Defensive Filtering: Ensure non-staff only see explicitly visible documents
  // (In addition to backend filtering)
  const visibleDocuments = isStaff 
      ? documents 
      : documents.filter(d => d.client_visible);

  return (
        <div className="flex flex-col gap-3">
             {/* Legacy / Fallback Buttons */}
            {(!capabilities.documents || capabilities.documents.length === 0) && (
                <div className="flex flex-wrap gap-2">
                    {capabilities.has_dxf && (
                        <Button 
                            onClick={fetchDXF} 
                            className="text-xs py-2 px-3 mt-0"
                            disabled={!canGenerateDXF}
                            title={!canGenerateDXF ? 'Run Check to generate nesting.' : ''}
                        >Download DXF</Button>
                    )}
                    {capabilities.has_pdf && (
                        <>
                        <Button onClick={() => fetchPDF(false)} className="text-xs py-2 px-3 mt-0">PDF</Button>
                        <Button onClick={() => fetchPDF(true)} className="text-xs py-2 px-3 mt-0">PDF + BOM</Button>
                        </>
                    )}
                </div>
            )}

            {/* Document List (Filtered) */}
            {visibleDocuments.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                    {visibleDocuments.map(doc => (
                         <button
                            key={doc.id}
                            onClick={() => fetchDocument(doc.id)}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md transition-all group"
                         >
                            <span className="font-medium">{doc.name}</span>
                            <span className="text-gray-400 group-hover:text-primary-500 dark:group-hover:text-primary-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </span>
                         </button>
                    ))}
                </div>
            )}

            {/* Empty State for Clients */}
            {visibleDocuments.length === 0 && documents.length > 0 && !isStaff && (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-center">
                    No downloadable documents available at this stage.
                </div>
            )}
        </div>
  );
}
