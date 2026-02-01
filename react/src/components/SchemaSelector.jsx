// react/src/components/SchemaSelector.jsx
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/auth';

export default function SchemaSelector({ productId, onSelect, onClose }) {
    const [schemas, setSchemas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!productId) return;
        setLoading(true);
        apiFetch('/est_schemas/get_by_product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
        })
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                setSchemas(data);
            } else {
                console.error('Failed to load schemas', data);
            }
        })
        .finally(() => setLoading(false));
    }, [productId]);

    if (!productId) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select Pricing Template</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading && <div className="text-center p-8 text-gray-500">Loading templates...</div>}
                    
                    {!loading && schemas.length === 0 && (
                        <div className="text-center p-8 text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                            No templates found for this product.<br/>
                            <span className="text-sm opacity-75">Create a custom estimate and save it as a template.</span>
                        </div>
                    )}

                    {schemas.map(schema => (
                        <button
                            key={schema.id}
                            onClick={() => onSelect(schema)}
                            className="w-full text-left group relative p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-700/20 hover:bg-white dark:hover:bg-gray-700/50 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {schema.name}
                                    </h4>
                                    <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                        <span>v{schema.version}</span>
                                        {schema.is_default && (
                                            <span className="bg-blue-100 text-blue-800 px-1.5 rounded font-medium">Default</span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    Apply
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
