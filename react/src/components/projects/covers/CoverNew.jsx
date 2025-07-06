import React, { useState, useMemo, useRef, useEffect } from 'react';
import CoverForm from './CoverForm';
import { zeroVisualise, oneFlatten, twoExtra, threeNest } from './CoverSteps';
import { useProcessStepper } from '../useProcessStepper';
import { getBaseUrl } from '../../../utils/baseUrl';

export default function CoverNew() {
  const storedMode = localStorage.getItem('role') || 'client';
  const [mode] = useState(storedMode);

  const [formData, setFormData] = useState({
    name: '',
    width: 1000,
    height: 1000,
    length: 1000,
    quantity: 2,
    hem: 20,
    seam: 20,
    ...(storedMode === 'estimator' && { fabricWidth: 1370 }),
  });

  const [calculated, setCalculated] = useState({});
  const canvasRef = useRef(null);

  const steps = useMemo(() => {
    return mode === 'estimator'
      ? [zeroVisualise, oneFlatten, twoExtra, threeNest]
      : [zeroVisualise];
  }, [mode]);

  const options = useMemo(
    () => ({
      showData: false,
      scaleFactor: 1,
      stepOffsetY: 700,
    }),
    []
  );

  const { runAll } = useProcessStepper({
    canvasRef,
    steps,
    options,
  });

  const lastRunRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const significantChange =
        !lastRunRef.current ||
        JSON.stringify(lastRunRef.current) !== JSON.stringify(formData);

      if (
        significantChange &&
        formData.width > 1 &&
        formData.height > 1 &&
        formData.length > 1
      ) {
        const result = await runAll(formData);
        setCalculated(result);
        lastRunRef.current = formData; // Save last run input
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [formData, runAll]);

  const canvasWidth = 500;
  const canvasHeight = canvasWidth * steps.length;

  const handleSubmit = async () => {
    const payload = {
      name: formData.name || 'New Cover Project',
      type: 'cover',
      status: 'draft',
      client_id: 0,
      attributes: formData,
      calculated,
    };

    try {
      const res = await fetch(getBaseUrl('/api/projects/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok) {
        alert(`Project saved! ID: ${result.id}`);
      } else {
        alert(`Failed to save: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error saving project.');
    }
  };

  return (
    <div className="cover-new-root">
      <h2>Create New Cover Project</h2>
      <div className="cover-row">
        <div>
          <CoverForm
            formData={formData}
            onChange={setFormData}
            showFabricWidth={mode === 'estimator'}
          />
          {mode === 'estimator' && (
            <button onClick={handleSubmit} style={{ marginTop: '20px' }}>
              Submit Project
            </button>
          )}
        </div>
        <div className="cover-canvas-right">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              border: '1px solid #ccc',
              marginTop: '20px',
              width: '100%',
              maxWidth: '500px',
              display: 'block',
            }}
          />
        </div>
      </div>
      <style>{`
        .cover-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100vw;
        }
        .cover-canvas-right {
          max-width: 500px;
          width: 100%;
          display: flex;
          justify-content: flex-end;
          margin-right: 200px;
        }
        @media (max-width: 900px) {
          .cover-row {
            flex-direction: column;
            width: 100%;
          }
          .cover-canvas-right {
            max-width: 100%;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
