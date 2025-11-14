import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProcessStepper } from "../components/products/ProcessStepper";
import ProductForm from "../components/products/SHADE_SAIL/Form.jsx";
import { Steps } from "../components/products/SHADE_SAIL/Steps.js";

export default function Discrepancy() {
  const navigate = useNavigate();

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const stepperRef = useRef(null);
  const [checkSign, setCheckSign] = useState({ text: "", ok: null });

  // Initialize stepper and load steps - same pattern as NewProject
  useEffect(() => {
    if (!canvasRef.current) return;
    
    let alive = true;

    // Create stepper and add canvas
    stepperRef.current = new ProcessStepper(800);
    stepperRef.current.addCanvas(canvasRef.current);
    
    // Add steps directly (no lazy loading)
    if (alive && stepperRef.current) {
      Steps.forEach((step) => stepperRef.current.addStep(step));
    }

    return () => {
      alive = false;
      stepperRef.current = null;
    };
  }, [canvasRef.current]);

  const onCheck = async () => {
    // Clear sign while checking
    setCheckSign({ text: "", ok: null });
    
    const formData = formRef.current?.getValues?.() ?? {};
    if (!formData.attributes) {
      setCheckSign({ text: "Please fill in the form", ok: false });
      return;
    }

    console.log("Running discrepancy check with data:", formData);

    // Wrap data in expected structure (products array) with discrepancyChecker flag
    const wrappedData = {
      discrepancyChecker: true,
      products: [{
        attributes: formData.attributes
      }]
    };

    // Run all steps
    let stepperData = await stepperRef.current?.runAll(wrappedData);

    console.log("Discrepancy check result:", stepperData);
    
    // Extract the first product's attributes to check for discrepancy
    const resultAttributes = stepperData?.products?.[0]?.attributes;
    const maxDiscrepancy = resultAttributes?.maxDiscrepancy ?? 0;
    const discrepancyProblem = resultAttributes?.discrepancyProblem ?? false;
    
    console.log("Max discrepancy:", maxDiscrepancy, "Problem:", discrepancyProblem);
    
    if (discrepancyProblem) {
      setCheckSign({ text: `Discrepancies found (max: ${maxDiscrepancy.toFixed(2)}mm)`, ok: false });
    } else {
      setCheckSign({ text: `Within tolerance (max: ${maxDiscrepancy.toFixed(2)}mm)`, ok: true });
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Sail Discrepancy Checker</h2>
          <button
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            onClick={() => navigate("/copelands")}
          >
            ← Back
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-10">
          {/* Left: form + action */}
          <div className="flex-1 min-w-[360px]">
            <ProductForm formRef={formRef} discrepancyChecker={true} />

            <div className="flex items-center gap-3 mt-4">
              <button onClick={onCheck} className="buttonStyle">
                Check Discrepancy
              </button>
              <span className="text-sm" aria-live="polite">
                {checkSign.ok === null ? (
                  ""
                ) : (
                  <span className={checkSign.ok ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                    {checkSign.text}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Right: canvas */}
          <div className="flex-1 min-w-[360px] flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={1000}
              height={5000}
              style={{
                border: "1px solid #ccc",
                marginTop: "20px",
                width: "100%",
                maxWidth: "500px",
                display: "block",
                background: "#fff",
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
