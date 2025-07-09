import { useRef, useEffect } from 'react';
import ProcessStepper from './ProcessStepper';

export function useProcessStepper({ canvasRef = null, steps = [], options = {} }) {
  const stepperRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef?.current || null;

    if (stepperRef.current) {
      console.log('useProcessStepper: destroying previous ProcessStepper');
      stepperRef.current = null; // Optional: clean up
    }

    console.log('useProcessStepper: creating ProcessStepper');
    const stepper = new ProcessStepper(canvas, options);

    steps.forEach(step => stepper.addStep(step));
    console.log('useProcessStepper: added steps', steps.map(s => s.title || s.id));
    stepperRef.current = stepper;
  }, [canvasRef, steps, options]);


  const runAll = async (data) => {
    if (stepperRef.current) {
      const cloned = structuredClone(data);  // clone before passing into stepper
      return await stepperRef.current.runAll(cloned);
    }
    return {};
  };

  const getData = () => {
    if (stepperRef.current) {
      return stepperRef.current.getData() || {};
    }
    return {};
  };

  return {
    runAll,
    getData,
  };
}
