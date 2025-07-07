import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import ProjectDataTable from '../components/projects/ProjectDataTable';
import EstimateTable from '../components/projects/EstimateTable';
import SchemaEditor from '../components/projects/SchemaEditor';

import { getBaseUrl } from '../utils/baseUrl.js';
import { useProcessStepper } from '../components/projects/useProcessStepper';

import { zeroVisualise, oneFlatten, twoExtra, threeNest } from '../components/projects/covers/CoverSteps';
import { coverSchema } from '../components/projects/covers/CoverSchema';

import { zeroDiscrepancy } from '../components/projects/shadesails/SailSteps';
import { sailSchema } from '../components/projects/shadesails/SailSchema';

const configByType = {
  cover: { steps: [zeroVisualise, oneFlatten, twoExtra, threeNest], schema: coverSchema },
  sail: { steps: [zeroDiscrepancy], schema: sailSchema },
};

function coerceNumericFields(obj, numericKeys = []) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = numericKeys.includes(key) ? Number(value) : value;
  }
  return result;
}

export default function ProjectDetailsPage() {
  const location = useLocation();
  const projectId = useMemo(() => {
    const parts = location.pathname.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2];
  }, [location.pathname]);

  const [project, setProject] = useState(null);
  const [attributes, setAttributes] = useState({});
  const [editedAttributes, setEditedAttributes] = useState({});
  const [calculated, setCalculated] = useState({});
  const [schema, setSchema] = useState(null);
  const [steps, setSteps] = useState([]);

  const canvasRef = useRef(null);
  const options = useMemo(() => ({ scaleFactor: 1 }), []);
  const stepper = useProcessStepper({ canvasRef, steps, options });

  const numericKeys = useMemo(
    () => ['quantity', 'fabricWidth', 'flatMainWidth', 'flatMainHeight', 'flatSideWidth', 'flatSideHeight', 'seam', 'hem'],
    []
  );

  const loadProjectFromServer = async () => {
    try {
      const res = await fetch(getBaseUrl(`/api/project/${projectId}`));
      if (!res.ok) throw new Error('Failed to fetch project');
      const data = await res.json();
      setProject(data);
      setAttributes(coerceNumericFields(data.attributes || {}, numericKeys));
      setEditedAttributes(coerceNumericFields(data.attributes || {}, numericKeys));
      setCalculated(data.calculated || {});

      const type = data?.type;
      if (type && configByType[type]) {
        setSchema(configByType[type].schema);
        setSteps(configByType[type].steps);
      } else {
        console.warn('Unknown project type:', type);
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
    }
  };

  useEffect(() => {
    loadProjectFromServer();
  }, [projectId]);

  const handleCheck = async () => {
    const coerced = coerceNumericFields(editedAttributes, numericKeys);
    setAttributes(coerced);
    if (coerced.height) coerced.height = Number(coerced.height) || 0; // Ensure height is a number
    if (coerced.width) coerced.width = Number(coerced.width) || 0; // Ensure width is a number
    if (coerced.length) coerced.length = Number(coerced.length) || 0; // Ensure length is a number
    if (coerced.hem) coerced.hem = Number(coerced.hem) || 0; // Ensure hem is a number
    if (coerced.seam) coerced.seam = Number(coerced.seam) || 0; // Ensure seam is a number
    if (coerced.fabricWidth) coerced.fabricWidth = Number(coerced.fabricWidth) || 0; // Ensure fabricWidth is a number
    if (coerced.quantity) coerced.quantity = Number(coerced.quantity) || 0; // Ensure quantity is a number
    const newCalculated = await stepper.runAll(coerced);
    if (newCalculated) {
      setCalculated(newCalculated);
    } else {
      console.warn("No calculated data returned from runAll().");
    }
  };

  const handleSubmit = () => {
    const coercedAttributes = coerceNumericFields(attributes, numericKeys);
    const coercedCalculated = calculated;

    const payload = {
      id: project.id,
      name: project.name,
      type: project.type,
      status: project.status,
      due_date: project.due_date,
      info: project.info,
      client_id: project.client_id,
      attributes: coercedAttributes,
      calculated: coercedCalculated,
    };

    fetch(getBaseUrl(`/api/projects/create`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to submit');
        return res.json();
      })
      .then(() => {
        loadProjectFromServer();
        alert('Project updated!');
      })
      .catch(err => {
        console.error(err);
        alert('Submit failed');
      });
  };

  const handleReset = () => {
    loadProjectFromServer();
  };

  if (!project || !schema) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginTop: '24px' }}>
      <div style={{ flex: '0 0 320px', maxWidth: '100%' }}>
        <ProjectDataTable
          project={project}
          role={localStorage.getItem('role')}
          attributes={editedAttributes}
          setAttributes={setEditedAttributes}
          calculated={calculated}
          onCheck={handleCheck}
          onSubmit={handleSubmit}
          onReset={handleReset}
        />
      </div>

      <div style={{ flex: '1 1 0', minWidth: '300px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <EstimateTable schema={schema} data={{ ...project, attributes, calculated }} />
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
