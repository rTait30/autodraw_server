import { apiFetch } from "../../../services/auth.js";

export const Steps = [
  {
    title: "Step 0: Nest Rectangles",
    calcFunction: async (data) => {
      // Debug logging
      console.log("RECTANGLES Step 0 - Incoming data:", data);
      
      // Extract project_attributes (not from products)
      const projectAttrs = data.project_attributes;
      if (!projectAttrs) {
        console.error("No project_attributes found in data:", data);
        return data;
      }
      
      console.log("RECTANGLES Step 0 - Project attributes:", projectAttrs);
      console.log("RECTANGLES Step 0 - Rectangles array:", projectAttrs.rectangles);

      try {
        const payload = {
          rectangles: projectAttrs.rectangles || [],
          fabricHeight: projectAttrs.fabricHeight || 3200,
          allowRotation: projectAttrs.allowRotation ?? true,
        };
        
        console.log("RECTANGLES Step 0 - Sending payload to /nest_rectangles:", payload);
        
        // Call the nest_rectangles endpoint
        const response = await apiFetch("/nest_rectangles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Nesting failed");
        }

        const nestData = await response.json();

        // Store nesting result in calculated
        return {
          ...data,
          calculated: {
            ...data.calculated,
            nestData,
            totalWidth: nestData.total_width || nestData.used_width || 0,
            requiredWidth: nestData.required_width || nestData.bin_width || 0,
            binHeight: nestData.bin_height || projectAttrs.fabricHeight,
            panels: nestData.panels || {},
          },
        };
      } catch (err) {
        console.error("Nesting error:", err);
        return {
          ...data,
          calculated: {
            ...data.calculated,
            error: err.message || "Nesting failed",
          },
        };
      }
    },
    drawFunction: (ctx, data) => {
      if (!ctx || !data.calculated?.nestData) {
        console.warn("No canvas context or nest data available");
        return;
      }

      const { nestData } = data.calculated;
      const { panels, bin_height, required_width } = nestData;

      if (!panels) {
        ctx.fillStyle = "#ff0000";
        ctx.font = "16px sans-serif";
        ctx.fillText("No nesting data available", 50, 50);
        return;
      }

      // High-DPI setup: scale backing store to devicePixelRatio while drawing in CSS pixels
      const canvas = ctx.canvas;
      const dpr = (typeof window !== "undefined" && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      const cssWidth = canvas.clientWidth || canvas.width;
      const cssHeight = canvas.clientHeight || canvas.height;
      const desiredWidth = Math.round(cssWidth * dpr);
      const desiredHeight = Math.round(cssHeight * dpr);
      if (canvas.width !== desiredWidth || canvas.height !== desiredHeight) {
        canvas.width = desiredWidth;
        canvas.height = desiredHeight;
      }
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      // Use padding for labels and margins (CSS pixels)
      const padding = 60;
      const bottomLabelSpace = 40;

      // Calculate scale to fit the entire canvas (CSS pixels)
      const availableWidth = cssWidth - 2 * padding;
      const availableHeight = cssHeight - padding - bottomLabelSpace;

      const scale = Math.min(
        availableWidth / required_width,
        availableHeight / bin_height
      );

      const offsetX = padding;
      const offsetY = padding;

      // Clear canvas (CSS space + DPR transform)
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Draw bin outline
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2; // CSS px
      const binX = Math.round(offsetX);
      const binY = Math.round(offsetY);
      const binW = Math.round(required_width * scale);
      const binH = Math.round(bin_height * scale);
      ctx.strokeRect(binX, binY, binW, binH);

  // Draw required length label (bottom)
  ctx.fillStyle = "#666666";
  ctx.font = "bold 24px sans-serif";

  ctx.fillText(`Required Length: ${required_width}mm`, binX, binY + binH + 20);

  // Draw vertical fabric width label along left side, rotated 90° counter-clockwise
  ctx.save();
  ctx.translate(binX - 30, binY + binH / 2); // position left of bin, centered vertically
  ctx.rotate(-Math.PI / 2); // rotate text to read bottom-to-top
  ctx.textAlign = "center";
  ctx.fillText(`Fabric Width: ${bin_height}mm`, 0, 0);
  ctx.restore();

      // Get rectangles from project_attributes to know original dimensions
      const projectAttrs = data.project_attributes || {};
      const rectangles = projectAttrs.rectangles || [];

      // Create a map of label to original dimensions for reference
      const rectMap = {};
      rectangles.forEach((r) => {
        for (let i = 1; i <= (r.quantity || 1); i++) {
          const label = r.quantity > 1 ? `${r.label}_${i}` : r.label;
          rectMap[label] = { width: r.width, height: r.height, originalLabel: r.label };
        }
      });

      // Color palette for different rectangles
      const colors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#FFA07A",
        "#98D8C8",
        "#FFD93D",
        "#6BCF7F",
        "#C780FA",
        "#FF8C94",
        "#A8E6CF",
      ];

      let colorIndex = 0;
      const labelColors = {};

      // Draw each placed rectangle
      Object.entries(panels).forEach(([label, placement]) => {
        const { x, y, rotated } = placement;
        const rectInfo = rectMap[label];
        
        if (!rectInfo) {
          console.warn(`No rect info for label: ${label}`);
          return;
        }

        // Determine actual width/height considering rotation
        let rectWidth = rectInfo.width;
        let rectHeight = rectInfo.height;
        if (rotated) {
          [rectWidth, rectHeight] = [rectHeight, rectWidth];
        }

        // Assign consistent color based on original label
        if (!labelColors[rectInfo.originalLabel]) {
          labelColors[rectInfo.originalLabel] = colors[colorIndex % colors.length];
          colorIndex++;
        }

        const color = labelColors[rectInfo.originalLabel];

        // Draw rectangle (round to whole CSS pixels for crisp edges)
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        const drawX = Math.round(offsetX + x * scale);
        const drawY = Math.round(offsetY + y * scale);
        const drawW = Math.round(rectWidth * scale);
        const drawH = Math.round(rectHeight * scale);
        ctx.fillRect(drawX, drawY, drawW, drawH);

        // Draw border
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, drawY, drawW, drawH);

        // Draw label
        ctx.fillStyle = "#000000";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
  const centerX = offsetX + (x + rectWidth / 2) * scale;
  const centerY = offsetY + (y + rectHeight / 2) * scale;
        
        ctx.fillText(label, centerX, centerY - 6);
        ctx.font = "10px sans-serif";
        ctx.fillText(
          `${rectWidth}×${rectHeight}${rotated ? " ↻" : ""}`,
          centerX,
          centerY + 6
        );
      });

      // Reset
      ctx.globalAlpha = 1.0;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    },
  },
];
