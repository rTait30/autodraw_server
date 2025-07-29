import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import ProjectDataTable from '../components/projects/ProjectDataTable';
import EstimateTable from '../components/projects/EstimateTable';
import SchemaEditor from '../components/projects/SchemaEditor';

import { getBaseUrl } from '../utils/baseUrl.js';
import { useProcessStepper } from '../components/projects/useProcessStepper';

import { steps as coverSteps } from '../components/projects/covers/Steps';
import { coverSchema } from '../components/projects/covers/CoverSchema';

import { steps as sailSteps } from '../components/projects/shadesails/Steps';
import { sailSchema } from '../components/projects/shadesails/SailSchema';

const configByType = {
  cover: { steps: coverSteps, schema: coverSchema },
  sail: { steps: sailSteps, schema: sailSchema },
};

function coerceAllNumericFields(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = typeof value === 'string' && !isNaN(value) ? Number(value) : value;
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

  const role = localStorage.getItem('role');

  const loadProjectFromServer = async () => {
    try {
      const res = await fetch(getBaseUrl(`/api/project/${projectId}`));
      if (!res.ok) throw new Error('Failed to fetch project');
      const data = await res.json();
      setProject(data);
      setAttributes(coerceAllNumericFields(data.attributes || {}));
      setEditedAttributes(coerceAllNumericFields(data.attributes || {}));
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

  useEffect(() => {
    // Only run if steps and attributes are loaded
    if (steps.length && Object.keys(attributes).length) {
      // Pass both attributes and calculated as separate fields
      stepper.runAll({ attributes, calculated });
    }
    // Optionally, you could use the whole project object if your steps expect more
    // stepper.runAll({ ...project, attributes, calculated });
  }, [steps, attributes, calculated]);

  const handleCheck = async () => {
    const coerced = coerceAllNumericFields(editedAttributes);
    setAttributes(coerced);
    const newCalculated = await stepper.runAll(coerced);
    if (newCalculated) {
      setCalculated(newCalculated);
    } else {
      console.warn("No calculated data returned from runAll().");
    }
  };

  const handleSubmit = () => {
    const payload = {
      ...project,
      attributes: coerceAllNumericFields(attributes),
      calculated,
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '32px',
        marginTop: '24px',
        width: '100%',
      }}
    >
      {/* LEFT: Project Data Form, max half screen */}
      <div style={{ flex: '1 1 50%', maxWidth: '50%', minWidth: '320px' }}>
        <div style={{ maxWidth: '800px' }}>
          <ProjectDataTable
            project={project}
            role={role}
            attributes={editedAttributes}
            setAttributes={setEditedAttributes}
            calculated={calculated}
            onCheck={handleCheck}
            onSubmit={handleSubmit}
            onReset={handleReset}
          />
        </div>
      </div>

      {/* RIGHT: */}
      <div
        style={{
          flex: '1 1 50%',
          maxWidth: '50%',
          minWidth: '320px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          marginRight: '20px',
        }}
      >
        {(role === 'estimator' || role === 'admin') ? (
          <>
            <EstimateTable schema={schema} data={{ ...project, attributes, calculated }} />
            <SchemaEditor schema={schema} setSchema={setSchema} />
            {/* ProcessStepper canvas under EstimateTable/SchemaEditor */}
            <div style={{ marginTop: 24 }}>
              <canvas
                ref={canvasRef}
                width={500}
                height={1000}
                style={{
                  border: '1px solid #ccc',
                  width: '100%',
                  maxWidth: '500px',
                  display: 'block',
                  background: '#fff',
                }}
              />
            </div>
          </>
        ) : (
          // For other roles, show canvas at the top right
          <div style={{ alignSelf: 'flex-end', width: '100%', maxWidth: 500 }}>
            <canvas
              ref={canvasRef}
              width={500}
              height={1000}
              style={{
                border: '1px solid #ccc',
                width: '100%',
                maxWidth: '500px',
                display: 'block',
                background: '#fff',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
