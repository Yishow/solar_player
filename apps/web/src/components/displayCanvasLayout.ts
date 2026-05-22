type CanvasSize = {
  height: number;
  width: number;
};

export function computeCanvasLayout(viewport: CanvasSize, design: CanvasSize) {
  if (
    !Number.isFinite(viewport.width)
    || !Number.isFinite(viewport.height)
    || !Number.isFinite(design.width)
    || !Number.isFinite(design.height)
    || viewport.width <= 0
    || viewport.height <= 0
    || design.width <= 0
    || design.height <= 0
  ) {
    return {
      offsetX: 0,
      offsetY: 0,
      scale: 0
    };
  }

  const scale = Math.min(viewport.width / design.width, viewport.height / design.height);

  return {
    offsetX: (viewport.width - design.width * scale) / 2,
    offsetY: (viewport.height - design.height * scale) / 2,
    scale
  };
}
