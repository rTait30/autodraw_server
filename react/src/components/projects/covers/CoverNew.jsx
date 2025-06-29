import React, { useState, useMemo, useRef, useEffect } from 'react';
import CoverForm from './CoverForm';
import { zeroVisualise } from './CoverSteps';
import { useProcessStepper } from '../useProcessStepper';

export default function CoverNew() {
  const [formData, setFormData] = useState({
    width: 1000,
    height: 1000,
    length: 1000,
    quantity: 2,
    hem: 20,
    seam: 20,
  });
  const [mode, setMode] = useState('client');

  //const canvasHeight = mode === 'estimator' ? 2000 : 1000;
  const steps = useMemo(() => [zeroVisualise], []);
  const options = useMemo(
    () => ({
      showData: false,
      scaleFactor: 1,
      stepOffsetY: 400,
    }),
    []
  );

  const canvasRef = useRef(null);

  const { runAll } = useProcessStepper({
    canvasRef,
    steps,
    options,
  });

  // Debounce update
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (
        formData &&
        formData.width > 1 &&
        formData.height > 1 &&
        formData.length > 1
      ) {
        runAll(formData);
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [formData, runAll]);

  const canvasWidth = 500;

  const canvasHeight = canvasWidth * steps.length;

  return (
    <div className="cover-new-root">
      <h2>Create New Cover Project</h2>
      <div className="cover-row">
        <div>
          <CoverForm formData={formData} onChange={setFormData} />
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