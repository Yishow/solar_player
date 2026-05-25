import {
  type DisplayPageCardRailTemplateKey,
  type DisplayPageTemplateKey
} from "@solar-display/shared";
import React from "react";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { buildPlaybackFooterEntries, resolvePlaybackRouteMeta } from "../../app/playbackRouteMeta";
import { AppFooterNav } from "../../components/AppFooterNav";
import { AppHeader } from "../../components/AppHeader";
import { DisplayPageEditorAssetHealthPanel } from "../../components/displayPageAssetHealthPanels";
import { PageContainer } from "../../components/PageContainer";
import { routeMetaMap } from "../../app/routeMeta";
import { useDisplayPageAssetHealth } from "../../hooks/useDisplayPageAssetHealth";
import { setValueAtPath, useDisplayPageConfig } from "../../hooks/useDisplayPageConfig";
import { useDisplayEditorKeybinding } from "../../hooks/useDisplayEditor";
import { type DisplayPagePublishingStateMap, useDisplayPagePublishingState } from "./publishing";
import { DisplayPagePublishingPanels } from "./publishingStatus";
import { DisplayEditorCanvasCard } from "./canvasCard";
import { defaultDisplayEditorOverlayPreset } from "./canvasOverlayState";
import { DisplayEditorInspectorCard } from "./inspectorCard";
import { DisplayEditorCanvasOverlay } from "./inspectorFields";
import { isRegionLocked, toggleRegionLock } from "./displayEditorRegionState";
import { fallbackPageDefinitions } from "./fallbackPageDefinitions";
import { resolveDisplayEditorRegions } from "./inspectorFields";
import { localizeDisplayEditorLabel } from "./localization";
import { resolvePageRegionSchemas } from "./pageRegionSchemas";
import { DisplayEditorLeftPanel } from "./regionTree";
import {
  addCardRailCard,
  duplicateCardRailCard,
  moveCardRailCard,
  removeCardRailCard,
  switchCardRailCardTemplate,
  toggleCardRailCardVisibility
} from "./cardRailAuthoring";
import { CardRailInspectorActions } from "./cardRailInspectorActions";
import {
  EDITOR_PREVIEW_CONTENT_TOP,
  EDITOR_PREVIEW_SHELL_HEIGHT,
  EDITOR_PREVIEW_SURFACE_HEIGHT,
  EDITOR_PREVIEW_SURFACE_WIDTH,
  EDITOR_PREVIEW_VIEWPORT_HEIGHT,
  EDITOR_PREVIEW_VIEWPORT_WIDTH,
  useDisplayEditorCanvasWorkflow
} from "./useDisplayEditorCanvasWorkflow";

type DisplayEditorField = { id: string; label: string; onChange: (value: string) => void; step?: number; type: "number" | "text"; value: number | string };
type DisplayEditorRect = { height?: number; left: number; top: number; width: number };
export type DisplayEditorRegion = { description?: string; fields: DisplayEditorField[]; id: string; label: string; rect?: DisplayEditorRect };
export type DisplayEditorPageDefinition = {
  createSeedConfig: () => Record<string, unknown>;
  id: string;
  label: string;
  renderPage?: (pageId: string) => ReactElement;
  renderPreview?: (config: Record<string, unknown>) => ReactElement;
  templateKey: DisplayPageTemplateKey;
};

function renderDisplayEditorFallback(label: string) {
  return (
    <div className="flex h-full items-center justify-center bg-[#e8eddf] text-[40px] font-semibold text-[var(--shell-title-ink)]">
      {localizeDisplayEditorLabel(label)}
    </div>
  );
}

const editorRouteMeta = routeMetaMap.get("/display-pages/editor")!;

export function DisplayPagesEditor({
  editMode: controlledEditMode,
  initialEditorState,
  onEditModeChange,
  initialPublishingStateByPage,
  pageDefinitions = fallbackPageDefinitions,
  renderPreview = true
}: {
  editMode?: boolean;
  initialEditorState?: {
    editMode?: boolean;
    lockedRegionIds?: string[];
    selectedRegionId?: string | null;
  };
  initialPublishingStateByPage?: DisplayPagePublishingStateMap;
  onEditModeChange?: (nextEditMode: boolean) => void;
  pageDefinitions?: DisplayEditorPageDefinition[];
  renderPreview?: boolean;
}) {
  const resolvedPageDefinitions = useMemo(
    () => (pageDefinitions.length > 0 ? pageDefinitions : fallbackPageDefinitions),
    [pageDefinitions]
  );
  const defaultPageId = resolvedPageDefinitions[0]?.id ?? "overview";
  const pageIdSet = useMemo(
    () => new Set(resolvedPageDefinitions.map((page) => page.id)),
    [resolvedPageDefinitions]
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPageId = searchParams.get("page");
  const selectedPageId =
    requestedPageId && pageIdSet.has(requestedPageId)
      ? requestedPageId
      : defaultPageId;
  const [internalEditMode, setInternalEditMode] = useState(initialEditorState?.editMode ?? false);
  const [canvasContainerScale, setCanvasContainerScale] = useState(1);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(initialEditorState?.selectedRegionId ?? null);
  const [lockedRegionIdsByPage, setLockedRegionIdsByPage] = useState<Record<string, string[]>>(
    () =>
      initialEditorState?.lockedRegionIds?.length
        ? { [selectedPageId]: initialEditorState.lockedRegionIds }
        : {}
  );
  const editMode = controlledEditMode ?? internalEditMode;

  const selectedPage = useMemo(
    () => resolvedPageDefinitions.find((page) => page.id === selectedPageId) ?? resolvedPageDefinitions[0]!,
    [resolvedPageDefinitions, selectedPageId]
  );
  const seedConfig = useMemo(() => selectedPage.createSeedConfig(), [selectedPage]);
  const {
    applyConfigUpdate,
    canRedo,
    canUndo,
    config,
    dirty,
    errorMessage,
    fallbackPolicy,
    isLoading,
    isSaving,
    lastLoadedEnvelope,
    message,
    redo,
    resetPaths,
    reload,
    save,
    setConfig,
    undo
  } = useDisplayPageConfig(selectedPage.id, seedConfig, { stage: "draft" });

  const updatePath = (path: Array<number | string>, value: unknown) => {
    setConfig((current) => setValueAtPath(current, path, value));
  };
  const editableRegions = useMemo(
    () => resolveDisplayEditorRegions(config, resolvePageRegionSchemas(selectedPage.templateKey), seedConfig),
    [config, seedConfig, selectedPage.templateKey]
  );
  const selectedRegion = useMemo(
    () => editableRegions.find((region) => region.id === selectedRegionId) ?? editableRegions[0] ?? null,
    [editableRegions, selectedRegionId]
  );
  const selectedCardRegion = selectedRegion?.nodeType === "card-rail-card" ? selectedRegion : null;
  const lockedRegionIds = lockedRegionIdsByPage[selectedPage.id] ?? [];
  const selectedRegionLocked = isRegionLocked(lockedRegionIds, selectedRegion?.id);
  const {
    blockingCount,
    isPublishBlocked,
    isPublishing,
    publish,
    publishingError,
    publishingState,
    refresh
  } = useDisplayPagePublishingState(
    selectedPage.id,
    lastLoadedEnvelope?.updatedAt,
    initialPublishingStateByPage,
    reload
  );
  const {
    errorMessage: assetHealthErrorMessage,
    isLoading: isAssetHealthLoading,
    reload: reloadAssetHealth,
    report: assetHealthReport
  } = useDisplayPageAssetHealth();

  useEffect(() => { setSelectedRegionId(null); }, [selectedPage.id]);

  useEffect(() => {
    if (!editMode) {
      setSelectedRegionId(null);
      return;
    }

    if (!selectedRegionId && editableRegions[0]) {
      setSelectedRegionId(editableRegions[0].id);
    }
  }, [editMode, editableRegions, selectedRegionId]);

  const setEditMode = useCallback(
    (nextEditMode: boolean | ((current: boolean) => boolean)) => {
      const resolvedNextEditMode =
        typeof nextEditMode === "function" ? nextEditMode(editMode) : nextEditMode;

      if (controlledEditMode === undefined) {
        setInternalEditMode(resolvedNextEditMode);
      }
      onEditModeChange?.(resolvedNextEditMode);
    },
    [controlledEditMode, editMode, onEditModeChange]
  );

  const toggleEditMode = useCallback(() => {
    setEditMode((current) => !current);
  }, [setEditMode]);

  useDisplayEditorKeybinding(toggleEditMode);

  const handleReload = async () => {
    await reload();
    await refresh();
    await reloadAssetHealth();
  };

  const handleSave = async () => {
    await save();
    await refresh();
    await reloadAssetHealth();
  };

  const handleSelectCardTemplate = (template: DisplayPageCardRailTemplateKey) => {
    if (!selectedCardRegion?.cardId || !selectedCardRegion.railPath) {
      return;
    }

    applyConfigUpdate((current) =>
      switchCardRailCardTemplate(current, selectedCardRegion.railPath!, selectedCardRegion.cardId!, template)
    );
  };

  const handleSelectPage = (pageId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", pageId);
    setSearchParams(nextParams, { replace: true });
  };

  const { onStartInteraction, onZoomDelta, overlayPreset, overlayState, setOverlayPreset, viewport, viewportControls } = useDisplayEditorCanvasWorkflow({
    applyConfigUpdate,
    canRedo,
    canUndo,
    canvasContainerScale,
    config,
    editMode,
    lockedRegionIds,
    redo,
    regions: editableRegions,
    selectedRegion,
    undo
  });
  const previewContent = useMemo(() => {
    if (!renderPreview || !selectedPage.renderPreview) {
      return renderDisplayEditorFallback(selectedPage.label);
    }

    return React.createElement(
      selectedPage.renderPreview as unknown as React.ComponentType<Record<string, unknown>>,
      config
    );
  }, [config, renderPreview, selectedPage]);

  const overlayDesignSpace = overlayState.designSpace;

  const [rightTab, setRightTab] = useState<"inspector" | "health" | "publish">("inspector");
  const previewPlaybackEntries = useMemo(() => buildPlaybackFooterEntries([]), []);
  const previewRouteMeta = useMemo(
    () => resolvePlaybackRouteMeta(`/${selectedPage.id}`, []),
    [selectedPage.id]
  );

  const pageTabs = (
    <div className="flex items-end gap-2">
      <button
        type="button"
        title="切換編輯模式 (E)"
        aria-pressed={editMode}
        className={[
          "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors",
          editMode
            ? "bg-[rgba(95,140,80,0.16)] text-[var(--shell-title-ink)] hover:bg-[rgba(95,140,80,0.26)]"
            : "bg-[rgba(82,91,66,0.08)] text-[var(--shell-muted-ink)] hover:bg-[rgba(82,91,66,0.14)] hover:text-[var(--shell-title-ink)]"
        ].join(" ")}
        onClick={toggleEditMode}
      >
        {editMode ? "編輯模式開啟" : "編輯模式關閉"}
      </button>
      {resolvedPageDefinitions.map((page) => {
        const active = page.id === selectedPageId;
        return (
          <button
            key={page.id}
            type="button"
            className={[
              "rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
              active
                ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                : "border-[var(--shell-divider)] bg-white/70 text-[var(--shell-muted-ink)] hover:border-[var(--shell-divider-strong)] hover:text-[var(--shell-title-ink)]"
            ].join(" ")}
            onClick={() => handleSelectPage(page.id)}
          >
            {localizeDisplayEditorLabel(page.label)}
          </button>
        );
      })}
    </div>
  );

  const cardRailActions = selectedCardRegion ? (
    <CardRailInspectorActions
      selectedRegion={selectedCardRegion}
      selectedRegionLocked={selectedRegionLocked}
      onAddCard={() =>
        applyConfigUpdate((current) =>
          addCardRailCard(current, selectedCardRegion.railPath!, selectedCardRegion.templateKey!)
        )
      }
      onDeleteCard={() =>
        applyConfigUpdate((current) =>
          removeCardRailCard(current, selectedCardRegion.railPath!, selectedCardRegion.cardId!)
        )
      }
      onDuplicateCard={() =>
        applyConfigUpdate((current) =>
          duplicateCardRailCard(current, selectedCardRegion.railPath!, selectedCardRegion.cardId!)
        )
      }
      onMoveEarlier={() =>
        applyConfigUpdate((current) =>
          moveCardRailCard(current, selectedCardRegion.railPath!, selectedCardRegion.cardId!, "earlier")
        )
      }
      onMoveLater={() =>
        applyConfigUpdate((current) =>
          moveCardRailCard(current, selectedCardRegion.railPath!, selectedCardRegion.cardId!, "later")
        )
      }
      onSelectTemplate={handleSelectCardTemplate}
      onToggleVisibility={() =>
        applyConfigUpdate((current) =>
          toggleCardRailCardVisibility(current, selectedCardRegion.railPath!, selectedCardRegion.cardId!)
        )
      }
    />
  ) : null;

  return (
    <PageContainer
      density="playback"
      shellPrimitive="management-scaffold"
      title={editorRouteMeta.title}
      subtitle={editorRouteMeta.subtitle}
      description="切換五個展示頁畫布，並在同一頁完成區域選取、屬性調整與草稿發布。"
      aside={pageTabs}
    >
      <div className="grid h-full min-h-0 grid-rows-1 grid-cols-[220px_1fr_260px] overflow-hidden rounded-[20px] border border-[var(--shell-divider)] bg-white/50 shadow-[0_20px_45px_rgba(80,94,54,0.08)]">
        <DisplayEditorLeftPanel
          dirty={dirty}
          editMode={editMode}
          errorMessage={errorMessage}
          isLoading={isLoading}
          isPublishing={isPublishing}
          isPublishBlocked={isPublishBlocked}
          isSaving={isSaving}
          message={message}
          onPublish={() => void publish()}
          onReload={() => void handleReload()}
          onSave={() => void handleSave()}
          onSelectRegion={setSelectedRegionId}
          onToggleRegionLock={(regionId) => {
            setLockedRegionIdsByPage((current) => ({
              ...current,
              [selectedPage.id]: toggleRegionLock(current[selectedPage.id] ?? [], regionId)
            }));
          }}
          regions={editableRegions}
          lockedRegionIds={lockedRegionIds}
          selectedRegionId={selectedRegion?.id ?? null}
        />

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
                    <DisplayEditorCanvasOverlay
                      isInteractive={editMode}
                      lockedRegionIds={lockedRegionIds}
                      overlayState={overlayState}
                      regions={editableRegions}
                      selectedRegionId={selectedRegion?.id ?? null}
                      onSelect={setSelectedRegionId}
                      onStartInteraction={onStartInteraction}
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
                    <AppFooterNav
                      playbackEntries={previewPlaybackEntries}
                      resolvedPlaybackRouteMeta={previewRouteMeta}
                    />
                  </div>
                </div>
              </div>
            }
            viewportHeight={EDITOR_PREVIEW_VIEWPORT_HEIGHT}
            viewportWidth={EDITOR_PREVIEW_VIEWPORT_WIDTH}
          />
        </div>

        <div className="flex flex-col overflow-hidden border-l border-[var(--shell-divider)]">
          <div className="shrink-0 flex border-b border-[var(--shell-divider)]">
            {(["inspector", "health", "publish"] as const).map((tab) => {
              const labels = { inspector: "屬性", health: "素材健康", publish: "發布" };
              return (
                <button
                  key={tab}
                  type="button"
                  className={[
                    "flex-1 px-2 py-2.5 text-[11px] font-semibold transition-colors",
                    rightTab === tab
                      ? "border-b-2 border-[var(--shell-accent)] text-[var(--shell-title-ink)]"
                      : "text-[var(--shell-muted-ink)] hover:text-[var(--shell-copy-ink)]"
                  ].join(" ")}
                  onClick={() => setRightTab(tab)}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {rightTab === "inspector" && (
              <DisplayEditorInspectorCard
                flat
                actions={selectedRegion ? cardRailActions : null}
                editMode={editMode}
                emptyMessage={
                  editableRegions.length > 0
                    ? "請先在畫布上選取一個可編輯區域。"
                    : "這個頁面的專屬編輯區域尚未展開，先保留預覽與路由覆蓋。"
                }
                onChange={updatePath}
                onResetField={(path) => resetPaths([path])}
                selectedRegion={selectedRegion}
              />
            )}
            {rightTab === "health" && (
              <DisplayPageEditorAssetHealthPanel
                errorMessage={assetHealthErrorMessage}
                isLoading={isAssetHealthLoading}
                pageId={selectedPage.id}
                report={assetHealthReport}
              />
            )}
            {rightTab === "publish" && (
              <DisplayPagePublishingPanels
                blockingCount={blockingCount}
                fallbackPolicy={fallbackPolicy}
                publishingError={publishingError}
                publishingState={publishingState}
              />
            )}
          </div>
          </div>
        </div>
    </PageContainer>
  );
}
