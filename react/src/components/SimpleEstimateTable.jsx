import React, { useState, useEffect, useMemo } from 'react';

// Simplified Estimate Table
// Expects schema to contain computed defaults from backend.
// Structure: { items: [ { name, contingencyPercent, marginPercent, sections: { "Section": [ { description, quantity, unitCost } ] } } ] }
export default function SimpleEstimateTable({ schema, onTotalChange }) {
  // Normalize schema to ensure it has 'items' array
  const normalize = (data) => {
    if (!data) return { items: [] };
    if (data.items && Array.isArray(data.items)) return data;
    
    // Legacy/Migration: Wrap single object schema into one item
    const { _constants, ...sections } = data;
    const cPct = _constants?.contingencyPercent ?? 3;
    const mPct = _constants?.marginPercent ?? 45;
    
    // Filter out non-array keys just in case
    const validSections = {};
    Object.entries(sections).forEach(([k, v]) => {
        if (Array.isArray(v)) validSections[k] = v;
    });

    return {
        items: [{
            id: 'default',
            name: 'Project Estimate',
            contingencyPercent: cPct,
            marginPercent: mPct,
            sections: validSections
        }]
    };
  };

  const [estData, setEstData] = useState(() => normalize(schema));
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const norm = normalize(schema);
    setEstData(norm);
    // If active tab is out of bounds, reset
    if (activeTab >= norm.items.length) {
        setActiveTab(0);
    }
  }, [schema]);

  // Handle value changes (deep update)
  const handleItemChange = (itemIdx, field, val) => {
    setEstData(prev => {
        const next = { ...prev, items: [...prev.items] };
        next.items[itemIdx] = { ...next.items[itemIdx], [field]: parseFloat(val) || 0 };
        return next;
    });
  };

  const handleRowChange = (itemIdx, sectionName, rowIdx, field, val) => {
    setEstData(prev => {
        const next = { ...prev, items: [...prev.items] };
        const item = { ...next.items[itemIdx] };
        const sections = { ...item.sections };
        const rows = [...(sections[sectionName] || [])];
        
        rows[rowIdx] = { ...rows[rowIdx], [field]: val }; // Keep string for inputs to allow decimals
        sections[sectionName] = rows;
        item.sections = sections;
        next.items[itemIdx] = item;
        return next;
    });
  };

  // Calculate Totals
  const calculatedItems = useMemo(() => {
    return estData.items.map(item => {
        let baseCost = 0;
        const sectionGlobals = {};

        Object.entries(item.sections || {}).forEach(([secName, rows]) => {
            const secTotal = rows.reduce((acc, r) => {
                 return acc + ((parseFloat(r.quantity) || 0) * (parseFloat(r.unitCost) || 0));
            }, 0);
            baseCost += secTotal;
            sectionGlobals[secName] = secTotal;
        });

        const contingency = baseCost * ((item.contingencyPercent || 0) / 100);
        const subTotal = baseCost + contingency;
        // Margin formula: Cost / (1 - Margin%)
        const marginDecimal = (item.marginPercent || 0) / 100;
        const sellPrice = marginDecimal >= 1 ? 0 : subTotal / (1 - marginDecimal);

        return {
            ...item,
            _baseCost: baseCost,
            _contingencyAmt: contingency,
            _sellPrice: sellPrice,
            _sections: sectionGlobals
        };
    });
  }, [estData]);

  const grandTotal = calculatedItems.reduce((acc, item) => acc + item._sellPrice, 0);

  useEffect(() => {
    onTotalChange(grandTotal);
  }, [grandTotal, onTotalChange]);

  if (calculatedItems.length === 0) {
      return <div className="text-sm text-gray-500 italic p-4">No estimate data available. Run "Check/Calculate".</div>;
  }

  const activeItem = calculatedItems[activeTab] || calculatedItems[0];

  return (
    <div className="space-y-0">
        
        {/* Tabs Header */}
        <div className="flex flex-wrap items-end gap-1 border-b border-gray-200 dark:border-gray-700 mb-0 px-1 w-full">
            {calculatedItems.map((item, index) => {
                const isActive = index === activeTab;
                return (
                    <button
                        key={index}
                        onClick={() => setActiveTab(index)}
                        className={`
                            relative px-4 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r border-transparent transition-all
                            ${isActive 
                                ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-b-white dark:border-b-gray-800 -mb-px text-blue-600 dark:text-blue-400 z-10" 
                                : "bg-gray-50 dark:bg-gray-900/50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }
                        `}
                    >
                        {item.name || `Item ${index + 1}`}
                         <span className="ml-2 text-xs opacity-70 font-mono">${item._sellPrice.toFixed(0)}</span>
                    </button>
                );
            })}
        </div>
        
        {/* Active Tab Content */}
        {activeItem && (
            <div className="bg-white dark:bg-gray-800 border-l border-r border-b border-gray-200 dark:border-gray-700 rounded-b-lg p-0 md:p-4 mb-4 shadow-sm">
                
                <div className="flex flex-wrap items-center justify-between mb-4 gap-4 pb-3 border-b border-gray-100 dark:border-gray-700/50 p-3 md:p-0">
                    <h5 className="font-bold text-lg text-gray-800 dark:text-gray-100">{activeItem.name || `Item ${activeTab + 1}`}</h5>
                    
                    {/* Controls */}
                    <div className="flex items-center gap-4 text-sm">
                        <label className="flex items-center gap-2">
                            <span className="text-gray-500">Contingency %</span>
                            <input 
                                type="number" 
                                className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-center"
                                value={activeItem.contingencyPercent}
                                onChange={e => handleItemChange(activeTab, 'contingencyPercent', e.target.value)}
                            />
                        </label>
                        <label className="flex items-center gap-2">
                            <span className="text-gray-500">Margin %</span>
                            <input 
                                type="number" 
                                className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-center"
                                value={activeItem.marginPercent}
                                onChange={e => handleItemChange(activeTab, 'marginPercent', e.target.value)}
                            />
                        </label>
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-6 px-3 md:px-0">
                {Object.entries(activeItem.sections).map(([secName, rows]) => (
                    <div key={secName}>
                        <div className="flex justify-between items-end mb-1">
                            <h6 className="text-xs font-bold uppercase text-gray-400 tracking-wider">{secName}</h6>
                            <span className="text-xs font-mono text-gray-500">${(activeItem._sections[secName] || 0).toFixed(2)}</span>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-700/50 text-xs text-gray-500">
                                <tr>
                                    <th className="text-left py-1 px-2 rounded-l">Description</th>
                                    <th className="text-right py-1 px-2 w-20">Qty</th>
                                    <th className="text-right py-1 px-2 w-24">Rate</th>
                                    <th className="text-right py-1 px-2 w-24 rounded-r">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row, rIdx) => {
                                    const q = parseFloat(row.quantity) || 0;
                                    const c = parseFloat(row.unitCost) || 0;
                                    return (
                                        <tr key={rIdx} className="group hover:bg-white dark:hover:bg-gray-700 transition-colors">
                                            <td className="py-1 px-2">
                                                <div className="truncate max-w-[150px] md:max-w-xs" title={row.description}>
                                                    {row.description || (row.sku ? `SKU: ${row.sku}` : '-')}
                                                </div>
                                            </td>
                                            <td className="py-1 px-2">
                                                <input 
                                                    className="w-full bg-transparent text-right outline-none focus:text-blue-600 font-mono border-b border-transparent focus:border-blue-300"
                                                    value={row.quantity}
                                                    onChange={e => handleRowChange(activeTab, secName, rIdx, 'quantity', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-1 px-2">
                                                <input 
                                                    className="w-full bg-transparent text-right outline-none focus:text-blue-600 font-mono border-b border-transparent focus:border-blue-300"
                                                    value={row.unitCost}
                                                    onChange={e => handleRowChange(activeTab, secName, rIdx, 'unitCost', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-1 px-2 text-right font-mono text-gray-700 dark:text-gray-300">
                                                {(q * c).toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}
                </div>

                {/* Item Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col items-end gap-1 text-sm px-3 md:px-0">
                    <div className="flex justify-between w-full max-w-xs text-gray-500">
                        <span>Base Cost:</span>
                        <span className="font-mono">${activeItem._baseCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-xs text-gray-500">
                        <span>Contingency ({activeItem.contingencyPercent}%):</span>
                        <span className="font-mono">${activeItem._contingencyAmt.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-xs font-bold text-gray-800 dark:text-white text-base mt-1 pt-1 border-t border-dashed border-gray-300">
                        <span>Item Total (Margin {activeItem.marginPercent}%):</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">${activeItem._sellPrice.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        )}
        
        {/* Grand Total - Always Visible */}
        <div className="bg-white dark:bg-gray-800 p-4 border rounded-lg border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center text-lg">
            <span className="text-gray-500 font-medium uppercase tracking-widest text-sm">Project Grand Total</span>
            <span className="text-4xl font-bold text-gray-900 dark:text-white font-mono tracking-tight">${grandTotal.toFixed(2)}</span>
        </div>
    </div>
  );
}