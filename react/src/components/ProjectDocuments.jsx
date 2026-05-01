import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/auth';
import CollapsibleCard from './CollapsibleCard';

const downloadsIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

function filenameFromResponse(response, projectId, doc) {
  let filename = `document_${projectId}`;
  const disposition = response.headers.get('Content-Disposition');

  if (disposition) {
    const matchStar = disposition.match(/filename\*\s*=\s*([^']*)'[^']*'([^;]+)\s*;?/i);
    if (matchStar?.[2]) {
      try {
        return decodeURIComponent(matchStar[2]);
      } catch {
        return matchStar[2];
      }
    }

    const match = disposition.match(/filename\s*=\s*"?([^"]+)"?/i);
    if (match?.[1]) return match[1];
  }

  if (doc?.type) filename += `.${doc.type}`;
  return filename;
}

export default function ProjectDocuments({ project, showToast, getProjectSnapshot }) {
  const projectId = project?.id;
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setDocuments([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDocuments = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await apiFetch(`/project/${projectId}/documents`);
        const data = await response.json();
        if (!cancelled) setDocuments(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) {
          setDocuments([]);
          setLoadError(error.message || 'Failed to load documents');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const fetchDocument = async (doc) => {
    if (!projectId || !doc?.id || doc.disabled) return;

    setDownloadingId(doc.id);
    try {
      const snapshot = getProjectSnapshot?.();
      const response = await apiFetch(`/project/${projectId}/documents/${encodeURIComponent(doc.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot ? { project: snapshot } : {}),
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = filenameFromResponse(response, projectId, doc);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast?.({
        message: `Failed to download document: ${error.message}`,
        type: 'error',
        duration: 4000,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (!projectId || (!loading && documents.length === 0 && !loadError)) {
    return null;
  }

  return (
    <CollapsibleCard title="Downloads" defaultOpen={true} icon={downloadsIcon}>
      <div className="p-5">
        {loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading documents...
          </div>
        )}

        {loadError && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-md">
            {loadError}
          </div>
        )}

        {!loading && !loadError && documents.length > 0 && (
          <div className="grid grid-cols-1 gap-2">
            {documents.map((doc) => {
              const disabled = doc.disabled || downloadingId === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => fetchDocument(doc)}
                  disabled={disabled}
                  title={doc.reason || ''}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm text-left border rounded-md transition-all group ${
                    disabled
                      ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                      : 'text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <span className="font-medium">{doc.name}</span>
                  <span className="text-gray-400 group-hover:text-primary-500 dark:group-hover:text-primary-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
