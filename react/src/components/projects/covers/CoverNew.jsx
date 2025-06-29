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

  const canvasHeight = mode === 'estimator' ? 2000 : 1000;
  const steps = useMemo(() => [zeroVisualise], []);
  const options = useMemo(
    () => ({
      showData: false,
      scaleFactor: 1,
      virtualWidth: 1000,
      virtualHeight: 1000,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2>Create New Cover Project</h2>
      <div style={{ display: 'flex', gap: '40px' }}>
        <CoverForm formData={formData} onChange={setFormData} />
        <div>
          <canvas
            ref={canvasRef}
            width={1000}
            height={canvasHeight}
            style={{
              border: '1px solid #ccc',
              marginTop: '20px',
              maxWidth: '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
}