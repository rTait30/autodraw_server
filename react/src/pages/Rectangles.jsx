import React, { useRef, useEffect, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from '../services/auth';
import { Button } from '../components/UI';
import PageHeader from '../components/PageHeader';
import CollapsibleCard from '../components/CollapsibleCard';

const RectanglesForm = React.lazy(() =>
  import("../components/products/RECTANGLES/Form.jsx").then((module) => ({
    default: module.ProjectForm,
  }))
);

export default function Rectangles() {
  const navigate = useNavigate();

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const [nestStatus, setNestStatus] = useState({ text: "", ok: null });
  const [projectData, setProjectData] = useState(null);

  // Render canvas using Display module when project data changes
  useEffect(() => {
    if (!projectData || !canvasRef.current) return;

    // Dynamically import Display module for RECTANGLES
    import("../components/products/RECTANGLES/Display.js")
      .then((module) => {
        const data = {
          products: projectData.products || [],
          project_attributes: projectData.project_attributes || {},
        };
        // Call generic render() function from Display module
        if (typeof module.render === 'function') {
          module.render(canvasRef.current, data);
        }
      })
      .catch(e => {
        console.warn(`No Display module for RECTANGLES:`, e.message);
      });
  }, [projectData]);

  const onNest = async () => {
    // clear status while processing
    setNestStatus({ text: "", ok: null });
    const all = formRef.current?.getValues?.();
    
    if (!all || !all.project) {
      setNestStatus({ text: "No form data available", ok: false });
      return;
    }

    // Clear canvas first
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    try {
      // Call server-side API to calculate rectangles nesting
      const payload = {
        product_id: 3, // RECTANGLES product ID (from productsConfig.js)
        general: {},
        project_attributes: all.project,
        products: []
      };

      const response = await apiFetch("/projects/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      // Update project data for canvas rendering
      setProjectData({
        products: result.products || [],
        project_attributes: result.project_attributes || {},
      });

      if (result?.project_attributes?.nest?.error) {
        setNestStatus({ text: `Error: ${result.project_attributes.nest.error}`, ok: false });
      } else {
        const nest = result?.project_attributes?.nest || {};
        const rolls = nest.rolls || [];
        const totalRolls = rolls.length;
        const fullRolls = totalRolls > 0 ? totalRolls - 1 : 0;
        const lastRollWidth = rolls.length > 0 ? (rolls[rolls.length - 1].width || 0) : 0;
        const lastRollMeters = (lastRollWidth / 1000).toFixed(1);
        
        setNestStatus({ 
          text: `Nested successfully! Total rolls: ${totalRolls} (${fullRolls} full + ${lastRollMeters}m)`, 
          ok: true 
        });
      }
    } catch (error) {
      console.error("Nesting error:", error);
      setNestStatus({ text: `Error: ${error.message}`, ok: false });
    }
  };

  const handleBack = () => {
    navigate("/copelands/");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
      <PageHeader 
        title="Rectangle Nesting Tool" 
        backLabel="Back"
        onBack={handleBack}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
             {/* Left Column: Form */}
             <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                <CollapsibleCard title="Configuration" defaultOpen={true}>
                    <div className="p-4 flex flex-col gap-6">
                        <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading form...</div>}>
                            <RectanglesForm formRef={formRef} />
                        </Suspense>

                         <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-4">
                                <Button onClick={onNest} className="w-full justify-center py-3">
                                    Nest Rectangles
                                </Button>
                            </div>
                            {nestStatus.text && (
                                <div className={`px-4 py-3 rounded-lg text-sm font-medium border ${nestStatus.ok ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300" : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"}`}>
                                    {nestStatus.text}
                                </div>
                            )}
                         </div>
                    </div>
                </CollapsibleCard>
             </div>

             {/* Right Column: Visualization */}
             <div className="lg:col-span-7 xl:col-span-8">
                 <CollapsibleCard title="Nesting Layout" defaultOpen={true}>
                    <div className="p-4 md:p-8 bg-white dark:bg-gray-800 flex justify-center">
                        <canvas
                            ref={canvasRef}
                            data-dynamic-rectangles="true"
                            width={2000}
                            height={2000}
                            className="max-w-full h-auto border border-gray-200 dark:border-gray-700 shadow-sm rounded bg-white"
                        />
                    </div>
                 </CollapsibleCard>
             </div>
        </div>
      </main>
    </div>
  );
}
