import React, { useEffect, useRef } from 'react';

/**
 * Reusable component for drawing thermal/jet Grad-CAM infection maps on a canvas.
 */
export default function HeatmapCanvas({ imageUrl, coordinates, className = "max-w-full max-h-[260px] object-contain rounded-lg shadow-lg border border-red-500/20" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!coordinates || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 224;
    canvas.height = 224;

    const baseImg = new Image();
    baseImg.src = imageUrl;

    const render = () => {
      ctx.drawImage(baseImg, 0, 0, 224, 224);
      const imgData = ctx.getImageData(0, 0, 224, 224);
      const data = imgData.data;

      for (let y = 0; y < 224; y++) {
        for (let x = 0; x < 224; x++) {
          const val = coordinates[y] ? coordinates[y][x] : 0;
          if (val > 0.15) {
            const idx = (y * 224 + x) * 4;
            const norm = Math.min(1, Math.max(0, (val - 0.15) / 0.85));

            let r = 0, g = 0, b = 0;
            if (norm < 0.25) {
              r = 0;
              g = Math.floor(255 * (norm / 0.25));
              b = 255;
            } else if (norm < 0.5) {
              r = 0;
              g = 255;
              b = Math.floor(255 * (1 - (norm - 0.25) / 0.25));
            } else if (norm < 0.75) {
              r = Math.floor(255 * ((norm - 0.5) / 0.25));
              g = 255;
              b = 0;
            } else {
              r = 255;
              g = Math.floor(255 * (1 - (norm - 0.75) / 0.25));
              b = 0;
            }

            const alpha = 0.55 + norm * 0.4;
            data[idx] = Math.floor(data[idx] * (1 - alpha) + r * alpha);
            data[idx + 1] = Math.floor(data[idx + 1] * (1 - alpha) + g * alpha);
            data[idx + 2] = Math.floor(data[idx + 2] * (1 - alpha) + b * alpha);
            data[idx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };

    if (baseImg.complete) {
      render();
    } else {
      baseImg.onload = render;
    }
  }, [imageUrl, coordinates]);

  return <canvas ref={canvasRef} className={className} />;
}
