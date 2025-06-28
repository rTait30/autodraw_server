import React, { useMemo } from 'react';
import StepperCanvas from '../StepperCanvas';
import { zeroVisualise } from './CoverSteps';

export default function CoverCanvas({ width = 1000, mode }) {
  const canvasHeight = mode === 'estimator' ? 2000 : 1000;

  // Memoise steps and options so the ProcessStepper is only
  // initialised once across renders.
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

  const data = {
    length: 1000,
    width: width,
    height: 1000,
    quantity: 2,
    hem: 20,
    seam: 20,
  };

  return (
    <div style={{ flexGrow: 1 }}>
      <StepperCanvas

        steps={steps}
        data={data}
        width={1000}
        height={canvasHeight}

        options={options}
      />
    </div>
  );
}