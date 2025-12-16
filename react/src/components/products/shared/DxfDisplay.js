import React, { useEffect, useRef, useState } from 'react';

/**
 * DxfDisplay - A generic component that renders a DXF preview on a canvas.
 * It accepts raw DXF text content and parses it.
 */
export function render(canvas, data) {
  if (!canvas || !data) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, width, height);

  const dxfText = data.dxfContent;
  
  if (!dxfText) {
    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.fillText('No DXF content provided', 20, 30);
    return;
  }

  try {
    drawDxf(ctx, width, height, dxfText);
  } catch (err) {
    console.error("DXF Rendering Error:", err);
    ctx.fillStyle = '#d32f2f';
    ctx.fillText('Error rendering preview', 20, 30);
  }
}

/**
 * Minimal DXF Parser and Renderer
 * Supports: LINE, LWPOLYLINE, TEXT (basic)
 */
function drawDxf(ctx, width, height, dxfText) {
  const lines = dxfText.split('\n').map(l => l.trim());
  const entities = [];
  let currentEntity = null;
  
  // Simple state machine to parse entities
  let section = null;
  
  for (let i = 0; i < lines.length; i++) {
    const code = parseInt(lines[i]);
    const value = lines[i+1];
    i++; // Skip value line in next loop
    
    if (code === 0) {
      if (value === 'SECTION') {
        section = null; // Will be set by next code 2
      } else if (value === 'ENDSEC') {
        section = null;
      } else if (value === 'EOF') {
        break;
      } else if (section === 'ENTITIES') {
        // New Entity
        if (currentEntity) entities.push(currentEntity);
        currentEntity = { type: value };
      }
    } else if (code === 2 && section === null) {
      section = value; // e.g. ENTITIES
    } else if (section === 'ENTITIES' && currentEntity) {
      // Parse entity properties
      if (code === 8) currentEntity.layer = value;
      else if (code === 10) currentEntity.x = parseFloat(value);
      else if (code === 20) currentEntity.y = parseFloat(value);
      else if (code === 11) currentEntity.x2 = parseFloat(value); // Line end / Text align
      else if (code === 21) currentEntity.y2 = parseFloat(value);
      else if (code === 1) currentEntity.text = value;
      else if (code === 40) {
        if (currentEntity.type === 'CIRCLE') currentEntity.radius = parseFloat(value);
        else currentEntity.height = parseFloat(value); // Text height
      }
      // LWPOLYLINE specific
      else if (code === 90) currentEntity.count = parseInt(value);
      else if (code === 10) {
        // Polyline vertex (override x/y for single point entities, append for poly)
        if (currentEntity.type === 'LWPOLYLINE') {
          if (!currentEntity.vertices) currentEntity.vertices = [];
          currentEntity.vertices.push({ x: parseFloat(value) });
        } else {
          currentEntity.x = parseFloat(value);
        }
      }
      else if (code === 20) {
        if (currentEntity.type === 'LWPOLYLINE') {
          const v = currentEntity.vertices[currentEntity.vertices.length - 1];
          if (v) v.y = parseFloat(value);
        } else {
          currentEntity.y = parseFloat(value);
        }
      }
    }
  }
  if (currentEntity) entities.push(currentEntity);

  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  const updateBounds = (x, y) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  entities.forEach(e => {
    if (e.type === 'LINE') {
      updateBounds(e.x, e.y);
      updateBounds(e.x2, e.y2);
    } else if (e.type === 'LWPOLYLINE' && e.vertices) {
      e.vertices.forEach(v => updateBounds(v.x, v.y));
    } else if (e.type === 'TEXT') {
      updateBounds(e.x, e.y);
      // Estimate text width/height roughly
      updateBounds(e.x + 100, e.y + (e.height || 50)); 
    } else if (e.type === 'CIRCLE') {
      const r = e.radius || 0;
      updateBounds(e.x - r, e.y - r);
      updateBounds(e.x + r, e.y + r);
    }
  });

  if (minX === Infinity) {
    // Empty drawing
    ctx.clearRect(0, 0, width, height);
    ctx.fillText('Empty drawing', 20, 30);
    return;
  }

  // Add padding
  const padding = 50; // mm in world space
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const dataW = maxX - minX;
  const dataH = maxY - minY;
  
  // Calculate scale to fit
  const scaleX = width / dataW;
  const scaleY = height / dataH;
  const scale = Math.min(scaleX, scaleY) * 0.9; // 90% fit
  
  // Center it
  const offsetX = (width - dataW * scale) / 2;
  const offsetY = (height - dataH * scale) / 2;

  // Transform helper
  const tx = (x) => offsetX + (x - minX) * scale;
  const ty = (y) => height - (offsetY + (y - minY) * scale); // Flip Y for canvas

  // Draw
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  
  // Grid/Background
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for(let x=0; x<width; x+=50) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
  for(let y=0; y<height; y+=50) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
  ctx.stroke();

  entities.forEach(e => {
    ctx.beginPath();
    if (e.layer === 'WHEEL') ctx.strokeStyle = '#000'; // Cut line
    else if (e.layer === 'PEN') ctx.strokeStyle = '#00f'; // Pen line
    else ctx.strokeStyle = '#999';

    ctx.lineWidth = 1.5;

    if (e.type === 'LINE') {
      ctx.moveTo(tx(e.x), ty(e.y));
      ctx.lineTo(tx(e.x2), ty(e.y2));
      ctx.stroke();
    } else if (e.type === 'LWPOLYLINE' && e.vertices && e.vertices.length > 0) {
      ctx.moveTo(tx(e.vertices[0].x), ty(e.vertices[0].y));
      for (let j = 1; j < e.vertices.length; j++) {
        ctx.lineTo(tx(e.vertices[j].x), ty(e.vertices[j].y));
      }
      // LWPOLYLINE is usually closed if flag 70 & 1, but we'll assume closed for shapes like this or just draw path
      ctx.stroke();
    } else if (e.type === 'TEXT') {
      ctx.fillStyle = '#333';
      ctx.font = `${Math.max(10, (e.height || 50) * scale)}px sans-serif`;
      ctx.fillText(e.text, tx(e.x), ty(e.y));
    } else if (e.type === 'CIRCLE') {
      const r = (e.radius || 0) * scale;
      ctx.arc(tx(e.x), ty(e.y), r, 0, 2 * Math.PI);
      ctx.stroke();
    }
  });
}
