import React from 'react';
import { Button } from './ui';
import { apiFetch } from '../services/auth';
import { TOAST_TAGS } from "../config/toastRegistry";

export default function ProjectDocuments({ project, showToast }) {
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document_${project.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Failed: ${e.message}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm mt-4">
        <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Downloads</h4>
        
        <div className="flex flex-wrap gap-2">
            {(!project?.product?.capabilities?.documents || project.product.capabilities.documents.length === 0) && (
                <>
                    {project?.product?.capabilities?.has_dxf && (
                        <Button 
                            onClick={fetchDXF} 
                            className="text-sm py-2 px-3 mt-0"
                            disabled={!canGenerateDXF}
                            title={!canGenerateDXF ? 'Run Check to generate nesting.' : ''}
                        >Download DXF</Button>
                    )}
                    {project?.product?.capabilities?.has_pdf && (
                        <>
                        <Button onClick={() => fetchPDF(false)} className="text-sm py-2 px-3 mt-0">PDF</Button>
                        <Button onClick={() => fetchPDF(true)} className="text-sm py-2 px-3 mt-0">PDF + BOM</Button>
                        </>
                    )}
                </>
            )}

            {project?.product?.capabilities?.documents?.length > 0 && (
                <select 
                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                    onChange={(e) => {
                        if (e.target.value) {
                            fetchDocument(e.target.value);
                            e.target.value = ""; 
                        }
                    }}
                    defaultValue=""
                >
                    <option value="" disabled>Select document...</option>
                    {project.product.capabilities.documents.map(doc => (
                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                </select>
            )}
        </div>
    </div>
  );
}