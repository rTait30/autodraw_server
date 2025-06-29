import React, { useState, useMemo, useRef, useEffect } from 'react';
import SailForm from './SailForm';
import { zeroDiscrepancy } from './SailSteps';
import { useProcessStepper } from '../useProcessStepper';

export default function SailNew() {
  // Add all fields needed for zeroDiscrepancy
  const [formData, setFormData] = useState({
    AB: '', BC: '', CD: '', DA: '', EF: '', FA: '',
    HA: '', HB: '', HC: '', HD: '', HE: '', HF: '',
    AC: '', BD: '', CE: '', DF: '', AE: '', BF: '',
    fabricType: 'PVC',
    // ...add more as needed
  });

  const steps = useMemo(() => [zeroDiscrepancy], []);
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
      // Get current edge field names
      const pointCount = inputs.pointCount || defaultPointCount;
      const points = Array.from({ length: pointCount }, (_, i) => getPointLabel(i));
      const edges = points.map((p, i) => `${p}${points[(i + 1) % pointCount]}`);

      // Only run if all edge fields are filled (not empty and not NaN)
      const allEdgesFilled = edges.every(
        (k) => inputs[k] !== '' && !isNaN(Number(inputs[k]))
      );

      if (allEdgesFilled) {
        // Convert all numeric fields to numbers
        const data = { ...inputs };
        Object.keys(data).forEach((k) => {
          if (/^[A-Z]{2}$/.test(k) || /^H[A-Z]$/.test(k)) {
            data[k] = data[k] === '' ? undefined : parseFloat(data[k]);
          }
        });
        runAll(data);
        setResult(data.result || { discrepancy: '', errorBD: '' });
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [inputs, runAll]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2>Create New Sail Project</h2>
      <div style={{ display: 'flex', gap: '40px' }}>
        <SailForm formData={formData} onChange={setFormData} />
        <div>
          <canvas
            ref={canvasRef}
            width={1000}
            height={1000}
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