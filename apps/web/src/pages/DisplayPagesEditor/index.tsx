import type { DisplayPageKey } from "@solar-display/shared";
import React from "react";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DisplayPageEditorAssetHealthPanel } from "../../components/displayPageAssetHealthPanels";
import { PageContainer } from "../../components/PageContainer";
import { routeMetaMap } from "../../app/routeMeta";
import { useDisplayPageAssetHealth } from "../../hooks/useDisplayPageAssetHealth";
import { setValueAtPath, useDisplayPageConfig } from "../../hooks/useDisplayPageConfig";
import { useDisplayEditorKeybinding } from "../../hooks/useDisplayEditor";
import {
  formatFallbackKey,
  formatFallbackMode,
  type DisplayPagePublishingStateMap,
  useDisplayPagePublishingState
} from "./publishing";
import { DisplayPagePublishingPanels } from "./publishingStatus";
import { DisplayEditorCanvasCard } from "./canvasCard";
import { DisplayEditorInspectorCard } from "./inspectorCard";
import { DisplayEditorCanvasOverlay } from "./inspectorFields";
import { applyGeometryClipboard, createGeometryClipboard, resolveGeometryClipboardCompatibility, type DisplayEditorGeometryClipboard } from "./displayEditorGeometry";
import { applyRegionPreset } from "./displayEditorPresets";
import { isRegionLocked, resolveRegionPresetOptions, toggleRegionLock } from "./displayEditorRegionState";
import { fallbackPageDefinitions } from "./fallbackPageDefinitions";
import { resolveDisplayEditorRegions } from "./inspectorFields";
import { DisplayEditorInspectorTools } from "./inspectorTools";
import { resolvePageRegionSchemas } from "./pageRegionSchemas";
import { DisplayEditorLeftPanel } from "./regionTree";
import {
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
  buildEditableRegions?: (config: Record<string, unknown>, helpers: { updatePath: (path: Array<number | string>, value: unknown) => void }) => DisplayEditorRegion[];
  createSeedConfig: () => Record<string, unknown>;
  id: DisplayPageKey;
  label: string;
  renderPreview?: (config: Record<string, unknown>) => ReactElement;
};

function renderDisplayEditorFallback(label: string) {
  return (
    <div className="flex h-full items-center justify-center bg-[#e8eddf] text-[40px] font-semibold text-[var(--shell-title-ink)]">
      {label}
    </div>
  );
}

const editorRouteMeta = routeMetaMap.get("/display-pages/editor")!;

export function DisplayPagesEditor({
  initialEditorState,
  initialPublishingStateByPage,
  pageDefinitions = fallbackPageDefinitions,
  renderPreview = true
}: {
  initialEditorState?: {
    editMode?: boolean;
    lockedRegionIds?: string[];
    selectedRegionId?: string | null;
  };
  initialPublishingStateByPage?: DisplayPagePublishingStateMap;
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
    requestedPageId && pageIdSet.has(requestedPageId as DisplayPageKey)
      ? (requestedPageId as DisplayPageKey)
      : defaultPageId;
  const [editMode, setEditMode] = useState(initialEditorState?.editMode ?? false);
  const [canvasContainerScale, setCanvasContainerScale] = useState(1);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(initialEditorState?.selectedRegionId ?? null);
  const [geometryClipboard, setGeometryClipboard] = useState<DisplayEditorGeometryClipboard | null>(null);
  const [lockedRegionIdsByPage, setLockedRegionIdsByPage] = useState<Partial<Record<DisplayPageKey, string[]>>>(
    () =>
      initialEditorState?.lockedRegionIds?.length
        ? { [selectedPageId]: initialEditorState.lockedRegionIds }
        : {}
  );

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
  const editableRegions = useMemo(() => resolveDisplayEditorRegions(config, resolvePageRegionSchemas(selectedPage.id), seedConfig), [config, seedConfig, selectedPage.id]);
  const selectedRegion = useMemo(
    () => editableRegions.find((region) => region.id === selectedRegionId) ?? editableRegions[0] ?? null,
    [editableRegions, selectedRegionId]
  );
  const lockedRegionIds = lockedRegionIdsByPage[selectedPage.id] ?? [];
  const selectedRegionLocked = isRegionLocked(lockedRegionIds, selectedRegion?.id);
  const regionPresetOptions = useMemo(() => resolveRegionPresetOptions(selectedRegion, editableRegions), [editableRegions, selectedRegion]);
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
  const editorControlSummaryLines = useMemo(() => {
    if (!publishingState) {
      return [];
    }

    const lines = [
      blockingCount > 0 ? `draft 有 ${blockingCount} 項 blocking 問題` : "draft 已通過 blocking 檢查",
      publishingState.fallback.isFallbackActive ? "目前 live 正在 fallback" : "目前 live 未啟用 fallback"
    ];

    publishingState.validation.findings.forEach((finding) => {
      lines.push(finding.regionId ? `${finding.regionId}: ${finding.message}` : finding.message);
    });

    publishingState.fallback.items
      .filter((item) => item.active)
      .forEach((item) => {
        lines.push(`${formatFallbackKey(item.key)}: ${formatFallbackMode(item.mode)}`);
      });

    return lines;
  }, [blockingCount, publishingState]);
  const saveDisabled = isLoading || isSaving || !dirty;
  const publishDisabled = isLoading || isSaving || isPublishing || isPublishBlocked;
  const controlStatusToneClassName = errorMessage
    ? "border-[rgba(180,82,52,0.25)] bg-[rgba(180,82,52,0.08)] text-[#8f452d]"
    : dirty
      ? "border-[rgba(201,136,26,0.24)] bg-[rgba(201,136,26,0.08)] text-[#8e6410]"
      : "border-[var(--shell-divider)] bg-white/80 text-[var(--shell-copy-ink)]";

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

  const toggleEditMode = useCallback(() => {
    setEditMode((current) => !current);
  }, []);

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

  const handleSelectPage = (pageId: DisplayPageKey) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", pageId);
    setSearchParams(nextParams, { replace: true });
  };

  const geometryClipboardCompatibility = selectedRegion
    ? resolveGeometryClipboardCompatibility(selectedRegion, geometryClipboard)
    : { compatible: false, reason: "幾何剪貼簿只可貼到相容的 region。" };
  const { onStartInteraction, onZoomDelta, viewport, viewportControls } = useDisplayEditorCanvasWorkflow({
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

  const [rightTab, setRightTab] = useState<"inspector" | "health" | "publish">("inspector");

  const pageTabs = (
    <div className="flex self-end items-end gap-2">
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
            {page.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <PageContainer
      density="playback"
      shellPrimitive="management-scaffold"
      title={editorRouteMeta.title}
      subtitle={editorRouteMeta.subtitle}
      description="切換五個展示頁畫布，後續分 phase 接上 overlay、inspector 與 persisted page config。"
      aside={pageTabs}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <section className="shrink-0 rounded-[18px] border border-[var(--shell-divider)] bg-white/65 px-4 py-3 shadow-[0_12px_30px_rgba(80,94,54,0.06)] backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div
                className={[
                  "rounded-[16px] border px-3 py-2 text-[12px] leading-5",
                  controlStatusToneClassName
                ].join(" ")}
                role="status"
              >
                {errorMessage || message}
              </div>
              {editorControlSummaryLines.length > 0 ? (
                <div className="rounded-[16px] border border-[var(--shell-divider)] bg-white/85 px-3 py-2 text-[12px] leading-5 text-[var(--shell-copy-ink)]">
                  {editorControlSummaryLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-[var(--shell-divider)] px-4 py-2 text-[13px] font-semibold text-[var(--shell-copy-ink)] disabled:opacity-55"
                disabled={isLoading}
                onClick={() => void handleReload()}
              >
                重新同步
              </button>
              <button
                type="button"
                className="rounded-full px-4 py-2 text-[13px] font-semibold"
                disabled={saveDisabled}
                onClick={() => void handleSave()}
                style={saveDisabled
                  ? {
                      backgroundColor: "rgba(95, 140, 80, 0.14)",
                      border: "1px solid rgba(95, 140, 80, 0.22)",
                      color: "var(--shell-muted-ink)"
                    }
                  : {
                      backgroundColor: "#5f8c50",
                      color: "#ffffff"
                    }}
              >
                {isSaving ? "儲存中..." : "儲存設定"}
              </button>
              <button
                type="button"
                className="rounded-full px-4 py-2 text-[13px] font-semibold"
                disabled={publishDisabled}
                onClick={() => void publish()}
                style={publishDisabled
                  ? {
                      backgroundColor: "rgba(52, 56, 58, 0.14)",
                      border: "1px solid rgba(52, 56, 58, 0.18)",
                      color: "var(--shell-muted-ink)"
                    }
                  : {
                      backgroundColor: "#34383a",
                      color: "#ffffff"
                    }}
              >
                {isPublishing ? "發布中..." : "發布草稿"}
              </button>
            </div>
          </div>
        </section>

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
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-[var(--shell-copy-ink)]">
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
            }
            editMode={editMode}
            onScaleChange={setCanvasContainerScale}
            onToggleEditMode={toggleEditMode}
            onZoomDelta={onZoomDelta}
            pageLabel={selectedPage.label}
            preview={
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{
                  height: `${EDITOR_PREVIEW_SURFACE_HEIGHT}px`,
                  minHeight: `${EDITOR_PREVIEW_SURFACE_HEIGHT}px`,
                  minWidth: `${EDITOR_PREVIEW_SURFACE_WIDTH}px`,
                  transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${0.5 * viewport.zoom})`,
                  transformOrigin: "top left",
                  width: `${EDITOR_PREVIEW_SURFACE_WIDTH}px`
                }}
              >
                {previewContent}
                <DisplayEditorCanvasOverlay
                  isInteractive={editMode}
                  lockedRegionIds={lockedRegionIds}
                  regions={editableRegions}
                  selectedRegionId={selectedRegion?.id ?? null}
                  onSelect={setSelectedRegionId}
                  onStartInteraction={onStartInteraction}
                />
              </div>
            }
            viewportHeight={EDITOR_PREVIEW_VIEWPORT_HEIGHT}
            viewportWidth={EDITOR_PREVIEW_VIEWPORT_WIDTH}
          />
        </div>

        <div className="flex flex-col overflow-hidden border-l border-[var(--shell-divider)]">
          <div className="shrink-0 flex border-b border-[var(--shell-divider)]">
            {(["inspector", "health", "publish"] as const).map((tab) => {
              const labels = { inspector: "Inspector", health: "Asset Health", publish: "Publishing" };
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
                actions={
                  selectedRegion ? (
                    <DisplayEditorInspectorTools
                      geometryClipboard={geometryClipboard}
                      geometryClipboardCompatibility={geometryClipboardCompatibility}
                      presetOptions={regionPresetOptions}
                      selectedRegion={selectedRegion}
                      selectedRegionLocked={selectedRegionLocked}
                      onApplyPreset={(option) =>
                        applyConfigUpdate((current) =>
                          applyRegionPreset(current, selectedRegion, option.preset)
                        )
                      }
                      onCopyGeometry={() => setGeometryClipboard(createGeometryClipboard(selectedRegion))}
                      onPasteGeometry={() =>
                        applyConfigUpdate((current) =>
                          applyGeometryClipboard(current, selectedRegion, geometryClipboard)
                        )
                      }
                      onResetRegion={() => resetPaths(selectedRegion.fields.map((field) => field.path))}
                    />
                  ) : null
                }
                editMode={editMode}
                emptyMessage={
                  editableRegions.length > 0
                    ? "請先在畫布上選取一個 editable region。"
                    : "這個頁面的 page-specific editor 尚未在本 phase 展開，先保留 preview 與 route coverage。"
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
      </div>
    </PageContainer>
  );
}
