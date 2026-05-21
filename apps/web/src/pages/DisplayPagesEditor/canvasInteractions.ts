export type CanvasRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type CanvasDelta = {
  x: number;
  y: number;
};

export type CanvasGuide = {
  axis: "x" | "y";
  position: number;
};

export type CanvasRectConstraint = {
  canvasHeight: number;
  canvasWidth: number;
  minHeight: number;
  minWidth: number;
  originLeft?: number;
  originTop?: number;
};

export type CanvasResizeHandle =
  | "e"
  | "n"
  | "ne"
  | "nw"
  | "s"
  | "se"
  | "sw"
  | "w";

export type CanvasViewport = {
  offsetX: number;
  offsetY: number;
  zoom: number;
};

function normalizeCanvasCoordinate(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeCanvasDimension(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function clampCanvasRect(rect: CanvasRect, constraint: CanvasRectConstraint): CanvasRect {
  const normalizedWidth = normalizeCanvasDimension(rect.width, constraint.minWidth);
  const normalizedHeight = normalizeCanvasDimension(rect.height, constraint.minHeight);
  const originLeft = constraint.originLeft ?? 0;
  const originTop = constraint.originTop ?? 0;
  const width = Math.max(constraint.minWidth, Math.min(normalizedWidth, constraint.canvasWidth));
  const height = Math.max(constraint.minHeight, Math.min(normalizedHeight, constraint.canvasHeight));
  const left = Math.max(
    originLeft,
    Math.min(normalizeCanvasCoordinate(rect.left), originLeft + constraint.canvasWidth - width)
  );
  const top = Math.max(
    originTop,
    Math.min(normalizeCanvasCoordinate(rect.top), originTop + constraint.canvasHeight - height)
  );

  return {
    height,
    left,
    top,
    width
  };
}

export function applyCanvasDrag(
  rect: CanvasRect,
  delta: CanvasDelta,
  constraint: CanvasRectConstraint
): {
  guides: CanvasGuide[];
  rect: CanvasRect;
} {
  const nextRect = clampCanvasRect(
    {
      ...rect,
      left: rect.left + delta.x,
      top: rect.top + delta.y
    },
    constraint
  );

  return {
    guides: resolveBoundaryGuides(nextRect, constraint),
    rect: nextRect
  };
}

export function applyCanvasResize(
  rect: CanvasRect,
  handle: CanvasResizeHandle,
  delta: CanvasDelta,
  constraint: CanvasRectConstraint
): {
  guides: CanvasGuide[];
  rect: CanvasRect;
} {
  let nextRect = { ...rect };

  if (handle.includes("e")) {
    nextRect.width = rect.width + delta.x;
  }
  if (handle.includes("s")) {
    nextRect.height = rect.height + delta.y;
  }
  if (handle.includes("w")) {
    nextRect.left = rect.left + delta.x;
    nextRect.width = rect.width - delta.x;
  }
  if (handle.includes("n")) {
    nextRect.top = rect.top + delta.y;
    nextRect.height = rect.height - delta.y;
  }

  nextRect = clampCanvasRect(nextRect, constraint);

  return {
    guides: resolveBoundaryGuides(nextRect, constraint),
    rect: nextRect
  };
}

export function applyCanvasNudge(
  rect: CanvasRect,
  direction: "down" | "left" | "right" | "up",
  step: number,
  constraint: CanvasRectConstraint
) {
  const deltaByDirection = {
    down: { x: 0, y: step },
    left: { x: -step, y: 0 },
    right: { x: step, y: 0 },
    up: { x: 0, y: -step }
  } as const;

  return applyCanvasDrag(rect, deltaByDirection[direction], constraint);
}

export function resolveViewportAfterZoom(
  viewport: CanvasViewport,
  nextZoom: number,
  focusPoint: {
    x: number;
    y: number;
  }
): CanvasViewport {
  const clampedZoom = Math.max(0.25, Math.min(nextZoom, 3));
  const ratio = clampedZoom / viewport.zoom;

  return {
    offsetX: focusPoint.x - (focusPoint.x - viewport.offsetX) * ratio,
    offsetY: focusPoint.y - (focusPoint.y - viewport.offsetY) * ratio,
    zoom: clampedZoom
  };
}

export function panCanvasViewport(
  viewport: CanvasViewport,
  delta: CanvasDelta
): CanvasViewport {
  return {
    ...viewport,
    offsetX: viewport.offsetX + delta.x,
    offsetY: viewport.offsetY + delta.y
  };
}

function resolveBoundaryGuides(rect: CanvasRect, constraint: CanvasRectConstraint): CanvasGuide[] {
  const guides: CanvasGuide[] = [];
  const originLeft = constraint.originLeft ?? 0;
  const originTop = constraint.originTop ?? 0;
  const maxRight = originLeft + constraint.canvasWidth;
  const maxBottom = originTop + constraint.canvasHeight;

  if (rect.left === originLeft || rect.left + rect.width === maxRight) {
    guides.push({
      axis: "x",
      position: rect.left === originLeft ? rect.left : rect.left + rect.width
    });
  }
  if (rect.top === originTop || rect.top + rect.height === maxBottom) {
    guides.push({
      axis: "y",
      position: rect.top === originTop ? rect.top : rect.top + rect.height
    });
  }
  return guides;
}
