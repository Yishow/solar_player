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
  label?: string;
  position: number;
  targetType?: "center-line" | "guide" | "region-center" | "region-edge";
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

export type CanvasRelationalMeasurement = {
  axis: "x" | "y";
  distance: number;
  end: { x: number; y: number };
  midpoint: { x: number; y: number };
  start: { x: number; y: number };
};

export type CanvasSpace = {
  height: number;
  width: number;
};

export type CanvasDesignMapping = {
  canvasHeight: number;
  canvasWidth: number;
  designHeight: number;
  designWidth: number;
  scaleX: number;
  scaleY: number;
};

export type CanvasSnapTarget = {
  axis: "x" | "y";
  position: number;
  type: "center-line" | "guide" | "region-center" | "region-edge";
};

export type CanvasSnapOptions = {
  enabled: boolean;
  targets: CanvasSnapTarget[];
  threshold: number;
};

export type CanvasDistanceLockSession = {
  axis: "x" | "y";
  distance: number;
  relation: "after" | "before";
  targetRect: CanvasRect;
};

export type CanvasSelectionRect = {
  id: string;
  rect: CanvasRect;
};

export type CanvasAlignmentAction =
  | "bottom"
  | "h-center"
  | "left"
  | "right"
  | "top"
  | "v-center";

export type CanvasDistributionAction = "h-distribute" | "v-distribute";

function normalizeCanvasCoordinate(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeCanvasDimension(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeCanvasSpace(space: CanvasSpace, fallback: CanvasSpace): CanvasSpace {
  return {
    height: normalizeCanvasDimension(space.height, fallback.height),
    width: normalizeCanvasDimension(space.width, fallback.width)
  };
}

export function resolveCanvasDesignMapping(canvas: CanvasSpace, design: CanvasSpace): CanvasDesignMapping {
  const normalizedCanvas = normalizeCanvasSpace(canvas, { height: 1, width: 1 });
  const normalizedDesign = normalizeCanvasSpace(design, normalizedCanvas);

  return {
    canvasHeight: normalizedCanvas.height,
    canvasWidth: normalizedCanvas.width,
    designHeight: normalizedDesign.height,
    designWidth: normalizedDesign.width,
    scaleX: normalizedCanvas.width / normalizedDesign.width,
    scaleY: normalizedCanvas.height / normalizedDesign.height
  };
}

export function mapCanvasPointToDesignPoint(
  point: { x: number; y: number },
  mapping: CanvasDesignMapping
) {
  return {
    x: Math.round(point.x / mapping.scaleX),
    y: Math.round(point.y / mapping.scaleY)
  };
}

export function mapDesignPointToCanvasPoint(
  point: { x: number; y: number },
  mapping: CanvasDesignMapping
) {
  return {
    x: Math.round(point.x * mapping.scaleX),
    y: Math.round(point.y * mapping.scaleY)
  };
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
  constraint: CanvasRectConstraint,
  snap?: CanvasSnapOptions,
  distanceLock?: CanvasDistanceLockSession | null
): {
  boundaryClamped?: boolean;
  guides: CanvasGuide[];
  rect: CanvasRect;
} {
  const unlockedRect = {
    ...rect,
    left: rect.left + delta.x,
    top: rect.top + delta.y
  };
  const lockedRect = distanceLock ? applyDistanceLockToDrag(unlockedRect, distanceLock) : unlockedRect;
  const snapped = resolveSnapRect(lockedRect, snap, { x: "move", y: "move" });
  const nextRect = clampCanvasRect(snapped.rect, constraint);

  return {
    boundaryClamped: nextRect.left !== snapped.rect.left || nextRect.top !== snapped.rect.top,
    guides: [...snapped.guides, ...resolveBoundaryGuides(nextRect, constraint)],
    rect: nextRect
  };
}

export function applyCanvasResize(
  rect: CanvasRect,
  handle: CanvasResizeHandle,
  delta: CanvasDelta,
  constraint: CanvasRectConstraint,
  snap?: CanvasSnapOptions,
  distanceLock?: CanvasDistanceLockSession | null
): {
  boundaryClamped?: boolean;
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

  nextRect = distanceLock ? applyDistanceLockToResize(nextRect, handle, distanceLock) : nextRect;
  const snapped = resolveSnapRect(nextRect, snap, {
    x: handle.includes("e") ? "resize-end" : handle.includes("w") ? "resize-start" : "none",
    y: handle.includes("s") ? "resize-end" : handle.includes("n") ? "resize-start" : "none"
  });
  nextRect = clampCanvasRect(snapped.rect, constraint);

  return {
    boundaryClamped:
      nextRect.left !== snapped.rect.left ||
      nextRect.top !== snapped.rect.top ||
      nextRect.width !== snapped.rect.width ||
      nextRect.height !== snapped.rect.height,
    guides: [...snapped.guides, ...resolveBoundaryGuides(nextRect, constraint)],
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

export function resolveRelationalMeasurements(
  sourceRect: CanvasRect,
  targetRect: CanvasRect,
  mapping: CanvasDesignMapping
): CanvasRelationalMeasurement[] {
  const sourceRight = sourceRect.left + sourceRect.width;
  const targetRight = targetRect.left + targetRect.width;
  const sourceBottom = sourceRect.top + sourceRect.height;
  const targetBottom = targetRect.top + targetRect.height;
  const horizontalSourceFirst = sourceRect.left <= targetRect.left;
  const verticalSourceFirst = sourceRect.top <= targetRect.top;
  const horizontalStart = horizontalSourceFirst ? sourceRight : targetRight;
  const horizontalEnd = horizontalSourceFirst ? targetRect.left : sourceRect.left;
  const verticalStart = verticalSourceFirst ? sourceBottom : targetBottom;
  const verticalEnd = verticalSourceFirst ? targetRect.top : sourceRect.top;
  const overlapTop = Math.max(sourceRect.top, targetRect.top);
  const overlapBottom = Math.min(sourceBottom, targetBottom);
  const overlapLeft = Math.max(sourceRect.left, targetRect.left);
  const overlapRight = Math.min(sourceRight, targetRight);
  const horizontalY =
    overlapTop <= overlapBottom
      ? overlapTop + (overlapBottom - overlapTop) / 2
      : (sourceRect.top + sourceBottom + targetRect.top + targetBottom) / 4;
  const verticalX =
    overlapLeft <= overlapRight
      ? overlapLeft + (overlapRight - overlapLeft) / 2
      : (sourceRect.left + sourceRight + targetRect.left + targetRight) / 4;

  return [
    {
      axis: "x",
      distance:
        overlapLeft <= overlapRight
          ? 0
          : Math.max(0, Math.round(Math.abs(horizontalEnd - horizontalStart) / mapping.scaleX)),
      end: { x: horizontalEnd, y: horizontalY },
      midpoint: { x: (horizontalStart + horizontalEnd) / 2, y: horizontalY },
      start: { x: horizontalStart, y: horizontalY }
    },
    {
      axis: "y",
      distance:
        overlapTop <= overlapBottom
          ? 0
          : Math.max(0, Math.round(Math.abs(verticalEnd - verticalStart) / mapping.scaleY)),
      end: { x: verticalX, y: verticalEnd },
      midpoint: { x: verticalX, y: (verticalStart + verticalEnd) / 2 },
      start: { x: verticalX, y: verticalStart }
    }
  ];
}

export function applyMeasurementHandleDrag(
  rect: CanvasRect,
  axis: "x" | "y",
  delta: number,
  constraint: CanvasRectConstraint
) {
  return applyCanvasDrag(
    rect,
    axis === "x" ? { x: delta, y: 0 } : { x: 0, y: delta },
    constraint
  );
}

export function resolveDistanceLockSession(
  sourceRect: CanvasRect,
  targetRect: CanvasRect
): CanvasDistanceLockSession {
  const horizontalGap = resolveDirectionalGap(
    sourceRect.left,
    sourceRect.left + sourceRect.width,
    targetRect.left,
    targetRect.left + targetRect.width
  );
  const verticalGap = resolveDirectionalGap(
    sourceRect.top,
    sourceRect.top + sourceRect.height,
    targetRect.top,
    targetRect.top + targetRect.height
  );
  const axis = horizontalGap.distance >= verticalGap.distance ? "x" : "y";
  const selectedGap = axis === "x" ? horizontalGap : verticalGap;

  return {
    axis,
    distance: selectedGap.distance,
    relation: selectedGap.relation,
    targetRect
  };
}

export function resolveSelectionBounds(selections: CanvasSelectionRect[]): CanvasRect | null {
  if (selections.length === 0) {
    return null;
  }

  const left = Math.min(...selections.map((selection) => selection.rect.left));
  const top = Math.min(...selections.map((selection) => selection.rect.top));
  const right = Math.max(...selections.map((selection) => selection.rect.left + selection.rect.width));
  const bottom = Math.max(...selections.map((selection) => selection.rect.top + selection.rect.height));

  return {
    height: bottom - top,
    left,
    top,
    width: right - left
  };
}

export function alignCanvasSelections(
  selections: CanvasSelectionRect[],
  action: CanvasAlignmentAction
): CanvasSelectionRect[] {
  const bounds = resolveSelectionBounds(selections);
  if (!bounds || selections.length < 2) {
    return selections;
  }

  return selections.map((selection) => {
    switch (action) {
      case "left":
        return { ...selection, rect: { ...selection.rect, left: bounds.left } };
      case "right":
        return {
          ...selection,
          rect: { ...selection.rect, left: bounds.left + bounds.width - selection.rect.width }
        };
      case "top":
        return { ...selection, rect: { ...selection.rect, top: bounds.top } };
      case "bottom":
        return {
          ...selection,
          rect: { ...selection.rect, top: bounds.top + bounds.height - selection.rect.height }
        };
      case "h-center":
        return {
          ...selection,
          rect: {
            ...selection.rect,
            left: Math.round(bounds.left + bounds.width / 2 - selection.rect.width / 2)
          }
        };
      case "v-center":
        return {
          ...selection,
          rect: {
            ...selection.rect,
            top: Math.round(bounds.top + bounds.height / 2 - selection.rect.height / 2)
          }
        };
    }
  });
}

export function distributeCanvasSelections(
  selections: CanvasSelectionRect[],
  action: CanvasDistributionAction
): CanvasSelectionRect[] {
  const bounds = resolveSelectionBounds(selections);
  if (!bounds || selections.length < 3) {
    return selections;
  }

  const axis = action === "h-distribute" ? "x" : "y";
  const sorted = [...selections].sort((left, right) =>
    axis === "x" ? left.rect.left - right.rect.left : left.rect.top - right.rect.top
  );
  const totalSize = sorted.reduce(
    (sum, selection) => sum + (axis === "x" ? selection.rect.width : selection.rect.height),
    0
  );
  const gap = ((axis === "x" ? bounds.width : bounds.height) - totalSize) / (selections.length - 1);
  let cursor = axis === "x" ? bounds.left : bounds.top;
  const nextById = new Map<string, CanvasRect>();

  for (const selection of sorted) {
    nextById.set(
      selection.id,
      axis === "x"
        ? { ...selection.rect, left: Math.round(cursor) }
        : { ...selection.rect, top: Math.round(cursor) }
    );
    cursor += (axis === "x" ? selection.rect.width : selection.rect.height) + gap;
  }

  return selections.map((selection) => ({
    ...selection,
    rect: nextById.get(selection.id) ?? selection.rect
  }));
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

function resolveSnapRect(
  rect: CanvasRect,
  snap: CanvasSnapOptions | undefined,
  mode: {
    x: "move" | "none" | "resize-end" | "resize-start";
    y: "move" | "none" | "resize-end" | "resize-start";
  }
) {
  if (!snap?.enabled || snap.targets.length === 0 || snap.threshold <= 0) {
    return { guides: [] as CanvasGuide[], rect };
  }

  let nextRect = { ...rect };
  const guides: CanvasGuide[] = [];

  const xGuide = resolveSnapGuide(nextRect, snap, "x", mode.x);
  if (xGuide) {
    nextRect = xGuide.rect;
    guides.push(xGuide.guide);
  }

  const yGuide = resolveSnapGuide(nextRect, snap, "y", mode.y);
  if (yGuide) {
    nextRect = yGuide.rect;
    guides.push(yGuide.guide);
  }

  return { guides, rect: nextRect };
}

function resolveSnapGuide(
  rect: CanvasRect,
  snap: CanvasSnapOptions,
  axis: "x" | "y",
  mode: "move" | "none" | "resize-end" | "resize-start"
) {
  if (mode === "none") {
    return null;
  }

  const axisTargets = snap.targets.filter((target) => target.axis === axis);
  const start = axis === "x" ? rect.left : rect.top;
  const size = axis === "x" ? rect.width : rect.height;
  const anchors =
    mode === "move"
      ? [0, size / 2, size]
      : mode === "resize-start"
        ? [0]
        : [size];
  let winner:
    | {
        delta: number;
        rect: CanvasRect;
        target: CanvasSnapTarget;
      }
    | null = null;

  for (const target of axisTargets) {
    for (const anchor of anchors) {
      const delta = target.position - (start + anchor);
      if (Math.abs(delta) > snap.threshold) {
        continue;
      }

      const candidate = applyAxisDelta(rect, axis, mode, delta);
      if (!winner || Math.abs(delta) < Math.abs(winner.delta)) {
        winner = {
          delta,
          rect: candidate,
          target
        };
      }
    }
  }

  if (!winner) {
    return null;
  }

  return {
    guide: {
      axis,
      label: resolveSnapTargetLabel(winner.target.type),
      position: winner.target.position,
      targetType: winner.target.type
    },
    rect: winner.rect
  };
}

function applyAxisDelta(
  rect: CanvasRect,
  axis: "x" | "y",
  mode: "move" | "resize-end" | "resize-start",
  delta: number
) {
  if (axis === "x") {
    if (mode === "move") {
      return { ...rect, left: rect.left + delta };
    }
    if (mode === "resize-end") {
      return { ...rect, width: rect.width + delta };
    }
    return { ...rect, left: rect.left + delta, width: rect.width - delta };
  }

  if (mode === "move") {
    return { ...rect, top: rect.top + delta };
  }
  if (mode === "resize-end") {
    return { ...rect, height: rect.height + delta };
  }
  return { ...rect, height: rect.height - delta, top: rect.top + delta };
}

function resolveSnapTargetLabel(type: CanvasSnapTarget["type"]) {
  switch (type) {
    case "guide":
      return "Guide";
    case "region-edge":
      return "Region Edge";
    case "region-center":
      return "Region Center";
    case "center-line":
      return "Center Line";
  }
}

function resolveDirectionalGap(
  sourceStart: number,
  sourceEnd: number,
  targetStart: number,
  targetEnd: number
) {
  if (sourceEnd <= targetStart) {
    return {
      distance: targetStart - sourceEnd,
      relation: "before" as const
    };
  }

  return {
    distance: Math.max(0, sourceStart - targetEnd),
    relation: "after" as const
  };
}

function applyDistanceLockToDrag(
  rect: CanvasRect,
  session: CanvasDistanceLockSession
) {
  if (session.axis === "x") {
    return {
      ...rect,
      left:
        session.relation === "before"
          ? session.targetRect.left - rect.width - session.distance
          : session.targetRect.left + session.targetRect.width + session.distance
    };
  }

  return {
    ...rect,
    top:
      session.relation === "before"
        ? session.targetRect.top - rect.height - session.distance
        : session.targetRect.top + session.targetRect.height + session.distance
  };
}

function applyDistanceLockToResize(
  rect: CanvasRect,
  handle: CanvasResizeHandle,
  session: CanvasDistanceLockSession
) {
  if (session.axis === "x" && handle.includes("e") && session.relation === "before") {
    return {
      ...rect,
      width: session.targetRect.left - rect.left - session.distance
    };
  }

  if (session.axis === "x" && handle.includes("w") && session.relation === "after") {
    const nextLeft = session.targetRect.left + session.targetRect.width + session.distance;
    const right = rect.left + rect.width;
    return {
      ...rect,
      left: nextLeft,
      width: right - nextLeft
    };
  }

  if (session.axis === "y" && handle.includes("s") && session.relation === "before") {
    return {
      ...rect,
      height: session.targetRect.top - rect.top - session.distance
    };
  }

  if (session.axis === "y" && handle.includes("n") && session.relation === "after") {
    const nextTop = session.targetRect.top + session.targetRect.height + session.distance;
    const bottom = rect.top + rect.height;
    return {
      ...rect,
      height: bottom - nextTop,
      top: nextTop
    };
  }

  return rect;
}
