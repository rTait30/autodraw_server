import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import ProjectDataTable from '../components/projects/ProjectDataTable';
import EstimateTable from '../components/projects/EstimateTable';
import SchemaEditor from '../components/projects/SchemaEditor';

import { getBaseUrl } from '../utils/baseUrl.js';
import { useProcessStepper } from '../components/projects/useProcessStepper';

// Project-type-specific modules
import { zeroVisualise, oneFlatten, twoExtra, threeNest } from '../components/projects/covers/CoverSteps';
import { coverSchema } from '../components/projects/covers/CoverSchema';

import { zeroDiscrepancy } from '../components/projects/shadesails/SailSteps';
import { sailSchema } from '../components/projects/shadesails/SailSchema';

const configByType = {
  cover: { steps: [zeroVisualise, oneFlatten, twoExtra, threeNest], schema: coverSchema },
  sail: { steps: [zeroDiscrepancy], schema: sailSchema },
  // add more as needed
};

export default function ProjectDetailsPage() {
  const location = useLocation();

  const projectId = useMemo(() => {
    const parts = location.pathname.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2];
  }, [location.pathname]);

  const [project, setProject] = useState(null);
  const [schema, setSchema] = useState(null);
  const canvasRef = useRef(null);
  const [steps, setSteps] = useState([]);

  const options = useMemo(() => ({ scaleFactor: 1 }), []);
  const { runAll } = useProcessStepper({ canvasRef, steps, options });

  useEffect(() => {
    fetch(getBaseUrl(`/api/project/${projectId}`))
      .then(res => res.json())
      .then(data => {
        setProject(data);

        const type = data?.type;
        if (type && configByType[type]) {
          setSchema(configByType[type].schema);
          setSteps(configByType[type].steps);
        } else {
          console.warn('Unknown project type:', type);
        }
      })
      .catch(err => console.error('Failed to fetch project:', err));
  }, [projectId]);

  useEffect(() => {
    if (!project || steps.length === 0) return;
    const merged = { ...(project.attributes || {}), ...(project.calculated || {}) };
    runAll(merged);
  }, [project, steps, runAll]);

  if (!project || !schema) return <div>Loading...</div>;

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
