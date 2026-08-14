export interface CropBounds {
  containerW: number;
  containerH: number;
  naturalW: number;
  naturalH: number;
}

export interface DisplayedImageDimensions {
  actualW: number;
  actualH: number;
  actualX: number;
  actualY: number;
  scaleX: number;
  scaleY: number;
}

export interface CropMarginsPercent {
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
}

export interface ImageCropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/**
 * Calculates the exact rendered image rectangle (actualW, actualH, actualX, actualY)
 * inside a container, completely ignoring any letterbox black areas.
 */
export function getDisplayedImageBounds(bounds: CropBounds): DisplayedImageDimensions {
  const containerW = Math.max(10, bounds.containerW);
  const containerH = Math.max(10, bounds.containerH);
  const imgW = Math.max(1, bounds.naturalW);
  const imgH = Math.max(1, bounds.naturalH);

  const imageAspect = imgW / imgH;
  const containerAspect = containerW / containerH;

  let actualW = containerW;
  let actualH = containerH;
  let actualX = 0;
  let actualY = 0;

  if (imageAspect > containerAspect) {
    // Image is wider than container: constrained by container width
    actualW = containerW;
    actualH = containerW / imageAspect;
    actualX = 0;
    actualY = (containerH - actualH) / 2;
  } else {
    // Image is taller than container: constrained by container height
    actualH = containerH;
    actualW = containerH * imageAspect;
    actualX = (containerW - actualW) / 2;
    actualY = 0;
  }

  const scaleX = imgW / Math.max(1, actualW);
  const scaleY = imgH / Math.max(1, actualH);

  return {
    actualW: Math.max(10, actualW),
    actualH: Math.max(10, actualH),
    actualX,
    actualY,
    scaleX,
    scaleY,
  };
}

/**
 * Normalizes width and height for rotation angles (90deg / 270deg swap dimensions).
 */
export function normalizeOrientationDimensions(
  width: number,
  height: number,
  rotationDegrees: number
): { width: number; height: number } {
  const normalizedAngle = ((rotationDegrees % 360) + 360) % 360;
  if (normalizedAngle === 90 || normalizedAngle === 270) {
    return { width: height, height: width };
  }
  return { width, height };
}

/**
 * Converts finger drag delta (dx, dy) in screen pixels into crop percentage relative to actual image.
 */
export function convertTouchDeltaToCropPercent(
  dx: number,
  dy: number,
  actualW: number,
  actualH: number
): { pctX: number; pctY: number } {
  const safeW = Math.max(10, actualW);
  const safeH = Math.max(10, actualH);
  return {
    pctX: (dx / safeW) * 100,
    pctY: (dy / safeH) * 100,
  };
}

/**
 * Maps percentage crop margins to original image pixel coordinates.
 */
export function calculatePixelCropRect(
  naturalW: number,
  naturalH: number,
  margins: CropMarginsPercent,
  rotationDegrees: number = 0
): ImageCropRect {
  const { width: safeW, height: safeH } = normalizeOrientationDimensions(
    naturalW,
    naturalH,
    rotationDegrees
  );

  const originX = Math.max(0, Math.round((margins.cropLeft / 100) * safeW));
  const originY = Math.max(0, Math.round((margins.cropTop / 100) * safeH));

  const remainingPctX = Math.max(10, 100 - (margins.cropLeft + margins.cropRight));
  const remainingPctY = Math.max(10, 100 - (margins.cropTop + margins.cropBottom));

  const width = Math.min(safeW - originX, Math.max(50, Math.round((remainingPctX / 100) * safeW)));
  const height = Math.min(safeH - originY, Math.max(50, Math.round((remainingPctY / 100) * safeH)));

  return {
    originX,
    originY,
    width,
    height,
  };
}
