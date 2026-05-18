import type { DisplayPageKey } from "@solar-display/shared";
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
import { fallbackPageDefinitions } from "./fallbackPageDefinitions";

type DisplayEditorField = {
  id: string;
  label: string;
  onChange: (value: string) => void;
  step?: number;
  type: "number" | "text";
  value: number | string;
};

type DisplayEditorRect = {
  height?: number;
  left: number;
  top: number;
  width: number;
};

export type DisplayEditorRegion = {
  description?: string;
  fields: DisplayEditorField[];
  id: string;
  label: string;
  rect?: DisplayEditorRect;
};

export type DisplayEditorPageDefinition = {
  buildEditableRegions?: (
    config: Record<string, unknown>,
    helpers: {
      updatePath: (path: Array<number | string>, value: unknown) => void;
    }
  ) => DisplayEditorRegion[];
  createSeedConfig: () => Record<string, unknown>;
  id: DisplayPageKey;
  label: string;
  renderPreview?: (config: Record<string, unknown>) => ReactElement;
};

const EDITOR_PREVIEW_SCALE = 0.5;
const EDITOR_PREVIEW_SURFACE_HEIGHT = 934;
const EDITOR_PREVIEW_SURFACE_WIDTH = 1920;
const EDITOR_PREVIEW_VIEWPORT_HEIGHT = Math.round(
  EDITOR_PREVIEW_SURFACE_HEIGHT * EDITOR_PREVIEW_SCALE
);

export function DisplayPagesEditor({
  initialPublishingStateByPage,
  pageDefinitions = fallbackPageDefinitions,
  renderPreview = true
}: {
  initialPublishingStateByPage?: DisplayPagePublishingStateMap;
  pageDefinitions?: DisplayEditorPageDefinition[];
  renderPreview?: boolean;
}) {
  const pageIdSet = useMemo(() => new Set(pageDefinitions.map((page) => page.id)), [pageDefinitions]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [editMode, setEditMode] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const requestedPageId = searchParams.get("page");
  const selectedPageId =
    requestedPageId && pageIdSet.has(requestedPageId as DisplayPageKey)
      ? (requestedPageId as DisplayPageKey)
      : "overview";

  const selectedPage = useMemo(
    () => pageDefinitions.find((page) => page.id === selectedPageId) ?? pageDefinitions[0]!,
    [selectedPageId]
  );
  const seedConfig = useMemo(() => selectedPage.createSeedConfig(), [selectedPage]);
  const {
    config,
    dirty,
    errorMessage,
    fallbackPolicy,
    isLoading,
    isSaving,
    lastLoadedEnvelope,
    message,
    reload,
    save,
    setConfig
  } = useDisplayPageConfig(selectedPage.id, seedConfig, { stage: "draft" });

  const updatePath = (path: Array<number | string>, value: unknown) => {
    setConfig((current) => setValueAtPath(current, path, value));
  };
  const editableRegions = useMemo(
    () => selectedPage.buildEditableRegions?.(config, { updatePath }) ?? [],
    [config, selectedPage]
  );
  const selectedRegion =
    editableRegions.find((region) => region.id === selectedRegionId) ?? editableRegions[0] ?? null;
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

  useEffect(() => {
    setSelectedRegionId(null);
  }, [selectedPage.id]);

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

  return (
    <PageScaffold
      path="/display-pages/editor"
      description="切換五個展示頁畫布，後續分 phase 接上 overlay、inspector 與 persisted page config。"
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-[var(--shell-divider)] bg-white/70 p-5 shadow-[0_20px_45px_rgba(80,94,54,0.08)] backdrop-blur-sm">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-subtitle-ink)]">
            Rollout Pages
          </p>
          <div className="mt-4 flex gap-3">
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
              className="rounded-full bg-[var(--shell-accent)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-55"
              disabled={isLoading || isSaving || !dirty}
              onClick={() => void handleSave()}
            >
              {isSaving ? "儲存中..." : "儲存設定"}
            </button>
            <button
              type="button"
              className="rounded-full bg-[var(--shell-title-ink)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-55"
              disabled={isLoading || isSaving || isPublishing || isPublishBlocked}
              onClick={() => void publish()}
            >
              {isPublishing ? "發布中..." : "發布草稿"}
            </button>
          </div>
          <div
            className={[
              "mt-4 rounded-[18px] border px-4 py-3 text-[13px] leading-6",
              errorMessage
                ? "border-[rgba(180,82,52,0.25)] bg-[rgba(180,82,52,0.08)] text-[#8f452d]"
                : dirty
                  ? "border-[rgba(201,136,26,0.24)] bg-[rgba(201,136,26,0.08)] text-[#8e6410]"
                  : "border-[var(--shell-divider)] bg-[rgba(82,91,66,0.05)] text-[var(--shell-copy-ink)]"
            ].join(" ")}
            role="status"
          >
            {errorMessage || message}
          </div>
          <DisplayPagePublishingPanels
            blockingCount={blockingCount}
            fallbackPolicy={fallbackPolicy}
            publishingError={publishingError}
            publishingState={publishingState}
          />
          <DisplayPageEditorAssetHealthPanel
            errorMessage={assetHealthErrorMessage}
            isLoading={isAssetHealthLoading}
            pageId={selectedPage.id}
            report={assetHealthReport}
          />
          <div className="mt-4 grid gap-3">
            {pageDefinitions.map((page) => {
              const active = page.id === selectedPage.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  className={[
                    "rounded-[18px] border px-4 py-3 text-left transition-colors",
                    active
                      ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                      : "border-[var(--shell-divider)] bg-white/70 text-[var(--shell-muted-ink)] hover:border-[var(--shell-divider-strong)] hover:text-[var(--shell-title-ink)]"
                  ].join(" ")}
                  onClick={() => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.set("page", page.id);
                    setSearchParams(nextParams, { replace: true });
                  }}
                >
                  <div className="text-[15px] font-semibold">{page.label}</div>
                  <div className="mt-1 text-[12px] text-[var(--shell-subtitle-ink)]">
                    {page.id}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6">
          <article className="rounded-[28px] border border-[var(--shell-divider)] bg-[rgba(252,251,246,0.96)] p-5 shadow-[0_20px_45px_rgba(80,94,54,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-subtitle-ink)]">
                  Canvas Preview
                </p>
                <h3 className="mt-2 text-[24px] font-semibold text-[var(--shell-title-ink)]">
                  {selectedPage.label}
                </h3>
              </div>
              <div
                className={[
                  "rounded-full px-4 py-2 text-[13px] font-semibold",
                  editMode
                    ? "bg-[rgba(95,140,80,0.16)] text-[var(--shell-title-ink)]"
                    : "bg-[rgba(82,91,66,0.08)] text-[var(--shell-muted-ink)]"
                ].join(" ")}
              >
                {editMode ? "Edit Mode ON" : "Edit Mode OFF"}
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-[var(--shell-divider)] bg-[#eef1e7]">
              <div
                className="relative overflow-hidden"
                style={{
                  height: `${EDITOR_PREVIEW_VIEWPORT_HEIGHT}px`,
                  width: `${Math.round(EDITOR_PREVIEW_SURFACE_WIDTH * EDITOR_PREVIEW_SCALE)}px`
                }}
              >
                <div
                  className="absolute left-0 top-0 origin-top-left"
                  style={{
                    height: `${EDITOR_PREVIEW_SURFACE_HEIGHT}px`,
                    transform: `scale(${EDITOR_PREVIEW_SCALE})`,
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
                  {editMode
                    ? editableRegions.map((region) => {
                        if (!region.rect) {
                          return null;
                        }

                        const isSelected = selectedRegion?.id === region.id;
                        return (
                          <button
                            key={region.id}
                            type="button"
                            aria-pressed={isSelected}
                            className="absolute rounded-[22px] border-2 transition-colors"
                            style={{
                              background: isSelected ? "rgba(95, 140, 80, 0.18)" : "rgba(95, 140, 80, 0.08)",
                              borderColor: isSelected ? "rgba(63, 122, 52, 0.9)" : "rgba(95, 140, 80, 0.42)",
                              height: `${region.rect.height ?? 68}px`,
                              left: `${region.rect.left}px`,
                              top: `${region.rect.top}px`,
                              width: `${region.rect.width}px`
                            }}
                            onClick={() => setSelectedRegionId(region.id)}
                          >
                            <span className="sr-only">{region.label}</span>
                          </button>
                        );
                      })
                    : null}
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--shell-divider)] bg-white/78 p-5 shadow-[0_20px_45px_rgba(80,94,54,0.08)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-subtitle-ink)]">
              Inspector
            </p>
            {!editMode ? (
              <p className="mt-3 text-[15px] leading-7 text-[var(--shell-copy-ink)]">
                按 E 啟用編輯模式，然後選取畫布區塊進入後續 phase 的 inspector。
              </p>
            ) : selectedRegion ? (
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-[18px] font-semibold text-[var(--shell-title-ink)]">
                    {selectedRegion.label}
                  </h4>
                  {selectedRegion.description ? (
                    <p className="mt-1 text-[13px] leading-6 text-[var(--shell-copy-ink)]">
                      {selectedRegion.description}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedRegion.fields.map((field) => (
                    <label key={field.id} className="grid gap-2 text-[13px] text-[var(--shell-copy-ink)]">
                      <span className="font-semibold text-[var(--shell-title-ink)]">{field.label}</span>
                      <input
                        className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2 text-[14px] text-[var(--shell-title-ink)] outline-none focus:border-[var(--shell-divider-strong)]"
                        type={field.type}
                        step={field.step}
                        value={String(field.value)}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[15px] leading-7 text-[var(--shell-copy-ink)]">
                {editableRegions.length > 0
                  ? "請先在畫布上選取一個 editable region。"
                  : "這個頁面的 page-specific editor 尚未在本 phase 展開，先保留 preview 與 route coverage。"}
              </p>
            )}
          </article>
        </section>
      </div>
    </PageScaffold>
  );
}
