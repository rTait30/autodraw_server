import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '../services/auth';
import SchemaSelector from './SchemaSelector';
import { ItemSelector } from './ItemSelector';

// Enhanced Estimate Editor
// 'schema' prop contains the formulas (source of truth for editing)
// 'evaluatedSchema' prop contains the calculated values (snapshot)
export default function SimpleEstimateTable({ 
    schema, 
    evaluatedSchema, 
    onTotalChange, 
    onChange, 
    onRecost,
    projectId, 
    productId, 
    canSaveTemplate = false,
    devMode = false
}) {
  // Normalize schema to ensure it has 'items' array or sections
  const normalize = (data) => {
    if (!data) return { sections: {}, _constants: { contingencyPercent: 3, marginPercent: 45 } };
    
    let processed = data;

    // 1. Handle Wrapper (Evaluated Schema format where sections are inside items[0])
    // If we receive the *entire* evaluated object as 'schema' (which happens sometimes),
    // we just want to extract the structure from the first item to use as our editing base.
    if (processed.items && Array.isArray(processed.items)) {
        processed = processed.items.length > 0 ? processed.items[0] : {};
    }

    // 2. Identify Sections & Constants
    let sections = {};
    let constants = {};

    if (processed.sections) {
        // Standard Format
        sections = processed.sections;
        constants = processed._constants || {};
        
        // Sometimes constants are at root in this format
        if (processed.contingencyPercent !== undefined) constants.contingencyPercent = processed.contingencyPercent;
        if (processed.marginPercent !== undefined) constants.marginPercent = processed.marginPercent;
    } else {
        // Legacy / Flat Format
        const { _constants, ...rest } = processed;
        constants = _constants || {};
        
        Object.entries(rest).forEach(([k, v]) => {
            if (Array.isArray(v)) {
                sections[k] = v;
            }
        });
    }

    // 3. Ensure defaults
    return {
        sections: sections,
        _constants: { 
            contingencyPercent: constants.contingencyPercent ?? 3, 
            marginPercent: constants.marginPercent ?? 45 
        }
    };
  };

  // Logging
  useEffect(() => {
    console.log('[SimpleEstimateTable] Received props:', { 
        hasSchema: !!schema, 
        hasEvaluated: !!evaluatedSchema,
        schemaKeys: schema ? Object.keys(schema) : [],
        evaluatedMeta: evaluatedSchema?.meta,
        itemCount: evaluatedSchema?.items?.length
    });
  }, [schema, evaluatedSchema]);

  const [estData, setEstData] = useState(() => normalize(schema));
  const [showSchemaSelector, setShowSchemaSelector] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState(0);

  useEffect(() => {
     if (schema) {
         setEstData(normalize(schema));
     }
  }, [schema]);

  // Resolve the actual evaluated data object for the currently selected item
  const targetEvaluated = useMemo(() => {
      if (!evaluatedSchema) return null;
      if (evaluatedSchema.items && Array.isArray(evaluatedSchema.items)) {
         return evaluatedSchema.items[activeItemIdx] || null;
      }
      return evaluatedSchema; // Fallback for single-object structures
  }, [evaluatedSchema, activeItemIdx]);

  const evaluatedItems = useMemo(() => {
      if (evaluatedSchema?.items && Array.isArray(evaluatedSchema.items)) {
          return evaluatedSchema.items;
      }
      // If we have a single object with 'sections', wrap it in an item structure
      if (evaluatedSchema?.sections) {
          return [{
             id: 'single',
             name: 'Estimate',
             sections: evaluatedSchema.sections,
             contingencyPercent: evaluatedSchema._constants?.contingencyPercent,
             marginPercent: evaluatedSchema._constants?.marginPercent
          }];
      }
      return evaluatedSchema ? [evaluatedSchema] : [];
  }, [evaluatedSchema]);

  const emitChange = useCallback((newData) => {
    if (onChange) {
        // Flatten the structure for the backend (which expects { "Section": [], "_constants": {} })
        // instead of { sections: { "Section": [] }, _constants: {} }
        const flat = { ...newData.sections, _constants: newData._constants };
        onChange(flat);
    }
  }, [onChange]);

  // Handle value changes (deep update)
  const handleConstantChange = (field, val) => {
    setEstData(prev => {
        const next = { ...prev, _constants: { ...prev._constants, [field]: parseFloat(val) || 0 } };
        emitChange(next);
        return next;
    });
  };

  const handleRowChange = (sectionName, rowIdx, field, val) => {
    setEstData(prev => {
        const next = { ...prev };
        const sections = { ...next.sections };
        const rows = [...(sections[sectionName] || [])];
        
        rows[rowIdx] = { ...rows[rowIdx], [field]: val };
        sections[sectionName] = rows;
        next.sections = sections;
        emitChange(next);
        return next;
    });
  };

  // Structure Editing
  const addRow = (sectionName) => {
    setEstData(prev => {
        const next = { ...prev };
        const sections = { ...next.sections };
        const rows = [...(sections[sectionName] || [])];
        rows.push({ description: 'New Item', quantity: "1", unitCost: "0" });
        sections[sectionName] = rows;
        next.sections = sections;
        emitChange(next);
        return next;
    });
  };

  const removeRow = (sectionName, rowIdx) => {
    setEstData(prev => {
        const next = { ...prev };
        const sections = { ...next.sections };
        const rows = [...(sections[sectionName] || [])];
        rows.splice(rowIdx, 1);
        sections[sectionName] = rows;
        next.sections = sections;
        emitChange(next);
        return next;
    });
  };

  const addSection = () => {
      const name = prompt("Enter section name (e.g., 'Installation'):");
      if (!name) return;
      setEstData(prev => {
        const next = { ...prev };
        const sections = { ...next.sections, [name]: [] };
        next.sections = sections;
        emitChange(next);
        return next;
      });
  };

  // Template Actions
  const handleSelectTemplate = (template) => {
      setShowSchemaSelector(false);
      if (!window.confirm(`Replace current estimate with '${template.name}'? This cannot be undone.`)) return;
      
      const newData = normalize(template.data);
      setEstData(newData);
      emitChange(newData);
  };

  const handleSaveAsTemplate = async () => {
    if (!productId) {
        alert("Cannot save template: No Product Context found.");
        return;
    }
    const name = prompt("Template Name:", "New Custom Template");
    if (!name) return;
    
    setSavingTemplate(true);
    try {
        // Flatten data for storage
        const flatData = { ...estData.sections, _constants: estData._constants };
        
        const res = await apiFetch('/est_schemas/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: productId,
                name: name,
                data: flatData,
                is_default: false
            })
        });
        if (res.ok) {
            alert("Template saved successfully!");
        } else {
            const err = await res.json();
            alert(`Failed to save template: ${err.error || 'Unknown error'}`);
        }
    } catch (e) {
        console.error(e);
        alert("Error saving template.");
    } finally {
        setSavingTemplate(false);
    }
  };

  // Helper to get evaluated value safely
  const getEvaluated = (sectionName, rowIdx) => {
      if (!targetEvaluated || !targetEvaluated.sections) return null;
      const rows = targetEvaluated.sections[sectionName];
      if (!rows || !rows[rowIdx]) return null;
      return rows[rowIdx];
  };

  // Totals from evaluated schema preferably, or calculate from rows
  const grandTotal = useMemo(() => {
      if (evaluatedSchema?.meta?.grand_total != null) {
          return evaluatedSchema.meta.grand_total;
      }
      
      // Calculate from all items if available
      if (evaluatedItems.length > 0) {
          return evaluatedItems.reduce((totalAcc, item) => {
              if (!item.sections) return totalAcc;
              const itemTotal = Object.values(item.sections).reduce((secAcc, rows) => {
                  return secAcc + (Array.isArray(rows) 
                    ? rows.reduce((s, r) => s + ((r.quantity || 0) * (r.unitCost || 0)), 0) 
                    : 0);
              }, 0);
              return totalAcc + itemTotal;
          }, 0);
      }
      
      return 0;
  }, [evaluatedSchema, evaluatedItems]);

  const evaluatedAt = evaluatedSchema?.meta?.evaluated_at;

  useEffect(() => {
    // Defer update to avoid "update while rendering" error
    const t = setTimeout(() => {
        onTotalChange(grandTotal);
    }, 0);
    return () => clearTimeout(t);
  }, [grandTotal, onTotalChange]);

  // If no schema, empty state
  if (Object.keys(estData.sections).length === 0) {
      return (
        <div className="p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center">
            <div className="text-gray-500 mb-4">No estimate data. Start by loading a template.</div>
            <button 
                onClick={() => setShowSchemaSelector(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm text-sm"
            >
                Load From Template
            </button>
            {showSchemaSelector && (
                <SchemaSelector 
                    productId={productId} 
                    onSelect={handleSelectTemplate} 
                    onClose={() => setShowSchemaSelector(false)} 
                />
            )}
        </div>
      );
  }

  return (
    <div className="space-y-4">
        
        {/* Toolbar */}
        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
                 <button 
                    onClick={onRecost}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm shadow-sm transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Check / Recost
                </button>
                {evaluatedAt && (
                    <div className="text-xs text-gray-500 flex flex-col leading-tight">
                        <span>Prices as of:</span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                             {new Date(evaluatedAt).toLocaleString()}
                        </span>
                    </div>
                )}
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowSchemaSelector(true)}
                    className="text-xs px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
                >
                    Load Template
                </button>
                <button 
                    onClick={handleSaveAsTemplate}
                    disabled={savingTemplate || !canSaveTemplate}
                    className={`text-xs px-3 py-1.5 rounded transition-colors border border-transparent ${canSaveTemplate ? 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                    {savingTemplate ? 'Saving...' : 'Save as Template'}
                </button>
            </div>
        </div>

        <ItemSelector
            label="Select Estimate Item:"
            options={evaluatedItems}
            value={activeItemIdx}
            onChange={setActiveItemIdx}
            getValue={(_, idx) => idx}
            getLabel={(item, idx) => {
                const total = Object.values(item.sections || {}).reduce((acc, rows) => {
                return acc + (
                    Array.isArray(rows)
                    ? rows.reduce(
                        (s, r) => s + ((r.quantity || 0) * (r.unitCost || 0)),
                        0
                        )
                    : 0
                );
                }, 0);

                return (
                <div className="flex flex-col items-center leading-tight">
                    <span className="font-medium">
                    {item.name || `Item ${idx + 1}`}
                    </span>
                    <span className="text-xs opacity-70">
                    ${total.toFixed(2)}
                    </span>
                </div>
                );
            }}
            columnsMobile={4}
        />

        {/* Sections */}
        <div className="space-y-6">
            {Object.entries(estData.sections).map(([secName, rows]) => (
                <div key={secName} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center group">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm">{secName}</h3>
                        <div className="text-xs text-gray-500">
                            {/* Section Total from Evaluated */}
                            Total: <span className="font-mono font-medium">${(targetEvaluated?.sections?.[secName]?.reduce((a, b) => a + (b.quantity * b.unitCost), 0) || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="text-left py-2 px-4 w-[40%]">Description</th>
                                <th className="text-right py-2 px-2 w-24">Quantity</th> 
                                <th className="text-right py-2 px-2 w-24">Unit Cost</th>
                                <th className="text-right py-2 px-4 w-24">Total</th>
                                <th className="w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {rows.map((row, rIdx) => {
                                const evalRow = getEvaluated(secName, rIdx);
                                const qVal = evalRow ? evalRow.quantity : 0;
                                const cVal = evalRow ? evalRow.unitCost : 0;
                                const total = qVal * cVal;

                                return (
                                    <React.Fragment key={rIdx}>
                                        <tr className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                            <td className="py-2 px-4 align-top">
                                                <input 
                                                    className="w-full bg-transparent outline-none focus:text-blue-600 border-b border-transparent focus:border-blue-300 py-1"
                                                    value={row.description || ''}
                                                    onChange={e => handleRowChange(secName, rIdx, 'description', e.target.value)}
                                                    placeholder="Description"
                                                />
                                            </td>
                                            
                                            {/* Evaluated Quantity */}
                                            <td className="py-2 px-2 text-right font-mono text-sm text-gray-700 dark:text-gray-300 align-top">
                                                {qVal?.toFixed(2) || '-'}
                                            </td>
                                            
                                            {/* Evaluated Cost */}
                                            <td className="py-2 px-2 text-right font-mono text-sm text-gray-700 dark:text-gray-300 align-top">
                                                {cVal?.toFixed(2) || '-'}
                                            </td>
                                            
                                            {/* Line Total */}
                                            <td className="py-2 px-4 text-right font-mono font-medium text-gray-900 dark:text-white align-top">
                                                {total?.toFixed(2) || '-'}
                                            </td>
                                            
                                            <td className="py-2 px-1 text-center align-top">
                                                <button 
                                                    onClick={() => removeRow(secName, rIdx)}
                                                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    tabIndex={-1}
                                                >
                                                    &times;
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Expressions Row (Dev Mode Only) */}
                                        {devMode && (
                                            <tr className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-800">
                                                <td colSpan={5} className="py-2 px-8">
                                                    <div className="flex flex-col gap-2 text-xs font-mono">
                                                        <div className="flex items-center gap-2 w-full">
                                                            <span className="text-blue-500 font-bold opacity-70 w-12 text-right">Qty=</span>
                                                            <input 
                                                                className="flex-1 bg-transparent text-blue-700 dark:text-blue-300 outline-none border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-1"
                                                                value={row.quantity || ''}
                                                                onChange={e => handleRowChange(secName, rIdx, 'quantity', e.target.value)}
                                                                placeholder="Quantity Expression"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 w-full">
                                                            <span className="text-green-500 font-bold opacity-70 w-12 text-right">Cost=</span>
                                                            <input 
                                                                className="flex-1 bg-transparent text-green-700 dark:text-green-300 outline-none border-b border-gray-300 dark:border-gray-600 focus:border-green-500 px-1"
                                                                value={row.unitCost || ''}
                                                                onChange={e => handleRowChange(secName, rIdx, 'unitCost', e.target.value)}
                                                                placeholder="Cost Expression"
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            
                            {/* Add Row Button Row */}
                            <tr>
                                <td colSpan={5} className="py-1 px-4">
                                     <button 
                                        onClick={() => addRow(secName)}
                                        className="text-xs text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1 py-1"
                                    >
                                        <span className="text-lg leading-none">+</span> Add Line Item
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    </div>
                </div>
            ))}
            
            <button 
                onClick={addSection}
                className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 text-gray-400 hover:text-blue-500 rounded-lg text-sm font-medium transition-all"
            >
                + Add New Section
            </button>
        </div>

        {/* Global Parameters */}
        <div className="bg-white dark:bg-gray-800 p-4 border rounded-lg border-gray-200 dark:border-gray-700 shadow-sm">
             <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 font-medium">Contingency</span>
                        <div className="relative">
                            <input 
                                type="number" 
                                className="w-16 pl-2 pr-6 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-right font-mono"
                                value={estData._constants?.contingencyPercent}
                                onChange={e => handleConstantChange('contingencyPercent', e.target.value)}
                            />
                            <span className="absolute right-2 top-1 text-gray-400">%</span>
                        </div>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 font-medium">Margin</span>
                         <div className="relative">
                            <input 
                                type="number" 
                                className="w-16 pl-2 pr-6 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-right font-mono"
                                value={estData._constants?.marginPercent}
                                onChange={e => handleConstantChange('marginPercent', e.target.value)}
                            />
                             <span className="absolute right-2 top-1 text-gray-400">%</span>
                        </div>
                    </label>
                 </div>
                 
                 <div className="text-right">
                     <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Estimated Price</div>
                     <div className="text-3xl font-bold text-gray-900 dark:text-white font-mono tracking-tighter">
                         ${grandTotal.toFixed(2)}
                     </div>
                 </div>
             </div>
        </div>

        {showSchemaSelector && (
            <SchemaSelector 
                productId={productId} 
                onSelect={handleSelectTemplate} 
                onClose={() => setShowSchemaSelector(false)} 
            />
        )}
    </div>
  );
}
