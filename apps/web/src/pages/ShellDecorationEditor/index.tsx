import type {
  ImageAsset,
  ShellDecorationChannel,
  ShellDecorationEnvelope,
  ShellDecorationMount,
  ShellDecorationObject,
  ValidationResult
} from "@solar-display/shared";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ApiRequestError, buildApiUrl, getImages } from "../../services/api";
import {
  getShellDecorationDraft,
  publishShellDecorations,
  saveShellDecorationDraft
} from "../../services/shellDecorations";
import { PageContainer } from "../../components/PageContainer";
import { WorkspaceActionBar, WorkspaceBoard, WorkspacePanel } from "../../components/workspaceSurface";
import {
  buildShellDecorationAssetLabel,
  ShellDecorationAssetPicker,
  type ShellDecorationAssetOption
} from "./assetPicker";
import {
  addShellDecorationObject,
  deleteShellDecorationObject,
  duplicateShellDecorationObject,
  moveShellDecorationObject,
  moveShellDecorationObjectToBoundary,
  resolveShellObjectSections,
  ShellDecorationObjectList,
  toggleShellDecorationObjectLocked,
  toggleShellDecorationObjectVisible,
  updateShellDecorationObject
} from "./objectList";
import { ShellDecorationPreviewCanvas } from "./previewCanvas";

function createEmptyDraftEnvelope(): ShellDecorationEnvelope {
  return {
    footerObjects: [],
    headerObjects: [],
    publishedAt: null,
    publishedBy: null,
    stage: "draft",
    updatedAt: null,
    version: 1
  };
}

export function toShellDecorationChannel(envelope: ShellDecorationEnvelope): ShellDecorationChannel {
  return {
    footerObjects: envelope.footerObjects,
    headerObjects: envelope.headerObjects
  };
}

function findSelectedObject(channel: ShellDecorationChannel, selectedObjectId: string | null) {
  if (!selectedObjectId) {
    return null;
  }

  return [...channel.headerObjects, ...channel.footerObjects].find((object) => object.id === selectedObjectId) ?? null;
}

function formatShellMountLabel(mount: ShellDecorationMount) {
  return mount === "header" ? "頁首" : "頁尾";
}

function formatShellObjectTypeLabel(type: ShellDecorationObject["type"]) {
  if (type === "asset-image") return "圖片素材";
  if (type === "ornament-image") return "裝飾圖片";
  return "線條";
}

function isChannelDirty(draft: ShellDecorationChannel, baseline: ShellDecorationChannel) {
  return JSON.stringify(resolveShellObjectSections(draft)) !== JSON.stringify(resolveShellObjectSections(baseline));
}

function resolveAssetFallbackSrc(asset: ImageAsset) {
  return asset.filename ? buildApiUrl(`/uploads/images/${asset.filename}`) : null;
}

export function resolveShellDecorationAssetOptions(assets: ImageAsset[]): ShellDecorationAssetOption[] {
  return assets.flatMap((asset) => {
    const fallbackSrc = resolveAssetFallbackSrc(asset);
    if (!fallbackSrc || asset.usageScope === "page-only") {
      return [];
    }

    return [{
      assetId: asset.id,
      category: asset.category,
      fallbackSrc,
      label: buildShellDecorationAssetLabel(asset),
      usageScope: asset.usageScope
    }];
  });
}

function resolveValidationFromError(error: unknown): ValidationResult | null {
  if (!(error instanceof ApiRequestError)) {
    return null;
  }

  const body = error.body as (typeof error.body & { validation?: ValidationResult }) | null;
  return body?.validation ?? null;
}

export async function loadShellDecorationEditorData(
  loadDraft: () => Promise<ShellDecorationEnvelope> = getShellDecorationDraft,
  loadImages: () => Promise<ImageAsset[]> = getImages
) {
  const [draft, images] = await Promise.all([loadDraft(), loadImages()]);
  return { draft, images };
}

export async function saveShellDecorationEditorDraft(
  draft: ShellDecorationEnvelope,
  persistDraft: (channel: ShellDecorationChannel, baseVersion: number) => Promise<ShellDecorationEnvelope> = saveShellDecorationDraft
) {
  return persistDraft(toShellDecorationChannel(draft), draft.version);
}

export async function publishShellDecorationEditorDraft(
  publishDraft: (publishedBy?: string) => Promise<{ config: ShellDecorationEnvelope; validation: ValidationResult }> = publishShellDecorations,
  reloadDraft: () => Promise<ShellDecorationEnvelope> = getShellDecorationDraft
) {
  const response = await publishDraft();
  const draft = await reloadDraft();
  return {
    draft,
    validation: response.validation
  };
}

export function ShellDecorationEditor({
  embedded = false,
  initialDraft,
  initialImages,
  initialSelectedObjectId,
  onDraftChange,
  onImagesChange,
  onOpenAssetWorkspace,
  onSelectedObjectIdChange,
  renderPreview = true
}: {
  embedded?: boolean;
  initialDraft?: ShellDecorationEnvelope;
  initialImages?: ImageAsset[];
  initialSelectedObjectId?: string | null;
  onDraftChange?: (draft: ShellDecorationEnvelope) => void;
  onImagesChange?: (images: ImageAsset[]) => void;
  onOpenAssetWorkspace?: (context: string | null) => void;
  onSelectedObjectIdChange?: (selectedObjectId: string | null) => void;
  renderPreview?: boolean;
}) {
  const [draft, setDraft] = useState<ShellDecorationEnvelope>(initialDraft ?? createEmptyDraftEnvelope());
  const [lastSavedDraft, setLastSavedDraft] = useState<ShellDecorationEnvelope>(initialDraft ?? createEmptyDraftEnvelope());
  const [images, setImages] = useState<ImageAsset[]>(initialImages ?? []);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(
    initialSelectedObjectId ?? initialDraft?.headerObjects[0]?.id ?? initialDraft?.footerObjects[0]?.id ?? null
  );
  const [hasHydratedInitialData, setHasHydratedInitialData] = useState(
    initialDraft !== undefined && initialImages !== undefined
  );
  const [isLoading, setIsLoading] = useState(initialDraft === undefined || initialImages === undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState(
    initialDraft !== undefined && initialImages !== undefined
      ? "共用殼層草稿已同步。"
      : "正在同步共用殼層草稿..."
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [publishValidation, setPublishValidation] = useState<ValidationResult | null>(null);
  const [addMount, setAddMount] = useState<ShellDecorationMount>("header");
  const [addType, setAddType] = useState<ShellDecorationObject["type"]>("line");

  useEffect(() => {
    if (initialDraft && initialImages) {
      return;
    }

    let active = true;

    void loadShellDecorationEditorData()
      .then(({ draft: nextDraft, images: nextImages }) => {
        if (!active) {
          return;
        }

        setDraft(nextDraft);
        setLastSavedDraft(nextDraft);
        setImages(nextImages);
        setSelectedObjectId(nextDraft.headerObjects[0]?.id ?? nextDraft.footerObjects[0]?.id ?? null);
        setHasHydratedInitialData(true);
        setMessage("共用殼層草稿已同步。");
        setErrorMessage("");
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "讀取共用殼層草稿失敗。");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialDraft, initialImages]);

  useEffect(() => {
    if (!hasHydratedInitialData) {
      return;
    }

    onDraftChange?.(draft);
  }, [draft, hasHydratedInitialData, onDraftChange]);

  useEffect(() => {
    if (!hasHydratedInitialData) {
      return;
    }

    onImagesChange?.(images);
  }, [hasHydratedInitialData, images, onImagesChange]);

  useEffect(() => {
    if (!hasHydratedInitialData) {
      return;
    }

    onSelectedObjectIdChange?.(selectedObjectId);
  }, [hasHydratedInitialData, onSelectedObjectIdChange, selectedObjectId]);

  const channel = useMemo(() => toShellDecorationChannel(draft), [draft]);
  const baselineChannel = useMemo(() => toShellDecorationChannel(lastSavedDraft), [lastSavedDraft]);
  const dirty = useMemo(() => isChannelDirty(channel, baselineChannel), [baselineChannel, channel]);
  const selectedObject = useMemo(() => findSelectedObject(channel, selectedObjectId), [channel, selectedObjectId]);
  const assetOptions = useMemo(() => resolveShellDecorationAssetOptions(images), [images]);

  const applyChannel = useCallback(
    (nextChannel: ShellDecorationChannel, nextSelectedObjectId = selectedObjectId) => {
      setDraft((current) => ({
        ...current,
        footerObjects: nextChannel.footerObjects,
        headerObjects: nextChannel.headerObjects
      }));
      setSelectedObjectId(nextSelectedObjectId);
      setMessage("共用殼層草稿尚未儲存。");
      setErrorMessage("");
    },
    [selectedObjectId]
  );

  const handleAddObject = () => {
    const next = addShellDecorationObject(channel, { mount: addMount, type: addType });
    applyChannel(next.channel, next.selectedObjectId);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage("");
    try {
      const saved = await saveShellDecorationEditorDraft(draft);
      setDraft(saved);
      setLastSavedDraft(saved);
      setMessage("共用殼層草稿已儲存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存共用殼層草稿失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setErrorMessage("");
    try {
      const response = await publishShellDecorationEditorDraft();
      const refreshedDraft = response.draft;
      setDraft(refreshedDraft);
      setLastSavedDraft(refreshedDraft);
      setPublishValidation(response.validation);
      setMessage("共用殼層正式版已發布。");
    } catch (error) {
      setPublishValidation(resolveValidationFromError(error));
      setErrorMessage(error instanceof Error ? error.message : "發布共用殼層草稿失敗。");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = useCallback(
    (objectId: string) => {
      const next = deleteShellDecorationObject(channel, objectId, selectedObjectId);
      applyChannel(next.channel, next.selectedObjectId);
    },
    [applyChannel, channel, selectedObjectId]
  );

  const handleDuplicate = useCallback(
    (objectId: string) => {
      const next = duplicateShellDecorationObject(channel, objectId);
      applyChannel(next.channel, next.selectedObjectId);
    },
    [applyChannel, channel]
  );

  const handleMoveBackward = useCallback(
    (objectId: string) => applyChannel(moveShellDecorationObject(channel, objectId, "backward")),
    [applyChannel, channel]
  );

  const handleMoveForward = useCallback(
    (objectId: string) => applyChannel(moveShellDecorationObject(channel, objectId, "forward")),
    [applyChannel, channel]
  );

  const handleToggleLocked = useCallback(
    (objectId: string) => applyChannel(toggleShellDecorationObjectLocked(channel, objectId)),
    [applyChannel, channel]
  );

  const handleToggleVisible = useCallback(
    (objectId: string) => applyChannel(toggleShellDecorationObjectVisible(channel, objectId)),
    [applyChannel, channel]
  );

  const handleUpdateObjectFrame = useCallback(
    (objectId: string, frame: ShellDecorationObject["frame"]) => {
      applyChannel(updateShellDecorationObject(channel, objectId, (object) => ({
        ...object,
        frame
      })));
    },
    [applyChannel, channel]
  );

  const updateSelectedObject = (updater: (object: ShellDecorationObject) => ShellDecorationObject) => {
    if (!selectedObjectId) {
      return;
    }

    applyChannel(updateShellDecorationObject(channel, selectedObjectId, updater));
  };

  const content = (
    <div className="grid h-full min-h-0 grid-cols-[320px_minmax(0,1fr)_320px] gap-4">
      <WorkspacePanel className="flex min-h-0 flex-col p-4" surface="shell-object-list">
        <div className="grid gap-2">
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted-ink)]">
            新增物件
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2" value={addMount} onChange={(event) => setAddMount(event.target.value as ShellDecorationMount)}>
              <option value="header">頁首</option>
              <option value="footer">頁尾</option>
            </select>
            <select className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2" value={addType} onChange={(event) => setAddType(event.target.value as ShellDecorationObject["type"])}>
              <option value="line">線條</option>
              <option value="asset-image">圖片素材</option>
              <option value="ornament-image">裝飾圖片</option>
            </select>
          </div>
          <button type="button" className="rounded-full bg-[#5f8c50] px-3 py-2 text-[13px] font-semibold text-white" onClick={handleAddObject}>
            新增物件
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <ShellDecorationObjectList
            channel={channel}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onMoveBackward={handleMoveBackward}
            onMoveForward={handleMoveForward}
            onSelect={setSelectedObjectId}
            onToggleLocked={handleToggleLocked}
            onToggleVisible={handleToggleVisible}
            selectedObjectId={selectedObjectId}
          />
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="flex min-h-0 flex-col p-4" surface="shell-preview">
        <WorkspaceActionBar className="static mb-3 rounded-[18px] border-none bg-transparent px-0 py-0 shadow-none backdrop-blur-0" surface="shell-preview-context">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted-ink)]">
              預覽
            </div>
            <div className="text-[13px] text-[var(--shell-copy-ink)]">共用殼層草稿會直接套用到 header / footer。</div>
          </div>
          <div className="text-right text-[12px] text-[var(--shell-copy-ink)]">
            <div>{dirty ? "殼層尚未儲存" : "殼層已同步"}</div>
            <div>version {draft.version}</div>
          </div>
        </WorkspaceActionBar>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {renderPreview ? (
            <ShellDecorationPreviewCanvas
              channel={channel}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
              onUpdateObjectFrame={handleUpdateObjectFrame}
            />
          ) : null}
        </div>
        <div className="mt-3 grid gap-2 text-[12px]">
          <WorkspaceBoard
            className="px-3 py-2"
            surface="status-board"
            tone={errorMessage ? "danger" : dirty ? "warning" : "base"}
          >
            {errorMessage || message}
          </WorkspaceBoard>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-full border border-[var(--shell-divider)] px-3 py-2 text-[13px] font-semibold text-[var(--shell-copy-ink)] disabled:opacity-55"
              disabled={isLoading || isSaving || !dirty}
              onClick={() => void handleSave()}
            >
              {isSaving ? "儲存中..." : "儲存殼層草稿"}
            </button>
            <button
              type="button"
              className="rounded-full bg-[#34383a] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-55"
              disabled={isLoading || isPublishing}
              onClick={() => void handlePublish()}
            >
              {isPublishing ? "發布中..." : "發布殼層正式版"}
            </button>
          </div>
          {publishValidation?.findings.length ? (
            <WorkspaceBoard className="px-3 py-2 text-[#8e6410]" surface="blocked-state" tone="warning">
              <div className="font-semibold">驗證結果</div>
              <ul className="mt-1 list-disc pl-5">
                {publishValidation.findings.map((finding) => (
                  <li key={`${finding.code}-${finding.regionId ?? "global"}`}>{finding.message}</li>
                ))}
              </ul>
            </WorkspaceBoard>
          ) : null}
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="flex min-h-0 flex-col p-4" surface="shell-selection">
        <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted-ink)]">
          幾何
        </div>
        {selectedObject ? (
          <div className="mt-3 grid gap-3 overflow-y-auto text-[13px] text-[var(--shell-copy-ink)]">
            <WorkspaceBoard className="px-3 py-2" surface="selection-board" tone="subtle">
              <div className="font-semibold text-[var(--shell-title-ink)]">{selectedObject.id}</div>
              <div className="mt-1 text-[12px]">{formatShellMountLabel(selectedObject.mount)} / {formatShellObjectTypeLabel(selectedObject.type)}</div>
            </WorkspaceBoard>
            <WorkspaceBoard className="space-y-3" surface="layer-controls" tone="subtle">
              <div className="space-y-1 text-[12px]">
                <div className="font-semibold text-[var(--shell-title-ink)]">圖層順序</div>
                <div>這組控制會直接同步 Header / Footer 物件列表的排序。</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
                  disabled={selectedObject.locked}
                  onClick={() => applyChannel(moveShellDecorationObjectToBoundary(channel, selectedObject.id, "backward"))}
                >
                  移到最下層
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
                  disabled={selectedObject.locked}
                  onClick={() => applyChannel(moveShellDecorationObject(channel, selectedObject.id, "backward"))}
                >
                  前移一層
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
                  disabled={selectedObject.locked}
                  onClick={() => applyChannel(moveShellDecorationObject(channel, selectedObject.id, "forward"))}
                >
                  後移一層
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
                  disabled={selectedObject.locked}
                  onClick={() => applyChannel(moveShellDecorationObjectToBoundary(channel, selectedObject.id, "forward"))}
                >
                  移到最上層
                </button>
              </div>
            </WorkspaceBoard>

            {([
              ["left", "左側"],
              ["top", "上方"],
              ["width", "寬度"],
              ["height", "高度"],
              ["zIndex", "層級"]
            ] as const).map(([field, label]) => (
              <label key={field} className="grid gap-2">
                <span className="text-[12px] font-semibold text-[var(--shell-title-ink)]">{label}</span>
                <input
                  type="number"
                  className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
                  value={field === "zIndex" ? selectedObject.zIndex : selectedObject.frame[field]}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    updateSelectedObject((object) =>
                      field === "zIndex"
                        ? { ...object, zIndex: nextValue }
                        : {
                            ...object,
                            frame: {
                              ...object.frame,
                              [field]: nextValue
                            }
                          }
                    );
                  }}
                />
              </label>
            ))}

            <label className="grid gap-2">
              <span className="text-[12px] font-semibold text-[var(--shell-title-ink)]">透明度</span>
              <input
                type="number"
                step="0.1"
                className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
                value={selectedObject.style.opacity ?? 1}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  updateSelectedObject((object) => ({
                    ...object,
                    style: {
                      ...object.style,
                      opacity: nextValue
                    }
                  }));
                }}
              />
            </label>

            {selectedObject.type === "line" ? (
              <>
                <label className="grid gap-2">
                  <span className="text-[12px] font-semibold text-[var(--shell-title-ink)]">厚度</span>
                  <input
                    type="number"
                    className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
                    value={selectedObject.style.thickness ?? selectedObject.frame.height}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      updateSelectedObject((object) => ({
                        ...object,
                        style: {
                          ...object.style,
                          thickness: nextValue
                        }
                      }));
                    }}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-[12px] font-semibold text-[var(--shell-title-ink)]">顏色</span>
                  <input
                    type="text"
                    className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
                    value={selectedObject.style.color ?? ""}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      updateSelectedObject((object) => ({
                        ...object,
                        style: {
                          ...object.style,
                          color: nextValue
                        }
                      }));
                    }}
                  />
                </label>
              </>
            ) : null}

            {selectedObject.type === "asset-image" ? (
              <ShellDecorationAssetPicker
                onOpenAssetWorkspace={() => onOpenAssetWorkspace?.(selectedObject.id)}
                options={assetOptions}
                value={typeof selectedObject.source.assetId === "number" ? selectedObject.source.assetId : null}
                onChange={(assetId) => {
                  const selectedAsset = assetOptions.find((option) => option.assetId === assetId);
                  if (!selectedAsset) {
                    return;
                  }

                  updateSelectedObject((object) => {
                    if (object.type !== "asset-image") {
                      return object;
                    }

                    return {
                      ...object,
                      source: {
                        assetId,
                        fallbackSrc: selectedAsset.fallbackSrc,
                        kind: "asset-image"
                      }
                    };
                  });
                }}
              />
            ) : null}

            {selectedObject.type === "ornament-image" ? (
              <>
                <label className="grid gap-2">
                  <span className="text-[12px] font-semibold text-[var(--shell-title-ink)]">裝飾</span>
                  <select
                    className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
                    value={selectedObject.source.ornamentKey}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      updateSelectedObject((object) => {
                        if (object.type !== "ornament-image") {
                          return object;
                        }

                        return {
                          ...object,
                          source: {
                            ...object.source,
                            kind: "ornament-image",
                            ornamentKey: nextValue
                          }
                        };
                      });
                    }}
                  >
                    <option value="leaf">葉片</option>
                  </select>
                </label>
                <ShellDecorationAssetPicker
                  onOpenAssetWorkspace={() => onOpenAssetWorkspace?.(selectedObject.id)}
                  options={assetOptions}
                  value={typeof selectedObject.source.assetId === "number" ? selectedObject.source.assetId : null}
                  onChange={(assetId) => {
                    const selectedAsset = assetOptions.find((option) => option.assetId === assetId);
                    if (!selectedAsset) {
                      return;
                    }

                    updateSelectedObject((object) => {
                      if (object.type !== "ornament-image") {
                        return object;
                      }

                      return {
                        ...object,
                        source: {
                          assetId,
                          fallbackSrc: selectedAsset.fallbackSrc,
                          kind: "ornament-image",
                          ornamentKey: object.source.ornamentKey
                        }
                      };
                    });
                  }}
                />
              </>
            ) : null}
          </div>
        ) : (
          <WorkspaceBoard className="mt-3 px-3 py-2 text-[13px] text-[var(--shell-copy-ink)]" surface="empty-state" tone="empty">
            從 Header / Footer 物件列表選取要編輯的裝飾。
          </WorkspaceBoard>
        )}
      </WorkspacePanel>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <PageContainer
      title="共用殼層裝飾"
      subtitle="Shared Shell Decorations"
      description="在同一個 FHD shell 預覽中管理 header 與 footer 的共用裝飾草稿。"
      shellPrimitive="shell-decoration-editor"
      spacing="compact"
    >
      {content}
    </PageContainer>
  );
}
