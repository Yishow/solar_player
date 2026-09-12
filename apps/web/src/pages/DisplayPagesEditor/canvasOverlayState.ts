import {
  type CanvasGuide,
  resolveRelationalMeasurements,
  mapCanvasPointToDesignPoint,
  resolveCanvasDesignMapping,
  type CanvasDesignMapping,
  resolveSelectionBounds,
  type CanvasDistanceLockSession,
  type CanvasRect
} from "./canvasInteractions";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";

type OverlayPresetStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export type DisplayEditorOverlayDisplayMode = "full-canvas" | "selected-only";
export type DisplayEditorOverlayFrameDensity = "soft" | "strong";
export type DisplayEditorOverlayDesignPresetKey = "custom" | "fhd" | "hd" | "uhd";

export type DisplayEditorOverlayPreset = {
  customHeight: number;
  customWidth: number;
  designPreset: DisplayEditorOverlayDesignPresetKey;
  displayMode: DisplayEditorOverlayDisplayMode;
  frameDensity: DisplayEditorOverlayFrameDensity;
  snapCenterLines: boolean;
  snapEnabled: boolean;
  snapGuides: boolean;
  snapRegionCenters: boolean;
  snapRegionEdges: boolean;
  showAxes: boolean;
  showCenterLines: boolean;
  showRegionLabels: boolean;
};

export type DisplayEditorOverlayFrame = {
  isLocked: boolean;
  isSelected: boolean;
  label: string | null;
  rect: CanvasRect;
  regionId: string;
  tone: "primary" | "secondary";
  visible: boolean;
};

export type DisplayEditorOverlayGuide = {
  axis: "x" | "y";
  canvasPosition: number;
  designPosition: number;
  kind: "boundary" | "center";
};

export type DisplayEditorOverlayTick = {
  axis: "x" | "y";
  canvasPosition: number;
  designPosition: number;
};

export type DisplayEditorOverlayMeasurement = {
  constraintRect: CanvasRect;
  rect: CanvasRect;
  designRect: CanvasRect;
  distances: {
    bottom: number;
    left: number;
    right: number;
    top: number;
  };
};

export type DisplayEditorOverlayShellBandGuide = {
  canvasPosition: number;
  designPosition: number;
  id: "content-footer" | "header-content" | "shell-bottom" | "shell-top";
  label: string;
};

export type DisplayEditorOverlayRuler = {
  axis: "x" | "y";
  canDrag: boolean;
  compact: boolean;
  distance: number;
  handlePosition: { x: number; y: number };
  labelPlacement: "after" | "before";
  labelPosition: { x: number; y: number };
  targetRegionId: string;
  end: { x: number; y: number };
  start: { x: number; y: number };
};

export type DisplayEditorOverlayState = {
  activeInteraction: {
    constraintRect: CanvasRect | null;
    guides: CanvasGuide[];
    rect: CanvasRect | null;
    type: "drag" | "idle" | "measure-x" | "measure-y" | "resize";
  };
  axisTicks: DisplayEditorOverlayTick[];
  contentOffsetTop: number;
  designMapping: CanvasDesignMapping;
  designSpace: {
    height: number;
    width: number;
  };
  displayMode: DisplayEditorOverlayDisplayMode;
  frames: DisplayEditorOverlayFrame[];
  framesById?: Map<string, DisplayEditorOverlayFrame>;
  measurement: DisplayEditorOverlayMeasurement | null;
  pageGuides: DisplayEditorOverlayGuide[];
  preset: DisplayEditorOverlayPreset;
  relationalRulers: DisplayEditorOverlayRuler[];
  selectionBounds: CanvasRect | null;
  selectionLabel: string | null;
  sessionDistanceLock: {
    axis: "x" | "y";
    boundaryClamped: boolean;
    distance: number;
  } | null;
  shellBandGuides: DisplayEditorOverlayShellBandGuide[];
  snapGuides: CanvasGuide[];
  temporaryMeasureMode: boolean;
  temporaryMeasureTargetRegionId: string | null;
};

export const DISPLAY_EDITOR_OVERLAY_STORAGE_KEY = "solar-display:display-editor-overlay";

export const defaultDisplayEditorOverlayPreset: DisplayEditorOverlayPreset = {
  customHeight: 1080, customWidth: 1920, designPreset: "fhd", displayMode: "selected-only", frameDensity: "soft",
  snapCenterLines: true, snapEnabled: true, snapGuides: true, snapRegionCenters: true, snapRegionEdges: true,
  showAxes: true, showCenterLines: false, showRegionLabels: false
};

const DESIGN_PRESET_SIZE = {
  fhd: { height: 1080, width: 1920 },
  hd: { height: 720, width: 1280 },
  uhd: { height: 2160, width: 3840 }
} as const;

function resolveOverlayStorage(storage?: OverlayPresetStorage | null) {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function normalizeDimension(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

function normalizeDisplayMode(value: unknown): DisplayEditorOverlayDisplayMode {
  return value === "full-canvas" ? "full-canvas" : "selected-only";
}

function normalizeFrameDensity(value: unknown): DisplayEditorOverlayFrameDensity {
  return value === "strong" ? "strong" : "soft";
}

function normalizeDesignPreset(value: unknown): DisplayEditorOverlayDesignPresetKey {
  return value === "custom" || value === "hd" || value === "uhd" ? value : "fhd";
}

function normalizeOverlayPreset(value: unknown): DisplayEditorOverlayPreset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<DisplayEditorOverlayPreset>;
  return {
    customHeight: normalizeDimension(candidate.customHeight, defaultDisplayEditorOverlayPreset.customHeight),
    customWidth: normalizeDimension(candidate.customWidth, defaultDisplayEditorOverlayPreset.customWidth),
    designPreset: normalizeDesignPreset(candidate.designPreset),
    displayMode: normalizeDisplayMode(candidate.displayMode),
    frameDensity: normalizeFrameDensity(candidate.frameDensity),
    snapCenterLines: candidate.snapCenterLines !== false,
    snapEnabled: candidate.snapEnabled !== false,
    snapGuides: candidate.snapGuides !== false,
    snapRegionCenters: candidate.snapRegionCenters !== false,
    snapRegionEdges: candidate.snapRegionEdges !== false,
    showAxes: candidate.showAxes !== false,
    showCenterLines: candidate.showCenterLines === true,
    showRegionLabels: candidate.showRegionLabels === true
  };
}

export function readStoredDisplayEditorOverlayPreset(storage?: OverlayPresetStorage | null) {
  const resolvedStorage = resolveOverlayStorage(storage);

  if (!resolvedStorage) {
    return null;
  }

  const raw = resolvedStorage.getItem(DISPLAY_EDITOR_OVERLAY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeOverlayPreset(JSON.parse(raw));
  } catch {
    resolvedStorage.removeItem(DISPLAY_EDITOR_OVERLAY_STORAGE_KEY);
    return null;
  }
}

export function writeStoredDisplayEditorOverlayPreset(
  preset: DisplayEditorOverlayPreset,
  storage?: OverlayPresetStorage | null
) {
  const resolvedStorage = resolveOverlayStorage(storage);

  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(DISPLAY_EDITOR_OVERLAY_STORAGE_KEY, JSON.stringify(preset));
}

export function resolveInitialDisplayEditorOverlayPreset(
  initialPreset?: Partial<DisplayEditorOverlayPreset> | null,
  storage?: OverlayPresetStorage | null
) {
  return (
    normalizeOverlayPreset(initialPreset) ??
    readStoredDisplayEditorOverlayPreset(storage) ??
    defaultDisplayEditorOverlayPreset
  );
}

export function resolveDisplayEditorOverlayDesignSpace(preset: DisplayEditorOverlayPreset) {
  if (preset.designPreset === "custom") {
    return {
      height: preset.customHeight,
      width: preset.customWidth
    };
  }

  return DESIGN_PRESET_SIZE[preset.designPreset];
}

export * from "./canvasOverlayHelpers";
export * from "./canvasOverlayComposition";
