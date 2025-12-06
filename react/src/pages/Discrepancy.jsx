import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setAccessToken } from "../services/auth";
import ProjectForm from "../components/ProjectForm";

export default function Discrepancy() {
  const navigate = useNavigate();

  const formRef = useRef(null);
  const canvasRef = useRef(null);
  const [checkSign, setCheckSign] = useState({ text: "", ok: null });
  const [projectData, setProjectData] = useState(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Login failed');

      setAccessToken(data.access_token || null);
      localStorage.setItem('role', data.role || 'client');
      localStorage.setItem('username', data.username || 'Guest');
      
      setShowLoginModal(false);
      onSave(); // Retry save
    } catch (err) {
      setLoginError(err.message || 'Login failed.');
    }
  };

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
    const products = formData.products || [];
    
    if (products.length === 0) {
      setCheckSign({ text: "Please add at least one sail", ok: false });
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
        general: formData.general || {},
        project_attributes: formData.project_attributes || {},
        products: products,
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

      // Check for discrepancies across all products
      let anyProblem = false;
      let maxDisc = 0;
      (result.products || []).forEach(p => {
        const attrs = p.attributes || {};
        if (attrs.discrepancyProblem) anyProblem = true;
        if ((attrs.maxDiscrepancy || 0) > maxDisc) maxDisc = attrs.maxDiscrepancy || 0;
      });

      if (anyProblem) {
        setCheckSign({ text: `Discrepancies found\n(max: ${maxDisc.toFixed(0)}mm)`, ok: false });
      } else {
        setCheckSign({ text: `Within tolerance\n(max: ${maxDisc.toFixed(0)}mm)`, ok: true });
      }
    } catch (error) {
      console.error("Discrepancy check error:", error);
      setCheckSign({ text: `Error: ${error.message}`, ok: false });
    }
  };

  const onSave = async () => {
    const formData = formRef.current?.getValues?.() ?? {};
    const products = formData.products || [];
    
    if (products.length === 0) {
      setCheckSign({ text: "Please add at least one sail before saving", ok: false });
      return;
    }

    const now = new Date();
    // Format: YYYY-MM-DD HH:mm:ss
    const dateStr = now.toISOString().replace('T', ' ').split('.')[0];
    const name = `Discrepancy Check ${dateStr}`;

    const payload = {
      general: {
        ...(formData.general || {}),
        name: name,
      },
      product_id: 2, // SHADE_SAIL
      project_attributes: formData.project_attributes || {},
      products: products,
    };

    try {
      const response = await apiFetch("/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        // The API returns the project object directly (e.g. { id: 123, ... })
        // OR it might return { project: { id: 123 } } depending on the endpoint version.
        // Based on projects_api.py, it returns { id: ..., client_id: ... } directly.
        const projectId = data.id || (data.project && data.project.id);

        if (projectId) {
             navigate(`/copelands/projects/${projectId}`);
        } else {
             console.warn("No project id in response", data);
             setCheckSign({ text: "Saved, but could not redirect.", ok: true });
        }
      } else {
        // Should be caught by apiFetch throw, but just in case
        const err = await response.json();
        throw new Error(err.error || "Unknown error");
      }

    } catch (error) {
      if (error.status === 401) {
        setShowLoginModal(true);
        return;
      }
      console.error("Save error:", error);
      setCheckSign({ text: `Save Error: ${error.message}`, ok: false });
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white">Sail Discrepancy Checker</h2>
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
            <ProjectForm 
              formRef={formRef} 
              product="SHADE_SAIL" 
              hideGeneralSection={true} 
              productProps={{ discrepancyChecker: true }}
            />

            <div className="flex flex-col gap-3 mt-4">
              <div className="flex gap-2">
                <button onClick={onCheck} className="buttonStyle whitespace-nowrap">
                  Check Discrepancy
                </button>
                <button onClick={onSave} className="buttonStyle whitespace-nowrap bg-green-600 hover:bg-green-700">
                  Save as Draft
                </button>
              </div>
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
              width={800}
              height={500}
              className="border border-gray-300 dark:border-gray-600 mt-5 w-full block bg-gray-50 dark:bg-gray-800 shadow-sm"
            />
          </div>
        </div>
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-96 relative">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Login to Save Draft</h3>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="border p-2 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                autoFocus
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="border p-2 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Login & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
