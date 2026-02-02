import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/auth';
import { Button } from './UI';
import { getBaseUrl } from '../utils/baseUrl';

// Color swatch component that tries texture first, falls back to hex
const ColorSwatch = ({ color, fabricName, className = "w-full h-16 rounded mb-2" }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Try to load texture image
  const texturePath = getBaseUrl(`/static/textures/${fabricName?.toLowerCase().replace(/\s+/g, '')}/${color.name?.toLowerCase().replace(/\s+/g, '')}.jpg`);

  useEffect(() => {
    let imageSrc = '';
    if (color.texture_path) {
      // If texture_path exists in data, use it (ensure it's a full URL)
      imageSrc = color.texture_path.startsWith('http') ? color.texture_path : getBaseUrl(color.texture_path);
    } else {
      // Try constructed path
      imageSrc = texturePath;
    }
    
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
    img.src = imageSrc;
  }, [color.texture_path, texturePath]);

  if (imageLoaded && !imageError) {
    const imageSrc = color.texture_path 
      ? (color.texture_path.startsWith('http') ? color.texture_path : getBaseUrl(color.texture_path))
      : texturePath;
    return (
      <div
        className={`${className} bg-cover bg-center`}
        style={{ backgroundImage: `url(${imageSrc})` }}
      />
    );
  }

  // Fallback to hex color
  return (
    <div
      className={className}
      style={{ backgroundColor: color.hex_value }}
    />
  );
};

const FabricSelector = ({ onSelect, selectedFabric, selectedColor, onClose, mode = "standalone" }) => {
  const [fabricTypes, setFabricTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [colors, setColors] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({ Shade: true, PVC: false });
  const [selectionComplete, setSelectionComplete] = useState(false);
  const [selectedColorData, setSelectedColorData] = useState(null);
  const [userNavigatedBack, setUserNavigatedBack] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFabric, setNewFabric] = useState({ name: '', category: 'Shade', description: '' });
  
  const [showColorForm, setShowColorForm] = useState(false);
  const [newColor, setNewColor] = useState({ name: '', hex_value: '#000000' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTypes = async () => {
    try {
      const res = await apiFetch('/fabric/types');
      if (res.ok) {
        const data = await res.json();
        setFabricTypes(data);
      }
    } catch (err) {
      console.error('Failed to fetch fabric types', err);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleCreateFabric = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/fabric/add_fabric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFabric)
      });
      
      if (res.ok) {
        await fetchTypes();
        setShowCreateForm(false);
        setNewFabric({ name: '', category: 'Shade', description: '' });
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to create fabric'}`);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (selectedType) {
      const fetchColors = async () => {
        try {
          const res = await apiFetch(`/fabric/type/${selectedType.id}/colors`);
          if (res.ok) {
            const data = await res.json();
            setColors(data);
          }
        } catch (err) {
          console.error('Failed to fetch colors', err);
        }
      };
      fetchColors();
    } else {
      setColors([]);
    }
  }, [selectedType]);

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setShowColorForm(false);
    setUserNavigatedBack(false); // Reset the flag when user selects a fabric
  };

  const handleCreateColor = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/fabric/type/${selectedType.id}/colors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newColor)
      });

      if (res.ok) {
        // Refresh colors
        const colorsRes = await apiFetch(`/fabric/type/${selectedType.id}/colors`);
        if (colorsRes.ok) {
           setColors(await colorsRes.json());
        }
        setShowColorForm(false);
        setNewColor({ name: '', hex_value: '#000000' });
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to add color'}`);
      }
    } catch (error) {
       console.error(error);
       alert('Failed to connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleColorSelect = (color) => {
    if (onSelect) {
      onSelect({ fabric: selectedType, color });
    }
    setSelectedColorData(color);
    // Only set selection complete in standalone mode
    if (mode === "standalone") {
      setSelectionComplete(true);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const groupedFabrics = fabricTypes.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {});

  // Dynamically determine categories, keeping Shade and PVC first
  const dynamicCategories = Object.keys(groupedFabrics).sort((a, b) => {
    const specials = ['Shade', 'PVC'];
    const aIdx = specials.indexOf(a);
    const bIdx = specials.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  // Check if we have a selection from props
  const hasSelection = selectedFabric && selectedColor;
  
  // Initialize state based on props
  useEffect(() => {
    if (hasSelection && fabricTypes.length > 0 && !userNavigatedBack) {
      const fabric = fabricTypes.find(f => f.id === selectedFabric.id);
      if (fabric && !selectedType) {
        setSelectedType(fabric);
        setSelectedColorData(selectedColor);
        if (mode === "standalone") {
          setSelectionComplete(true);
        }
      }
    }
  }, [hasSelection, fabricTypes, selectedFabric, selectedColor, userNavigatedBack, selectedType, mode]);

  return (
    <div className="space-y-3">
      
      {selectionComplete && selectedType && mode === "standalone" && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <span className="text-lg">✓</span>
              <div>
                <div className="font-semibold">Selection Complete</div>
                <div className="text-sm">
                  {selectedType.name} - {selectedColorData?.name || 'Selected Color'}
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                setSelectionComplete(false);
                setSelectedType(null);
                setSelectedColorData(null);
                setColors([]);
              }}
              className="text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/30"
            >
              Change
            </Button>
          </div>
        </div>
      )}
      {!selectedType && !showCreateForm ? (
        <div>
           <div className="flex justify-end mb-2">
            <Button size="sm" variant="ghost" className="text-sm" onClick={() => setShowCreateForm(true)}>
              + New Fabric
            </Button>
          </div>
          {dynamicCategories.length === 0 && (
            <div className="text-center p-4 text-gray-500">No fabrics found. Create one?</div>
          )}
          {dynamicCategories.map(category => (
            groupedFabrics[category] && (
              <div key={category} className="mb-4">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-between text-sm"
                >
                  <h4 className="font-medium">{category} Fabrics</h4>
                  <span className={`transform transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedCategories[category] && (
                  <div className="mt-3 space-y-3">
                    {groupedFabrics[category].map(type => (
                        <div
                          key={type.id}
                          onClick={() => handleTypeSelect(type)}
                          className={`cursor-pointer border rounded-lg p-4 hover:shadow-sm transition-shadow ${
                            mode === "selector" && selectedType?.id === type.id 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{type.name}</h4>
                            {mode === "selector" && selectedType?.id === type.id && (
                              <span className="text-blue-600 dark:text-blue-400">✓</span>
                            )}
                          </div>
                          {type.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
                          )}
                        </div>
                    ))}
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      ) : showCreateForm ? (
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-lg font-semibold mb-3">Add New Fabric</h3>
          <form onSubmit={handleCreateFabric} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input 
                type="text" 
                required
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                value={newFabric.name}
                onChange={e => setNewFabric({...newFabric, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select 
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                value={newFabric.category}
                onChange={e => setNewFabric({...newFabric, category: e.target.value})}
              >
                <option value="Shade">Shade</option>
                <option value="PVC">PVC</option>
                <option value="Canvas">Canvas</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea 
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                rows="2"
                value={newFabric.description}
                onChange={e => setNewFabric({...newFabric, description: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Create Fabric
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button onClick={() => {
                setSelectedType(null);
                setUserNavigatedBack(true);
              }} variant="ghost" size="sm">
                ← Back
              </Button>
              <h3 className="text-lg font-semibold">{selectedType.name} Colors</h3>
            </div>
            {!showColorForm && (
              <Button size="sm" variant="ghost" className="text-sm" onClick={() => setShowColorForm(true)}>
                + Add Color
              </Button>
            )}
          </div>
          
          {showColorForm && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
               <h4 className="font-medium mb-2">Add New Color</h4>
               <form onSubmit={handleCreateColor} className="space-y-3">
                 <div>
                   <label className="block text-sm font-medium mb-1">Color Name</label>
                   <input 
                      type="text" 
                      required
                      placeholder="e.g. Royal Blue"
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      value={newColor.name}
                      onChange={e => setNewColor({...newColor, name: e.target.value})}
                   />
                   <p className="text-xs text-gray-500 mt-1">
                     Image path will be: /static/textures/{selectedType.name.toLowerCase().replace(/\s+/g, '')}/{newColor.name.toLowerCase().replace(/\s+/g, '')}.jpg
                   </p>
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Hex Fallback</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="h-10 w-12 p-0 border-0 rounded"
                        value={newColor.hex_value}
                        onChange={e => setNewColor({...newColor, hex_value: e.target.value})}
                      />
                      <input 
                        type="text" 
                        className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        value={newColor.hex_value}
                        onChange={e => setNewColor({...newColor, hex_value: e.target.value})}
                      />
                    </div>
                 </div>
                 <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setShowColorForm(false)}>Cancel</Button>
                    <Button type="submit" isLoading={isSubmitting}>Add Color</Button>
                 </div>
               </form>
            </div>
          )}

          {selectedType.tech_specs && Object.keys(selectedType.tech_specs).length > 0 && (
            (() => {
              const nonZeroSpecs = Object.entries(selectedType.tech_specs).filter(([key, value]) => value !== 0 && value !== "0");
              return nonZeroSpecs.length > 0 ? (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Technical Specifications</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {nonZeroSpecs.map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()
          )}
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {colors.map(color => (
              <div
                key={color.id}
                onClick={() => handleColorSelect(color)}
                className={`cursor-pointer border rounded-lg p-3 hover:shadow-md transition-shadow ${
                  mode === "selector" && selectedColorData?.id === color.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <ColorSwatch color={color} fabricName={selectedType?.name} />
                <div className="text-sm font-medium flex items-center gap-1">
                  {color.name}
                  {mode === "selector" && selectedColorData?.id === color.id && (
                    <span className="text-blue-600 dark:text-blue-400">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FabricSelector;
