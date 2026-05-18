import type { DisplayPageKey } from "@solar-display/shared";
import React from "react";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DisplayPageEditorAssetHealthPanel } from "../../components/displayPageAssetHealthPanels";
import { useDisplayPageAssetHealth } from "../../hooks/useDisplayPageAssetHealth";
import { PageScaffold } from "../shared/PageScaffold";
import { setValueAtPath, useDisplayPageConfig } from "../../hooks/useDisplayPageConfig";
import { useDisplayEditorKeybinding } from "../../hooks/useDisplayEditor";
import { type DisplayPagePublishingStateMap, useDisplayPagePublishingState } from "./publishing";
import { DisplayPagePublishingPanels } from "./publishingStatus";
import { DisplayEditorCanvasCard, DisplayEditorInspectorCard } from "./cards";
import { applyGeometryClipboard, createGeometryClipboard, resolveGeometryClipboardCompatibility, type DisplayEditorGeometryClipboard } from "./displayEditorGeometry";
import { applyRegionPreset } from "./displayEditorPresets";
import { isRegionLocked, resolveRegionPresetOptions, toggleRegionLock } from "./displayEditorRegionState";
import { fallbackPageDefinitions } from "./fallbackPageDefinitions";
import { resolveDisplayEditorRegions } from "./inspectorFields";
import { DisplayEditorInspectorTools } from "./inspectorTools";
import { resolvePageRegionSchemas } from "./pageRegionSchemas";
import { DisplayEditorSidebar } from "./regionTree";
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
  const pageIdSet = useMemo(() => new Set(pageDefinitions.map((page) => page.id)), [pageDefinitions]);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPageId = searchParams.get("page");
  const selectedPageId =
    requestedPageId && pageIdSet.has(requestedPageId as DisplayPageKey)
      ? (requestedPageId as DisplayPageKey)
      : "overview";
  const [editMode, setEditMode] = useState(initialEditorState?.editMode ?? false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(initialEditorState?.selectedRegionId ?? null);
  const [geometryClipboard, setGeometryClipboard] = useState<DisplayEditorGeometryClipboard | null>(null);
  const [lockedRegionIdsByPage, setLockedRegionIdsByPage] = useState<Partial<Record<DisplayPageKey, string[]>>>(
    () =>
      initialEditorState?.lockedRegionIds?.length
        ? { [selectedPageId]: initialEditorState.lockedRegionIds }
        : {}
  );

  const selectedPage = useMemo(() => pageDefinitions.find((page) => page.id === selectedPageId) ?? pageDefinitions[0]!, [selectedPageId]);
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
  const selectedRegion = editableRegions.find((region) => region.id === selectedRegionId) ?? editableRegions[0] ?? null;
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

  useDisplayEditorKeybinding(() => {
    setEditMode((current) => !current);
  });

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
  const geometryClipboardCompatibility = selectedRegion
    ? resolveGeometryClipboardCompatibility(selectedRegion, geometryClipboard)
    : { compatible: false, reason: "幾何剪貼簿只可貼到相容的 region。" };
  const { onStartInteraction, viewport, viewportControls } = useDisplayEditorCanvasWorkflow({
    applyConfigUpdate,
    canRedo,
    canUndo,
    config,
    editMode,
    lockedRegionIds,
    redo,
    regions: editableRegions,
    selectedRegion,
    undo
  });

  return (
    <PageScaffold
      path="/display-pages/editor"
      description="切換五個展示頁畫布，後續分 phase 接上 overlay、inspector 與 persisted page config。"
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <DisplayEditorSidebar
          assetHealthPanel={
            <DisplayPageEditorAssetHealthPanel
              errorMessage={assetHealthErrorMessage}
              isLoading={isAssetHealthLoading}
              pageId={selectedPage.id}
              report={assetHealthReport}
            />
          }
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
          onSelectPage={(pageId) => {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set("page", pageId);
            setSearchParams(nextParams, { replace: true });
          }}
          onToggleRegionLock={(regionId) => {
            setLockedRegionIdsByPage((current) => ({
              ...current,
              [selectedPage.id]: toggleRegionLock(current[selectedPage.id] ?? [], regionId)
            }));
          }}
          pageDefinitions={pageDefinitions}
          publishingPanels={
            <DisplayPagePublishingPanels
              blockingCount={blockingCount}
              fallbackPolicy={fallbackPolicy}
              publishingError={publishingError}
              publishingState={publishingState}
            />
          }
          regions={editableRegions}
          lockedRegionIds={lockedRegionIds}
          selectedRegionId={selectedRegion?.id ?? null}
          selectedPageId={selectedPage.id}
        />

        <section className="grid gap-6">
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
            lockedRegionIds={lockedRegionIds}
            onSelectRegion={setSelectedRegionId}
            onStartInteraction={onStartInteraction}
            pageLabel={selectedPage.label}
            preview={
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{
                  height: `${EDITOR_PREVIEW_SURFACE_HEIGHT}px`,
                  transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${0.5 * viewport.zoom})`,
                  transformOrigin: "top left",
                  width: `${EDITOR_PREVIEW_SURFACE_WIDTH}px`
                }}
              >
                {renderPreview ? (
                  selectedPage.renderPreview ? (
                    selectedPage.renderPreview(config)
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[#e8eddf] text-[40px] font-semibold text-[var(--shell-title-ink)]">
                      {selectedPage.label}
                    </div>
                  )
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#e8eddf] text-[40px] font-semibold text-[var(--shell-title-ink)]">
                    {selectedPage.label}
                  </div>
                )}
              </div>
            }
            regions={editableRegions}
            selectedRegionId={selectedRegion?.id ?? null}
            viewportHeight={EDITOR_PREVIEW_VIEWPORT_HEIGHT}
            viewportWidth={EDITOR_PREVIEW_VIEWPORT_WIDTH}
          />
          <DisplayEditorInspectorCard
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
        </section>
      </div>
    </PageScaffold>
  );
}
