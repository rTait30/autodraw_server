import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcessStepper } from '../components/products/useProcessStepper';

// Lazy-load the shadesail form (keeps it in a separate chunk)
const ShadesailForm = React.lazy(() =>
  import('../components/products/shadesail/Form.jsx')
);

export default function Discrepancy() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'guest';

  const [formData, setFormData] = useState(null);
  const [result, setResult] = useState({ discrepancy: '', errorBD: '' });
  const [steps, setSteps] = useState([]);

  const canvasRef = useRef(null);
  const formRef = useRef(null);
  const lastStringifiedRef = useRef('');

  // Load steps dynamically so they can be split into their own chunk
  useEffect(() => {
    let alive = true;
    import('../components/products/shadesail/Steps.js')
      .then((mod) => {
        const loaded = mod.Steps ?? mod.steps ?? [];
        if (alive) setSteps(loaded);
      })
      .catch((e) => console.error('[Discrepancy] Failed to load steps:', e));
    return () => {
      alive = false;
    };
  }, []);

  const options = useMemo(
    () => ({
      showData: false,
      scaleFactor: 1,
      stepOffsetY: 800,
    }),
    []
  );

  // Use steps from state; the key is based on length (loads once)
  const { runAll } = useProcessStepper(
    {
      canvasRef,
      steps,
      options,
    },
    String(steps.length)
  );

  const onCheck = () => {
    if (!formRef.current?.getData) return;

    try {
      const data = formRef.current.getData();
      const stringified = JSON.stringify(data);

      if (stringified !== lastStringifiedRef.current) {
        console.log('[Discrepancy] Detected form change:', data);
        lastStringifiedRef.current = stringified;
        setFormData(data);

        const cleanData = { ...data };
        delete cleanData.result; // clear stale result

        if (steps.length) {
          runAll(cleanData);
          setResult(cleanData.result || { discrepancy: '', errorBD: '' });
        }
      }
    } catch (err) {
      console.error('[Discrepancy] getData failed:', err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <main className="flex-1 p-6">
        <h2 className="text-xl font-bold mb-4">Sail Discrepancy Checker</h2>

        {/* Back button */}
        <button
          className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          onClick={() => navigate('/copelands')}
        >
          ← Back
        </button>

        <div className="flex flex-col md:flex-row gap-10">
          {/* Left side: form + button */}
          <div className="flex-1">
            <Suspense fallback={<div>Loading form…</div>}>
              <ShadesailForm ref={formRef} role={role} compact />
            </Suspense>

            <button onClick={onCheck} className="buttonStyle mt-4">
              Check Discrepancy
            </button>
          </div>

          {/* Right side: canvas + discrepancy result */}
          <div className="flex-1 flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={500}
              height={1600}
              style={{
                border: '1px solid #ccc',
                marginTop: '20px',
                width: '100%',
                maxWidth: '500px',
                display: 'block',
                background: '#fff',
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );

}
