import React, { useRef, useEffect } from 'react';
import { useProcessStepper } from './useProcessStepper';

export default function StepperCanvas({
  steps = [],
  data = {},
  width = 1000,
  height = 500,
  options = {},
}) {
  const canvasRef = useRef(null);

  const { runAll } = useProcessStepper({
    canvasRef,
    steps,
    options,
  });

  // Run when data changes
  useEffect(() => {
    if (
      data &&
      data.width > 1 &&
      data.height > 1 &&
      data.length > 1
    ) {
      runAll(data);
    }
  }, [data, runAll]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: '1px solid #ccc',
        marginTop: '20px',
        maxWidth: '100%',
      }}
    />
  );
}
