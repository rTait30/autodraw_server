import { useRef, useEffect } from 'react';
import ProcessStepper from './ProcessStepper';

export function useProcessStepper({ canvasRef = null, steps = [], options = {} }) {
  const stepperRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef?.current || null;
    const stepper = new ProcessStepper(canvas, options);

    steps.forEach(step => stepper.addStep(step));
    stepperRef.current = stepper;
  }, [canvasRef, steps, options]);

  const runAll = async (data) => {
    if (stepperRef.current) {
      return await stepperRef.current.runAll(data);
    }
    return {};
  };

  const getData = () => {
    return stepperRef.current?.getData?.() || {};
  };

  return {
    runAll,
    getData,
    stepper: stepperRef.current,
  };
}
