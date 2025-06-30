import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useLocation } from 'react-router-dom'; // <-- Use useLocation

import ProjectDataTable from '../components/projects/ProjectDataTable';
import EstimateTable from '../components/projects/EstimateTable';
import SchemaEditor from '../components/projects/SchemaEditor';

import { zeroVisualise, oneFlatten, twoExtra, threeNest } from '../components/projects/covers/CoverSteps';

import { getBaseUrl } from '../utils/baseUrl.js';
import { useProcessStepper } from '../components/projects/useProcessStepper';

const defaultSchema = {
  "Materials": [
    {
      "type": "row",
      "description": "Fabric",
      "quantity": "data.calculated?.nestData?.total_width ? data.calculated.nestData.total_width / 1000 : 0",
      "unitCost": 13.33
    },
    {
      "type": "row",
      "description": "Zip",
      "quantity": "2 * (data.attributes?.quantity || 0)",
      "unitCost": 0.65
    },
    {
      "type": "row",
      "description": "Thread",
      "quantity": "2",
      "unitCost": 0.03
    },
    {
      "type": "subtotal",
      "label": "Total Materials",
      "key": "materialsTotal"
    }
  ],
  "Labour": [
    {
      "type": "row",
      "description": "Design",
      "quantity": 0.5,
      "unitCost": 55
    },
    {
      "type": "row",
      "description": "Cutting/Plotting",
      "quantity": "0.4",
      "unitCost": 55
    },
    {
      "type": "subtotal",
      "label": "Total Labour",
      "key": "labourTotal"
    }
  ],
  "Summary": [
    {
      "type": "calc",
      "key": "totalCostFabrication",
      "label": "Total Cost Fabrication",
      "expr": "data.materialsTotal + data.labourTotal"
    },
    {
      "type": "input",
      "label": "Contingencies %",
      "key": "contingencyPercent",
      "default": 3
    },
    {
      "type": "calc",
      "key": "contingencyAmount",
      "label": "Contingency Amount",
      "expr": "data.baseCost * data.contingencyPercent / 100"
    },
    {
      "type": "input",
      "label": "Gross Margin %",
      "key": "marginPercent",
      "default": 45
    },
    {
      "type": "calc",
      "key": "marginAmount",
      "label": "Margin Amount",
      "expr": "(data.baseCost + data.contingencyAmount) * data.marginPercent / 100"
    },
    {
      "type": "calc",
      "key": "suggestedPrice",
      "label": "Suggested Price",
      "expr": "data.baseCost + data.contingencyAmount + data.marginAmount"
    }
  ]
};

export default function ProjectDetailsPage() {
    const location = useLocation();
  // Extract the last segment after the last slash
  const projectId = useMemo(() => {
    const parts = location.pathname.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2];
  }, [location.pathname]);
  
  const [project, setProject] = useState(null);
  const [schema, setSchema] = useState(defaultSchema);
  const canvasRef = useRef(null);

  // Memoize steps and options so they don't change on every render
  const steps = useMemo(() => [zeroVisualise, oneFlatten, twoExtra, threeNest], []);
  const options = useMemo(() => ({ scaleFactor: 1 }), []);

  // Use the custom hook for stepper logic
  const { runAll } = useProcessStepper({ canvasRef, steps, options });

  // Fetch project data
  useEffect(() => {
    fetch(getBaseUrl(`/api/project/${projectId}`), {})
      .then(res => res.json())
      .then(data => setProject(data))
      .catch(err => console.error("Failed to fetch project:", err));
  }, [projectId]);

  // Run stepper when project data changes
  useEffect(() => {
    if (!project) return;
    const merged = { ...(project.attributes || {}), ...(project.calculated || {}) };
    runAll(merged);
  }, [project, runAll]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginTop: '24px' }}>
      <div style={{ flex: '0 0 320px', maxWidth: '100%' }}>
        <ProjectDataTable
          project={project}
          role={localStorage.getItem('role')}
        />
      </div>

      <div style={{ flex: '1 1 0', minWidth: '300px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <EstimateTable schema={schema} data={project} />
        <SchemaEditor schema={schema} setSchema={setSchema} />
        <div style={{ marginTop: 32 }}>
          <canvas
            ref={canvasRef}
            width={500}
            height={1500}
            style={{ border: '1px solid #ccc', background: '#fff' }}
          />
        </div>
      </div>
    </div>
  );
}