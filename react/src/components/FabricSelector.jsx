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

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await apiFetch('/types');
        if (res.ok) {
          const data = await res.json();
          setFabricTypes(data);
        }
      } catch (err) {
        console.error('Failed to fetch fabric types', err);
      }
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      const fetchColors = async () => {
        try {
          const res = await apiFetch(`/type/${selectedType.id}/colors`);
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
    setUserNavigatedBack(false); // Reset the flag when user selects a fabric
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

  const categoryOrder = ['Shade', 'PVC'];

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
      {!selectedType ? (
        <div>
          {categoryOrder.map(category => (
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
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button onClick={() => {
              setSelectedType(null);
              setUserNavigatedBack(true);
            }} variant="ghost" size="sm">
              ← Back to Fabrics
            </Button>
            <h3 className="text-lg font-semibold">Select {selectedType.name} Color</h3>
          </div>
          
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
