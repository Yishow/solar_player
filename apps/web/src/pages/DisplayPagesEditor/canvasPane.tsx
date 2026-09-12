import React, { useMemo, useState } from "react";
import { buildPlaybackFooterEntries, resolvePlaybackRouteMeta } from "../../app/playbackRouteMeta";
import { AppFooterNav } from "../../components/AppFooterNav";
import { AppHeader } from "../../components/AppHeader";
import { DisplayEditorCanvasCard } from "./canvasCard";
import {
  alignCanvasSelections,
  distributeCanvasSelections
} from "./canvasInteractions";
import { defaultDisplayEditorOverlayPreset } from "./canvasOverlayState";
import { renderProfiledDisplayEditorPreview } from "./displayEditorProfiler";
import { DisplayEditorCanvasOverlay } from "./inspectorFields";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { localizeDisplayEditorLabel } from "./localization";
import {
  EDITOR_PREVIEW_CONTENT_TOP,
  EDITOR_PREVIEW_SHELL_HEIGHT,
  EDITOR_PREVIEW_SURFACE_HEIGHT,
  EDITOR_PREVIEW_SURFACE_WIDTH,
  EDITOR_PREVIEW_VIEWPORT_HEIGHT,
  EDITOR_PREVIEW_VIEWPORT_WIDTH,
  useDisplayEditorCanvasWorkflow
} from "./useDisplayEditorCanvasWorkflow";

type DisplayEditorConfigUpdate = (
  nextValue:
    | Record<string, unknown>
    | ((current: Record<string, unknown>) => Record<string, unknown>),
  options?: {
    dirtyPaths?: Array<Array<number | string>>;
    historyBase?: Record<string, unknown>;
    recordHistory?: boolean;
  }
) => void;

type DisplayEditorCanvasPaneProps = {
  applyConfigUpdate: DisplayEditorConfigUpdate;
  canRedo: boolean;
  canUndo: boolean;
  config: Record<string, unknown>;
  displayEditorProfilingEnabled: boolean;
  distanceLockTargetRegion: ResolvedDisplayEditorRegion | null;
  editMode: boolean;
  lockedSelectionIds: string[];
  onApplySelectionRects: (
    actionLabel: string,
    nextSelections: Array<{ id: string; rect: { height: number; left: number; top: number; width: number } }>
  ) => void;
  onSelectRegion: (regionId: string, options?: { additive?: boolean }) => void;
  redo: () => void;
  regions: ResolvedDisplayEditorRegion[];
  renderPreview: boolean;
  selectedPage: {
    id: string;
    label: string;
    renderPreview?: (config: Record<string, unknown>) => React.ReactElement;
  };
  selectedRegion: ResolvedDisplayEditorRegion | null;
  selectedRegionIds: string[];
  selectedRegions: ResolvedDisplayEditorRegion[];
  selectionFeedbackLabel: string | null;
  undo: () => void;
};

function renderDisplayEditorFallback(label: string) {
  return (
    <div className="flex h-full items-center justify-center bg-[#e8eddf] text-[40px] font-semibold text-[var(--shell-title-ink)]">
      {localizeDisplayEditorLabel(label)}
    </div>
  );
}

export const DisplayEditorCanvasPane = React.memo(function DisplayEditorCanvasPane({
  applyConfigUpdate,
  canRedo,
  canUndo,
  config,
  displayEditorProfilingEnabled,
  distanceLockTargetRegion,
  editMode,
  lockedSelectionIds,
  onApplySelectionRects,
  onSelectRegion,
  redo,
  regions,
  renderPreview,
  selectedPage,
  selectedRegion,
  selectedRegionIds,
  selectedRegions,
  selectionFeedbackLabel,
  undo
}: DisplayEditorCanvasPaneProps) {
  const [canvasContainerScale, setCanvasContainerScale] = useState(1);
  const {
    distanceLockArmed,
    onSelectTemporaryMeasureTarget,
    onStartInteraction,
    onStartMeasurementHandleDrag,
    onZoomDelta,
    overlayPreset,
    overlayState,
    setDistanceLockArmed,
    setOverlayPreset,
    setTemporaryMeasureMode,
    temporaryMeasureMode,
    temporaryMeasureTargetRegionId,
    viewport,
    viewportControls
  } = useDisplayEditorCanvasWorkflow({
    applyConfigUpdate,
    canRedo,
    canUndo,
    canvasContainerScale,
    config,
    distanceLockTargetRegion,
    editMode,
    lockedRegionIds: lockedSelectionIds,
    redo,
    regions,
    selectedRegion,
    selectedRegionIds,
    selectionFeedbackLabel,
    undo
  });

  const previewContent = useMemo(() => {
    if (!renderPreview || !selectedPage.renderPreview) {
      return renderDisplayEditorFallback(selectedPage.label);
    }

    const preview = React.createElement(
      selectedPage.renderPreview as unknown as React.ComponentType<Record<string, unknown>>,
      config
    );
    return renderProfiledDisplayEditorPreview(selectedPage.id, preview, displayEditorProfilingEnabled);
  }, [config, displayEditorProfilingEnabled, renderPreview, selectedPage]);

  const overlayDesignSpace = overlayState.designSpace;
  const temporaryMeasureTargetRegion = useMemo(
    () => regions.find((region) => region.id === temporaryMeasureTargetRegionId) ?? null,
    [regions, temporaryMeasureTargetRegionId]
  );
  const multiSelectCount = selectedRegions.length;
  const alignDisabled =
    !editMode || multiSelectCount < 2 || selectedRegions.some((region) => lockedSelectionIds.includes(region.id));
  const distributeDisabled =
    !editMode || multiSelectCount < 3 || selectedRegions.some((region) => lockedSelectionIds.includes(region.id));

  const previewPlaybackEntries = useMemo(() => buildPlaybackFooterEntries([]), []);
  const previewRouteMeta = useMemo(
    () => resolvePlaybackRouteMeta(`/${selectedPage.id}`, []),
    [selectedPage.id]
  );

  return (
    <div className="overflow-y-auto p-5">
      <DisplayEditorCanvasCard
        controls={
          <div className="mt-4 grid gap-3 text-[13px] text-[var(--shell-copy-ink)]">
            <div className="flex flex-wrap items-center gap-3">
              {viewportControls.map((control) => (
                <button
                  key={control.label}
                  type="button"
                  className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 disabled:opacity-45"
                  disabled={control.disabled}
                  onClick={control.action}
                >
                  {control.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-[var(--shell-divider)] bg-white/70 px-4 py-3">
              <span className="font-semibold text-[var(--shell-title-ink)]">Overlay</span>
              <div className="flex items-center gap-2">
                {[
                  { label: "點中區域", value: "selected-only" },
                  { label: "全畫參考", value: "full-canvas" }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={overlayPreset.displayMode === option.value}
                    className={[
                      "rounded-full border px-3 py-1.5",
                      overlayPreset.displayMode === option.value
                        ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                        : "border-[var(--shell-divider)]"
                    ].join(" ")}
                    onClick={() =>
                      setOverlayPreset((current) => ({
                        ...current,
                        displayMode: option.value as typeof current.displayMode
                      }))
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2">
                <span>設計尺寸</span>
                <select
                  className="rounded-full border border-[var(--shell-divider)] bg-white px-3 py-1.5"
                  value={overlayPreset.designPreset}
                  onChange={(event) =>
                    setOverlayPreset((current) => ({
                      ...current,
                      designPreset: event.target.value as typeof current.designPreset
                    }))
                  }
                >
                  <option value="hd">1280 × 720</option>
                  <option value="fhd">1920 × 1080</option>
                  <option value="uhd">3840 × 2160</option>
                  <option value="custom">自訂</option>
                </select>
              </label>
              {overlayPreset.designPreset === "custom" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={320}
                    className="w-24 rounded-full border border-[var(--shell-divider)] bg-white px-3 py-1.5"
                    value={overlayPreset.customWidth}
                    onChange={(event) =>
                      setOverlayPreset((current) => ({
                        ...current,
                        customWidth: Math.max(320, Number(event.target.value) || defaultDisplayEditorOverlayPreset.customWidth)
                      }))
                    }
                  />
                  <span>×</span>
                  <input
                    type="number"
                    min={180}
                    className="w-24 rounded-full border border-[var(--shell-divider)] bg-white px-3 py-1.5"
                    value={overlayPreset.customHeight}
                    onChange={(event) =>
                      setOverlayPreset((current) => ({
                        ...current,
                        customHeight: Math.max(180, Number(event.target.value) || defaultDisplayEditorOverlayPreset.customHeight)
                      }))
                    }
                  />
                </div>
              ) : (
                <span className="rounded-full bg-[rgba(82,91,66,0.08)] px-3 py-1.5 text-[12px] text-[var(--shell-subtitle-ink)]">
                  {overlayDesignSpace.width} × {overlayDesignSpace.height}
                </span>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={overlayPreset.snapEnabled}
                  className={[
                    "rounded-full border px-3 py-1.5",
                    overlayPreset.snapEnabled
                      ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                      : "border-[var(--shell-divider)]"
                  ].join(" ")}
                  onClick={() =>
                    setOverlayPreset((current) => ({
                      ...current,
                      snapEnabled: !current.snapEnabled
                    }))
                  }
                >
                  吸附
                </button>
                {[
                  { key: "snapGuides", label: "Guide" },
                  { key: "snapRegionEdges", label: "邊界" },
                  { key: "snapRegionCenters", label: "中心" },
                  { key: "snapCenterLines", label: "頁心線" }
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={overlayPreset[option.key as keyof typeof overlayPreset] === true}
                    className={[
                      "rounded-full border px-3 py-1.5",
                      overlayPreset.snapEnabled && overlayPreset[option.key as keyof typeof overlayPreset] === true
                        ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                        : "border-[var(--shell-divider)] text-[var(--shell-subtitle-ink)]"
                    ].join(" ")}
                    onClick={() =>
                      setOverlayPreset((current) => ({
                        ...current,
                        [option.key]:
                          !current[option.key as "snapCenterLines" | "snapGuides" | "snapRegionCenters" | "snapRegionEdges"]
                      }))
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={distanceLockArmed}
                  disabled={!distanceLockTargetRegion}
                  className={[
                    "rounded-full border px-3 py-1.5 disabled:opacity-45",
                    distanceLockArmed
                      ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                      : "border-[var(--shell-divider)]"
                  ].join(" ")}
                  onClick={() => setDistanceLockArmed((current: boolean) => !current)}
                >
                  鎖定間距
                </button>
                {distanceLockTargetRegion ? (
                  <span className="rounded-full bg-[rgba(82,91,66,0.08)] px-3 py-1.5 text-[12px] text-[var(--shell-subtitle-ink)]">
                    對象：{distanceLockTargetRegion.label}
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-pressed={temporaryMeasureMode}
                  className={[
                    "rounded-full border px-3 py-1.5",
                    temporaryMeasureMode
                      ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                      : "border-[var(--shell-divider)]"
                  ].join(" ")}
                  onClick={() => setTemporaryMeasureMode((current: boolean) => !current)}
                >
                  暫時量測
                </button>
                {temporaryMeasureTargetRegion ? (
                  <span className="rounded-full bg-[rgba(82,91,66,0.08)] px-3 py-1.5 text-[12px] text-[var(--shell-subtitle-ink)]">
                    目標：{temporaryMeasureTargetRegion.label}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { action: "left", disabled: alignDisabled, label: "左對齊" },
                  { action: "right", disabled: alignDisabled, label: "右對齊" },
                  { action: "top", disabled: alignDisabled, label: "上對齊" },
                  { action: "bottom", disabled: alignDisabled, label: "下對齊" },
                  { action: "h-center", disabled: alignDisabled, label: "水平置中" },
                  { action: "v-center", disabled: alignDisabled, label: "垂直置中" },
                  { action: "h-distribute", disabled: distributeDisabled, label: "水平分布" },
                  { action: "v-distribute", disabled: distributeDisabled, label: "垂直分布" }
                ].map((option) => (
                  <button
                    key={option.action}
                    type="button"
                    disabled={option.disabled}
                    className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 disabled:opacity-45"
                    onClick={() => {
                      const selections = selectedRegions.map((region) => ({
                        id: region.id,
                        rect: region.geometry!
                      }));
                      const nextSelections =
                        option.action === "h-distribute" || option.action === "v-distribute"
                          ? distributeCanvasSelections(selections, option.action)
                          : alignCanvasSelections(
                              selections,
                              option.action as "bottom" | "h-center" | "left" | "right" | "top" | "v-center"
                            );
                      onApplySelectionRects(option.label, nextSelections);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
                <span className="rounded-full bg-[rgba(82,91,66,0.08)] px-3 py-1.5 text-[12px] text-[var(--shell-subtitle-ink)]">
                  {multiSelectCount > 1 ? `多選 ${multiSelectCount} 區` : "多選需按 Shift 或 Cmd/Ctrl"}
                </span>
                {[
                  { key: "showAxes", label: "座標刻度" },
                  { key: "showCenterLines", label: "中心線" },
                  { key: "showRegionLabels", label: "區域標籤" }
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={overlayPreset[option.key as keyof typeof overlayPreset] === true}
                    className={[
                      "rounded-full border px-3 py-1.5",
                      overlayPreset[option.key as keyof typeof overlayPreset] === true
                        ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                        : "border-[var(--shell-divider)]"
                    ].join(" ")}
                    onClick={() =>
                      setOverlayPreset((current) => ({
                        ...current,
                        [option.key]: !current[option.key as "showAxes" | "showCenterLines" | "showRegionLabels"]
                      }))
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span>框線強度</span>
                {[
                  { label: "淡", value: "soft" },
                  { label: "強", value: "strong" }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={overlayPreset.frameDensity === option.value}
                    className={[
                      "rounded-full border px-3 py-1.5",
                      overlayPreset.frameDensity === option.value
                        ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                        : "border-[var(--shell-divider)]"
                    ].join(" ")}
                    onClick={() =>
                      setOverlayPreset((current) => ({
                        ...current,
                        frameDensity: option.value as typeof current.frameDensity
                      }))
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
        onScaleChange={setCanvasContainerScale}
        onZoomDelta={onZoomDelta}
        preview={
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              ["--shell-divider-scale-y" as string]: 1,
              height: `${EDITOR_PREVIEW_SHELL_HEIGHT}px`,
              minHeight: `${EDITOR_PREVIEW_SHELL_HEIGHT}px`,
              minWidth: `${EDITOR_PREVIEW_SURFACE_WIDTH}px`,
              transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${0.5 * viewport.zoom})`,
              transformOrigin: "top left",
              width: `${EDITOR_PREVIEW_SURFACE_WIDTH}px`
            }}
          >
            <div className="shell-stage-surface relative h-full w-full overflow-hidden">
              <div className="shell-stage-overlay pointer-events-none absolute inset-0" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
                <AppHeader />
              </div>
              <div
                className="absolute left-0 overflow-hidden"
                style={{
                  height: `${EDITOR_PREVIEW_SURFACE_HEIGHT}px`,
                  top: `${EDITOR_PREVIEW_CONTENT_TOP}px`,
                  width: `${EDITOR_PREVIEW_SURFACE_WIDTH}px`
                }}
              >
                <div className="pointer-events-none relative h-full w-full">
                  {previewContent}
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
                <AppFooterNav
                  playbackEntries={previewPlaybackEntries}
                  resolvedPlaybackRouteMeta={previewRouteMeta}
                />
              </div>
              <DisplayEditorCanvasOverlay
                isInteractive={editMode}
                lockedRegionIds={lockedSelectionIds}
                onSelectTemporaryMeasureTarget={onSelectTemporaryMeasureTarget}
                onStartMeasurementHandleDrag={onStartMeasurementHandleDrag}
                overlayState={overlayState}
                regions={regions}
                selectedRegionId={selectedRegion?.id ?? null}
                selectedRegionIds={selectedRegionIds}
                temporaryMeasureMode={temporaryMeasureMode}
                onSelect={onSelectRegion}
                onStartInteraction={onStartInteraction}
              />
            </div>
          </div>
        }
        viewportHeight={EDITOR_PREVIEW_VIEWPORT_HEIGHT}
        viewportWidth={EDITOR_PREVIEW_VIEWPORT_WIDTH}
      />
    </div>
  );
});
