import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcessStepper } from '../components/projects/useProcessStepper';

// Lazy-load the shadesail form (keeps it in a separate chunk)
const ShadesailForm = React.lazy(() =>
  import('../components/projects/shadesail/Form.jsx')
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
    import('../components/projects/shadesail/Steps.js')
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

  // Poll the form every 2s and update canvas
  useEffect(() => {
    const interval = setInterval(() => {
      if (!formRef.current?.getData) return;

      try {
        const data = formRef.current.getData();
        const stringified = JSON.stringify(data);

        // Only re-run if the form changed
        if (stringified !== lastStringifiedRef.current) {
          console.log('[Discrepancy] Detected form change:', data);
          lastStringifiedRef.current = stringified;
          setFormData(data);

          const cleanData = { ...data };
          delete cleanData.result; // clear stale result

          // Only run once steps are ready
          if (steps.length) {
            runAll(cleanData);
            setResult(cleanData.result || { discrepancy: '', errorBD: '' });
          }
        } else {
          // console.log('[Discrepancy] formData unchanged');
        }
      } catch (err) {
        console.error('[Discrepancy] getData failed:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [runAll, steps.length]);

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
          {/* Left side: form */}
          <div className="flex-1">
            <Suspense fallback={<div>Loading form…</div>}>
              <ShadesailForm ref={formRef} role={role} />
            </Suspense>
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
            <div className="mt-6 text-center">
              <p className="font-semibold text-lg">{result.discrepancy}</p>
              <p className="text-gray-600">{result.errorBD}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
