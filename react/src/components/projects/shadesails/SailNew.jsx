import React, { useState, useMemo, useRef, useEffect } from 'react';
import SailForm from './SailForm';
import { zeroDiscrepancy } from './SailSteps';
import { useProcessStepper } from '../useProcessStepper';
import { useNavigate } from 'react-router-dom';

const defaultPointCount = 4;
function getPointLabel(i) {
  return String.fromCharCode(65 + i);
}
function getInitialInputs(pointCount = defaultPointCount) {
  const points = Array.from({ length: pointCount }, (_, i) => getPointLabel(i));
  const edges = points.map((p, i) => `${p}${points[(i + 1) % pointCount]}`);
  const heights = points.map((p) => `H${p}`);
  const diagonals = [];
  for (let i = 0; i < pointCount; i++) {
    for (let j = i + 1; j < pointCount; j++) {
      if ((j === (i + 1) % pointCount) || (i === 0 && j === pointCount - 1)) continue;
      diagonals.push(`${points[i]}${points[j]}`);
    }
  }
  const obj = { pointCount, fabricType: 'PVC' };
  edges.forEach((k) => (obj[k] = ''));
  heights.forEach((k) => (obj[k] = ''));
  diagonals.forEach((k) => (obj[k] = ''));
  return obj;
}

export default function Discrepancy() {
  const navigate = useNavigate();

  const [inputs, setInputs] = useState(getInitialInputs());
  const [result, setResult] = useState({ discrepancy: '', errorBD: '' });

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
  const { runAll } = useProcessStepper({ canvasRef, steps, options });

  const lastSubmittedRef = useRef(null);

  // Debounce and auto-run
  useEffect(() => {
    const timeout = setTimeout(() => {
      const pointCount = inputs.pointCount || defaultPointCount;
      const points = Array.from({ length: pointCount }, (_, i) => getPointLabel(i));
      const edges = points.map((p, i) => `${p}${points[(i + 1) % pointCount]}`);

      const allEdgesFilled = edges.every(
        (k) => inputs[k] !== '' && !isNaN(Number(inputs[k]))
      );

      if (allEdgesFilled) {
        // Prepare data for comparison and submission
        const data = { ...inputs };
        Object.keys(data).forEach((k) => {
          if (/^[A-Z]{2}$/.test(k) || /^H[A-Z]$/.test(k)) {
            data[k] = data[k] === '' ? undefined : parseFloat(data[k]);
          }
        });

        // Compare with last submitted data
        const dataString = JSON.stringify(data);
        if (lastSubmittedRef.current !== dataString) {
          runAll(data);
          setResult(data.result || { discrepancy: '', errorBD: '' });
          lastSubmittedRef.current = dataString;
        }
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [inputs, runAll]);

  // When point count changes, reset fields
  const handleFormChange = (newFormData) => {
    setInputs((prev) => {
      const newPointCount = newFormData.pointCount || defaultPointCount;
      if (newPointCount !== prev.pointCount) {
        return {
          ...getInitialInputs(newPointCount),
          ...newFormData,
        };
      }
      return {
        ...prev,
        ...newFormData,
      };
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 py-8">
      <h2 className="text-xl font-bold mb-4">New Sail</h2>
      
      <div className="flex flex-col md:flex-row gap-10 w-full max-w-5xl">
        <div className="flex-1">
          <SailForm formData={inputs} onChange={handleFormChange} />
        </div>
        <div className="flex-1 flex flex-col items-center">
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            style={{
              border: '1px solid #ccc',
              marginTop: '20px',
              width: '100%',
              maxWidth: '500px',
              display: 'block',
              background: '#fff',
            }}
          />
          <div className="mt-6 w-full text-center">
            <p id="discrepancy" className="font-semibold text-lg">{result.discrepancy}</p>
            <p id="errorBD" className="text-gray-600">{result.errorBD}</p>
          </div>
        </div>
      </div>
    </div>
  );
}