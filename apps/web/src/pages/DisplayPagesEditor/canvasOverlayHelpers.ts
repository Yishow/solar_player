import {
  type CanvasDesignMapping,
  type CanvasRect,
  mapCanvasPointToDesignPoint
} from "./canvasInteractions";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import type {
  DisplayEditorOverlayGuide,
  DisplayEditorOverlayMeasurement,
  DisplayEditorOverlayShellBandGuide,
  DisplayEditorOverlayTick
} from "./canvasOverlayState";

export function mapCanvasRectToDesignRect(rect: CanvasRect, mapping: CanvasDesignMapping): CanvasRect {
  const topLeft = mapCanvasPointToDesignPoint({ x: rect.left, y: rect.top }, mapping);
  const bottomRight = mapCanvasPointToDesignPoint(
    { x: rect.left + rect.width, y: rect.top + rect.height },
    mapping
  );

  return {
    height: bottomRight.y - topLeft.y,
    left: topLeft.x,
    top: topLeft.y,
    width: bottomRight.x - topLeft.x
  };
}

export function createGuideKey(axis: "x" | "y", designPosition: number, kind: "boundary" | "center") {
  return `${axis}:${kind}:${designPosition}`;
}

export function resolvePageGuides(
  regions: ResolvedDisplayEditorRegion[],
  mapping: CanvasDesignMapping,
  showCenterLines: boolean
): DisplayEditorOverlayGuide[] {
  const seen = new Set<string>();
  const guides: DisplayEditorOverlayGuide[] = [];

  for (const region of regions) {
    if (!region.geometry || region.parentId) {
      continue;
    }

    const horizontalBoundaries = [
      { axis: "x" as const, canvasPosition: region.geometry.left, kind: "boundary" as const },
      { axis: "x" as const, canvasPosition: region.geometry.left + region.geometry.width, kind: "boundary" as const }
    ];
    const verticalBoundaries = [
      { axis: "y" as const, canvasPosition: region.geometry.top, kind: "boundary" as const },
      { axis: "y" as const, canvasPosition: region.geometry.top + region.geometry.height, kind: "boundary" as const }
    ];
    const centerGuides = showCenterLines
      ? [
        { axis: "x" as const, canvasPosition: region.geometry.left + region.geometry.width / 2, kind: "center" as const },
        { axis: "y" as const, canvasPosition: region.geometry.top + region.geometry.height / 2, kind: "center" as const }
      ]
      : [];

    for (const item of [...horizontalBoundaries, ...verticalBoundaries, ...centerGuides]) {
      const designPosition =
        item.axis === "x"
          ? mapCanvasPointToDesignPoint({ x: item.canvasPosition, y: 0 }, mapping).x
          : mapCanvasPointToDesignPoint({ x: 0, y: item.canvasPosition }, mapping).y;
      const key = createGuideKey(item.axis, designPosition, item.kind);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      guides.push({
        axis: item.axis,
        canvasPosition: Math.round(item.canvasPosition),
        designPosition,
        kind: item.kind
      });
    }
  }

  if (showCenterLines) {
    for (const item of [
      { axis: "x" as const, canvasPosition: mapping.canvasWidth / 2, kind: "center" as const },
      { axis: "y" as const, canvasPosition: mapping.canvasHeight / 2, kind: "center" as const }
    ]) {
      const designPosition =
        item.axis === "x"
          ? mapCanvasPointToDesignPoint({ x: item.canvasPosition, y: 0 }, mapping).x
          : mapCanvasPointToDesignPoint({ x: 0, y: item.canvasPosition }, mapping).y;
      const key = createGuideKey(item.axis, designPosition, item.kind);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      guides.push({
        axis: item.axis,
        canvasPosition: Math.round(item.canvasPosition),
        designPosition,
        kind: item.kind
      });
    }
  }

  return guides.sort((a, b) => a.canvasPosition - b.canvasPosition);
}

export function resolveAxisTicks(mapping: CanvasDesignMapping, showAxes: boolean): DisplayEditorOverlayTick[] {
  if (!showAxes) {
    return [];
  }

  const ticks: DisplayEditorOverlayTick[] = [];
  const divisions = 4;

  for (let step = 0; step <= divisions; step += 1) {
    const x = Math.round((mapping.designWidth / divisions) * step);
    const y = Math.round((mapping.designHeight / divisions) * step);
    ticks.push({
      axis: "x",
      canvasPosition: Math.round(x * mapping.scaleX),
      designPosition: x
    });
    ticks.push({
      axis: "y",
      canvasPosition: Math.round(y * mapping.scaleY),
      designPosition: y
    });
  }

  return ticks;
}

export function resolveShellBandGuides({
  contentHeight,
  contentOffsetTop,
  mapping,
  shellHeight
}: {
  contentHeight: number;
  contentOffsetTop: number;
  mapping: CanvasDesignMapping;
  shellHeight: number;
}): DisplayEditorOverlayShellBandGuide[] {
  const positions = [
    { id: "shell-top" as const, label: "Shell top", position: 0 },
    { id: "header-content" as const, label: "Header / content", position: contentOffsetTop },
    { id: "content-footer" as const, label: "Content / footer", position: contentOffsetTop + contentHeight },
    { id: "shell-bottom" as const, label: "Shell bottom", position: shellHeight }
  ];

  return positions.map((guide) => ({
    canvasPosition: guide.position,
    designPosition: mapCanvasPointToDesignPoint({ x: 0, y: guide.position }, mapping).y,
    id: guide.id,
    label: guide.label
  }));
}

export function resolveMeasurement(
  selectedRegion: ResolvedDisplayEditorRegion | null,
  mapping: CanvasDesignMapping,
  activeRect?: CanvasRect | null
): DisplayEditorOverlayMeasurement | null {
  if (!selectedRegion?.geometry) {
    return null;
  }

  const measurementRect = activeRect ?? selectedRegion.geometry;
  const constraintRect = selectedRegion.geometryConstraint ?? {
    height: mapping.canvasHeight,
    left: 0,
    top: 0,
    width: mapping.canvasWidth
  };
  const designRect = mapCanvasRectToDesignRect(measurementRect, mapping);
  const designConstraintRect = mapCanvasRectToDesignRect(constraintRect, mapping);

  return {
    constraintRect,
    rect: measurementRect,
    designRect,
    distances: {
      bottom: designConstraintRect.top + designConstraintRect.height - (designRect.top + designRect.height),
      left: designRect.left - designConstraintRect.left,
      right: designConstraintRect.left + designConstraintRect.width - (designRect.left + designRect.width),
      top: designRect.top - designConstraintRect.top
    }
  };
}
