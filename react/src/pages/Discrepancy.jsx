import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/auth";
import ProductForm from "../components/products/SHADE_SAIL/Form.jsx";

export default function Discrepancy() {
  const navigate = useNavigate();

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const [checkSign, setCheckSign] = useState({ text: "", ok: null });
  const [projectData, setProjectData] = useState(null);

  // Render canvas using Display module when project data changes
  useEffect(() => {
    if (!projectData || !canvasRef.current) return;

    // Dynamically import Display module for SHADE_SAIL
    import("../components/products/SHADE_SAIL/Display.js")
      .then((module) => {
        const data = {
          products: projectData.products || [],
          project_attributes: projectData.project_attributes || {},
          discrepancyChecker: true,
        };
        if (typeof module.render === "function") {
          module.render(canvasRef.current, data);
        }
      })
      .catch((e) => {
        console.warn("No Display module for SHADE_SAIL:", e.message);
      });
  }, [projectData]);

  const onCheck = async () => {
    // Clear sign while checking
    setCheckSign({ text: "", ok: null });
    
    const formData = formRef.current?.getValues?.() ?? {};
    if (!formData.attributes) {
      setCheckSign({ text: "Please fill in the form", ok: false });
      return;
    }

    // Clear canvas first
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    try {
      // Server-side calculation for SHADE_SAIL (dbId: 2)
      const payload = {
        product_id: 2,
        general: {},
        project_attributes: {},
        products: [
          {
            attributes: formData.attributes,
          },
        ],
      };

      const response = await apiFetch("/projects/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      // Update for rendering
      setProjectData({
        products: result.products || [],
        project_attributes: result.project_attributes || {},
      });

      // Extract attributes for status message
      const resultAttributes = result?.products?.[0]?.attributes;
      const maxDiscrepancy = resultAttributes?.maxDiscrepancy ?? 0;
      const discrepancyProblem = resultAttributes?.discrepancyProblem ?? false;

      if (discrepancyProblem) {
        setCheckSign({ text: `Discrepancies found\n(max: ${maxDiscrepancy.toFixed(0)}mm)`, ok: false });
      } else {
        setCheckSign({ text: `Within tolerance\n(max: ${maxDiscrepancy.toFixed(0)}mm)`, ok: true });
      }
    } catch (error) {
      console.error("Discrepancy check error:", error);
      setCheckSign({ text: `Error: ${error.message}`, ok: false });
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Sail Discrepancy Checker</h2>
          <button
            className="buttonStyle bg-[#AA0000]"
            onClick={() => navigate("/copelands")}
          >
            ← Back
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-10">
          {/* Left: form + action */}
          <div className="flex-1 min-w-[360px]">
            <ProductForm formRef={formRef} discrepancyChecker={true} />

            <div className="flex flex-col gap-3 mt-4">
              <button onClick={onCheck} className="buttonStyle whitespace-nowrap">
                Check Discrepancy
              </button>
              <span className="text-lg" aria-live="polite">
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
              data-dynamic-sail="true"
              width={1000}
              height={1500}
              style={{
                border: "1px solid #d1d5db",
                marginTop: "20px",
                width: "100%",
                display: "block",
                background: "#f8f9fa",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
