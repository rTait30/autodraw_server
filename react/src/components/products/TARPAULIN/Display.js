/**
 * TARPAULIN Display - Shows original dimensions and with 50mm pocket.
 */

export function render(canvas, data) {
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  canvas.height = 600; // Set canvas height
  canvas.width = canvas.width || 800; // Ensure width

  const products = data.products || [];
  const hasData = products.length > 0;
  const product = hasData ? products[0] : { attributes: {} };
  const attrs = product.attributes || {};

  const originalLength = attrs.original_length || attrs.length || 1000;
  const originalWidth = attrs.original_width || attrs.width || 1000;
  const finalLength = attrs.final_length || originalLength + 100;
  const finalWidth = attrs.final_width || originalWidth + 100;

  // Scale to fit canvas
  const margin = 50;
  const availableWidth = canvas.width - 2 * margin;
  const availableHeight = canvas.height - 2 * margin;
  const scale = Math.min(availableWidth / finalLength, availableHeight / finalWidth);
  const scaledOrigL = originalLength * scale;
  const scaledOrigW = originalWidth * scale;
  const scaledFinalL = finalLength * scale;
  const scaledFinalW = finalWidth * scale;

  // Center
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Draw final rectangle (with pocket)
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - scaledFinalL/2, centerY - scaledFinalW/2, scaledFinalL, scaledFinalW);

  // Draw original rectangle (dashed)
  ctx.strokeStyle = '#666';
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(centerX - scaledOrigL/2, centerY - scaledOrigW/2, scaledOrigL, scaledOrigW);
  ctx.setLineDash([]);

  // Labels
  ctx.fillStyle = '#000';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Original: ${originalLength}mm x ${originalWidth}mm`, centerX, centerY - scaledFinalW/2 - 30);
  ctx.fillText(`With Pocket: ${finalLength}mm x ${finalWidth}mm`, centerX, centerY + scaledFinalW/2 + 50);

  if (!hasData) {
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.fillText('(Default dimensions - enter values and calculate to update)', centerX, centerY + scaledFinalW/2 + 80);
  }
}
