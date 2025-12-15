
export function render(canvas, data) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  
  const products = data.products || [];

  // Helper to flatten nested objects for display
  const getLines = (obj, indent = 0) => {
    let lines = [];
    Object.entries(obj).forEach(([key, val]) => {
      const prefix = ' '.repeat(indent * 2);
      if (typeof val === 'object' && val !== null) {
        lines.push(`${prefix}${key}:`);
        lines = lines.concat(getLines(val, indent + 1));
      } else {
        lines.push(`${prefix}${key}: ${val}`);
      }
    });
    return lines;
  };

  // Calculate required height
  let requiredHeight = 80;
  const productLines = products.map(p => getLines(p));
  
  productLines.forEach(lines => {
    requiredHeight += 25;
    requiredHeight += lines.length * 20;
    requiredHeight += 15;
  });

  // Resize canvas
  canvas.height = Math.max(200, requiredHeight + 20);
  const height = canvas.height;
  
  // Clear
  ctx.clearRect(0, 0, width, height);
  
  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#cccccc';
  ctx.strokeRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText("SCREEN Preview", 20, 40);

  // Attributes
  let y = 80;
  
  products.forEach((product, index) => {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Item ${index + 1}`, 20, y);
    y += 25;
    
    ctx.font = '14px monospace';
    ctx.fillStyle = '#444444';
    
    const lines = productLines[index];
    lines.forEach(line => {
        ctx.fillText(line, 35, y);
        y += 20;
    });
    y += 15;
  });
}
