import {
  normalizeDisplayPageFreeformObjects,
  type DisplayPageFreeformObject,
  type DisplayPageCardRailTemplateKey,
  type DisplayPageAssetHealthReport,
  type ImageAsset,
  type DisplayPageTemplateKey,
  type ShellDecorationEnvelope
} from "@solar-display/shared";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DisplayPageEditorAssetHealthPanel } from "../../components/displayPageAssetHealthPanels";
import { PageContainer } from "../../components/PageContainer";
import { WorkspaceActionBar, WorkspaceBoard } from "../../components/workspaceSurface";
import { routeMetaMap } from "../../app/routeMeta";
import { useDisplayPageAssetHealth } from "../../hooks/useDisplayPageAssetHealth";
import { setValueAtPath, useDisplayPageConfig } from "../../hooks/useDisplayPageConfig";
import { useDisplayEditorKeybinding } from "../../hooks/useDisplayEditor";
import { buildApiUrl, getImages } from "../../services/api";
import { type DisplayPagePublishingStateMap, useDisplayPagePublishingState } from "./publishing";
import { PublishReviewDrawer } from "./PublishReviewDrawer";
import { AssetLibrary } from "../AssetLibrary";
import { ShellDecorationEditor } from "../ShellDecorationEditor";
import { DisplayEditorCanvasPane } from "./canvasPane";
import { DisplayEditorInspectorCard } from "./inspectorCard";
import {
  isDisplayEditorProfilingEnabled,
  measureDisplayEditorScope
} from "./displayEditorProfiler";
import {
  applyGeometryClipboard,
  applyGeometryClipboardBatch,
  applyRegionRect,
  createGeometryClipboard,
  resolveGeometryClipboardCompatibility,
  type DisplayEditorGeometryClipboard,
  type DisplayEditorGeometrySubset
} from "./displayEditorGeometry";
import { isRegionLocked, toggleRegionLock } from "./displayEditorRegionState";
import { fallbackPageDefinitions } from "./fallbackPageDefinitions";
import { resolveDisplayEditorRegions } from "./inspectorFields";
import { resolveDisplayPageFreeformObjectRegions } from "./inspectorFields";
import {
  resolveDisplayPageMediaEffectRegion
} from "./displayPageMediaEffectAuthoring";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { localizeDisplayEditorLabel, localizeDisplayPageLabel } from "./localization";
import { DisplayPageMediaEffectInspector } from "./mediaEffectInspector";
import { resolvePageRegionSchemas } from "./pageRegionSchemas";
import { DisplayEditorLeftPanel } from "./regionTree";
import { EditorToolbar } from "./EditorToolbar";
import { resolveEditorWorkspaceLayout } from "./workspaceLayout";
import { SourceConnectionPanel } from "./sourceConnectionPanel";
import { resolveSourceConnectionRegion } from "./sourceConnectionPanel";
import {
  addDisplayPageObject,
  deleteDisplayPageObject,
  duplicateDisplayPageObject,
  moveDisplayPageObject,
  moveDisplayPageObjectToBoundary,
  toggleDisplayPageObjectLocked,
  toggleDisplayPageObjectVisible,
  updateDisplayPageObject
} from "./freeformObjectList";
import {
  buildShellDecorationAssetLabel,
  ShellDecorationAssetPicker
} from "../ShellDecorationEditor/assetPicker";
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
  createShellWorkspaceState,
  isShellWorkspaceDirty,
  updateShellWorkspaceDraft,
  type ShellWorkspaceState
} from "./shellWorkspaceState";
import { DataInspectorPanel } from "./dataInspector";
import {
  applyOverviewGroupStyleFieldUpdate,
  resolveOverviewGroupStylePaths
} from "../Overview/displayPageConfig";

type DisplayEditorWorkspace = "assets" | "editor" | "shell";
type DisplayEditorRightTab = "data" | "health" | "inspector" | "publish" | "source";
export type DisplayEditorPageDefinition = {
  createSeedConfig: () => Record<string, unknown>;
  id: string;
  label: string;
  renderPage?: (pageId: string) => ReactElement;
  renderPreview?: (config: Record<string, unknown>) => ReactElement;
  templateKey: DisplayPageTemplateKey;
};

export function resolveDisplayEditorDeepLink(args: {
  items: readonly { hasDataBinding: boolean; id: string }[];
  requestedItemId: string | null;
  requestedPageId: string | null;
  requestedTab: string | null;
  selectedPageId: string;
}) {
  if (
    args.requestedPageId !== args.selectedPageId
    || args.requestedTab !== "data"
    || !args.requestedItemId
  ) {
    return null;
  }

  const item = args.items.find(({ id }) => id === args.requestedItemId);
  if (!item?.hasDataBinding) {
    return null;
  }

  return {
    itemId: item.id,
    pageId: args.selectedPageId,
    rightTab: "data" as const
  };
}

type DisplayPageObjectAssetOption = {
  assetId: number;
  category?: string | null;
  fallbackSrc: string;
  label: string;
  usageScope?: string | null;
};

type AssetWorkspaceOrigin = "editor" | "shell";
type RegionPathCarrier = {
  fields: Array<{ path: Array<number | string> }>;
};

function resolveAssetFallbackSrc(asset: ImageAsset) {
  return asset.filename ? buildApiUrl(`/uploads/images/${asset.filename}`) : null;
}

function pathTail(path: Array<number | string>) {
  return String(path[path.length - 1] ?? "");
}

function updateRegionFieldValue(
  config: Record<string, unknown>,
  region: RegionPathCarrier | null,
  matcher: (tail: string) => boolean,
  value: unknown
) {
  let nextConfig = config;

  for (const field of region?.fields ?? []) {
    if (matcher(pathTail(field.path))) {
      nextConfig = setValueAtPath(nextConfig, field.path, value);
    }
  }

  return nextConfig;
}

function resolveRegionSourceParentPath(region: RegionPathCarrier | null, tails: string[]) {
  for (const field of region?.fields ?? []) {
    if (tails.includes(pathTail(field.path))) {
      return field.path.slice(0, -1);
    }
  }

  return null;
}

function updateRegionSiblingSourceValue(
  config: Record<string, unknown>,
  region: RegionPathCarrier | null,
  fieldName: string,
  value: unknown
) {
  const parentPath = resolveRegionSourceParentPath(region, ["assetId", "fallbackSrc", "mode", "sourceMode", "src"]);
  if (!parentPath) {
    return config;
  }

  return setValueAtPath(config, [...parentPath, fieldName], value);
}

function regionHasPathTail(region: RegionPathCarrier | null, tail: string) {
  return (region?.fields ?? []).some((field) => pathTail(field.path) === tail);
}

export function applyManagedAssetSelectionToRegionConfig(
  config: Record<string, unknown>,
  region: RegionPathCarrier | null,
  asset: ImageAsset
) {
  const previewSrc = resolveAssetFallbackSrc(asset);
  let nextConfig = updateRegionFieldValue(config, region, (tail) => tail === "sourceMode" || tail === "mode", "managed-asset");
  nextConfig = updateRegionFieldValue(nextConfig, region, (tail) => tail === "assetId", asset.id);
  nextConfig = updateRegionSiblingSourceValue(nextConfig, region, "assetId", asset.id);

  if (previewSrc) {
    nextConfig = updateRegionFieldValue(nextConfig, region, (tail) => tail === "src" || tail === "fallbackSrc", previewSrc);
    nextConfig = updateRegionSiblingSourceValue(nextConfig, region, "src", previewSrc);
    if (regionHasPathTail(region, "mode") || regionHasPathTail(region, "fallbackSrc")) {
      nextConfig = updateRegionSiblingSourceValue(nextConfig, region, "fallbackSrc", previewSrc);
    }
  }

  return nextConfig;
}

export function restoreRegionSourceToSeedDefault(
  config: Record<string, unknown>,
  region: RegionPathCarrier | null
) {
  let nextConfig = updateRegionFieldValue(config, region, (tail) => tail === "sourceMode", "seed-default");
  nextConfig = updateRegionFieldValue(nextConfig, region, (tail) => tail === "assetId", undefined);
  nextConfig = updateRegionFieldValue(nextConfig, region, (tail) => tail === "src" || tail === "fallbackSrc", undefined);
  nextConfig = updateRegionSiblingSourceValue(nextConfig, region, "assetId", undefined);
  nextConfig = updateRegionSiblingSourceValue(nextConfig, region, "src", undefined);
  if (regionHasPathTail(region, "mode") || regionHasPathTail(region, "fallbackSrc")) {
    nextConfig = updateRegionSiblingSourceValue(nextConfig, region, "fallbackSrc", undefined);
  }
  return nextConfig;
}

export function applyManagedAssetSelectionToShellDraft(
  draft: ShellDecorationEnvelope | undefined,
  objectId: string | null,
  asset: ImageAsset
) {
  if (!draft || !objectId) {
    return draft;
  }

  const previewSrc = resolveAssetFallbackSrc(asset);
  if (!previewSrc) {
    return draft;
  }

  const updateObject = (object: ShellDecorationEnvelope["headerObjects"][number]) => {
    if (object.id !== objectId || object.type === "line") {
      return object;
    }

    if (object.type === "asset-image") {
      return {
        ...object,
        source: {
          assetId: asset.id,
          fallbackSrc: previewSrc,
          kind: "asset-image" as const
        }
      };
    }

    return {
      ...object,
      source: {
        assetId: asset.id,
        fallbackSrc: previewSrc,
        kind: "ornament-image" as const,
        ornamentKey: object.source.ornamentKey
      }
    };
  };

  return {
    ...draft,
    footerObjects: draft.footerObjects.map(updateObject),
    headerObjects: draft.headerObjects.map(updateObject)
  };
}

function formatShellMountLabel(mount: "header" | "footer") {
  return mount === "header" ? "頁首" : "頁尾";
}

export function resolveAssetWorkspaceContextLabel(args: {
  editableItems: ResolvedDisplayEditorRegion[];
  pageId: string;
  returnWorkspace: AssetWorkspaceOrigin;
  shellDraft?: ShellDecorationEnvelope;
  targetId: string | null;
}) {
  if (args.returnWorkspace === "shell") {
    const targetObject = [...(args.shellDraft?.headerObjects ?? []), ...(args.shellDraft?.footerObjects ?? [])]
      .find((object) => object.id === args.targetId);
    if (!targetObject) {
      return null;
    }

    return `共用殼層 ${formatShellMountLabel(targetObject.mount)} ${targetObject.id}`;
  }

  const targetRegion = args.editableItems.find((item) => item.id === args.targetId);
  if (!targetRegion) {
    return null;
  }

  return `${localizeDisplayPageLabel(args.pageId)} ${localizeDisplayEditorLabel(targetRegion.label)}`;
}

export function resolveDisplayPageObjectAssetOptions(assets: ImageAsset[]): DisplayPageObjectAssetOption[] {
  return assets.flatMap((asset) => {
    const fallbackSrc = resolveAssetFallbackSrc(asset);
    if (!fallbackSrc || asset.usageScope === "shell-only") {
      return [];
    }

    return [
      {
        assetId: asset.id,
        category: asset.category,
        fallbackSrc,
        label: buildShellDecorationAssetLabel(asset),
        usageScope: asset.usageScope
      }
    ];
  });
}

const editorRouteMeta = routeMetaMap.get("/display-pages/editor")!;

export function DisplayPagesEditor({
  editMode: controlledEditMode,
  initialEditorState,
  initialImages,
  initialAssetHealthReport,
  initialShellDecorationDraft,
  initialShellDecorationImages,
  onEditModeChange,
  initialPublishingStateByPage,
  pageDefinitions = fallbackPageDefinitions,
  renderPreview = true
}: {
  editMode?: boolean;
  initialEditorState?: {
    editMode?: boolean;
    lockedRegionIds?: string[];
    rightTab?: DisplayEditorRightTab;
    selectedRegionId?: string | null;
    selectedRegionIds?: string[];
  };
  initialImages?: ImageAsset[];
  initialAssetHealthReport?: DisplayPageAssetHealthReport | null;
  initialShellDecorationDraft?: ShellDecorationEnvelope;
  initialShellDecorationImages?: ImageAsset[];
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
  const requestedItemId = searchParams.get("item");
  const requestedTab = searchParams.get("tab");
  const hasEditorDeepLinkRequest = requestedItemId !== null || requestedTab !== null;
  const assetContextId = searchParams.get("assetContext");
  const assetReturnWorkspace: AssetWorkspaceOrigin = searchParams.get("assetReturn") === "shell" ? "shell" : "editor";
  const selectedWorkspace: DisplayEditorWorkspace =
    searchParams.get("workspace") === "assets"
      ? "assets"
      : searchParams.get("workspace") === "shell"
        ? "shell"
        : "editor";
  const selectedPageId =
    requestedPageId && pageIdSet.has(requestedPageId)
      ? requestedPageId
      : defaultPageId;
  const [internalEditMode, setInternalEditMode] = useState(initialEditorState?.editMode ?? false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(initialEditorState?.selectedRegionId ?? null);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>(
    () =>
      initialEditorState?.selectedRegionIds?.length
        ? [...new Set(initialEditorState.selectedRegionIds)]
        : initialEditorState?.selectedRegionId
          ? [initialEditorState.selectedRegionId]
          : []
  );
  const [geometryClipboard, setGeometryClipboard] = useState<DisplayEditorGeometryClipboard | null>(null);
  const [productivityMessage, setProductivityMessage] = useState<string | null>(null);
  const [selectionFeedbackLabel, setSelectionFeedbackLabel] = useState<string | null>(null);
  const [lockedRegionIdsByPage, setLockedRegionIdsByPage] = useState<Record<string, string[]>>(
    () =>
      initialEditorState?.lockedRegionIds?.length
        ? { [selectedPageId]: initialEditorState.lockedRegionIds }
        : {}
  );
  const [images, setImages] = useState<ImageAsset[]>(initialImages ?? []);
  const [imagePickerError, setImagePickerError] = useState("");
  const [shellWorkspaceState, setShellWorkspaceState] = useState<ShellWorkspaceState>(() =>
    createShellWorkspaceState(initialShellDecorationDraft)
  );
  const shellDraftState = shellWorkspaceState.draft;
  const [shellImagesState, setShellImagesState] = useState<ImageAsset[] | undefined>(
    initialShellDecorationImages ?? initialImages
  );
  const [shellSelectedObjectId, setShellSelectedObjectId] = useState<string | null>(
    initialShellDecorationDraft?.headerObjects[0]?.id ?? initialShellDecorationDraft?.footerObjects[0]?.id ?? null
  );
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [inlineAssetPickerOpen, setInlineAssetPickerOpen] = useState(false);
  const workspaceLayout = useMemo(
    () =>
      resolveEditorWorkspaceLayout({
        leftCollapsed,
        rightCollapsed,
        rightWidth: rightPanelWidth,
        viewportWidth: typeof window === "undefined" ? 1920 : window.innerWidth
      }),
    [leftCollapsed, rightCollapsed, rightPanelWidth]
  );
  const shellDirty = useMemo(() => isShellWorkspaceDirty(shellWorkspaceState), [shellWorkspaceState]);
  const appliedEditorDeepLinkRef = useRef<string | null>(null);
  const editMode = controlledEditMode ?? internalEditMode;
  const [rightTab, setRightTab] = useState<DisplayEditorRightTab>(initialEditorState?.rightTab ?? "inspector");
  const displayEditorProfilingEnabled = useMemo(() => isDisplayEditorProfilingEnabled(), []);

  const selectedPage = useMemo(
    () => resolvedPageDefinitions.find((page) => page.id === selectedPageId) ?? resolvedPageDefinitions[0]!,
    [resolvedPageDefinitions, selectedPageId]
  );
  const seedConfig = useMemo(() => selectedPage.createSeedConfig(), [selectedPage]);
  const {
    applyConfigUpdate,
    canEdit,
    canRedo,
    canUndo,
    config,
    dirty,
    errorMessage,
    isLoading,
    isSaving,
    lastLoadedEnvelope,
    message,
    redo,
    resetPaths,
    reload,
    save,
    undo
  } = useDisplayPageConfig(selectedPage.id, seedConfig, { stage: "draft" });

  const shouldResolveEditorRegions =
    selectedWorkspace === "editor" ||
    (selectedWorkspace === "assets" && assetReturnWorkspace === "editor" && Boolean(assetContextId));
  const freeformObjects = useMemo(
    () => normalizeDisplayPageFreeformObjects((config as { freeformObjects?: unknown }).freeformObjects),
    [config]
  );
  const editableRegions = useMemo(
    () =>
      shouldResolveEditorRegions
        ? measureDisplayEditorScope(
            "region-resolve",
            () => resolveDisplayEditorRegions(config, resolvePageRegionSchemas(selectedPage.templateKey), seedConfig),
            { enabled: displayEditorProfilingEnabled }
          )
        : [],
    [config, displayEditorProfilingEnabled, seedConfig, selectedPage.templateKey, shouldResolveEditorRegions]
  );
  const editableFreeformObjects = useMemo(
    () => (shouldResolveEditorRegions ? resolveDisplayPageFreeformObjectRegions(config, seedConfig) : []),
    [config, seedConfig, shouldResolveEditorRegions]
  );
  const editableItems = useMemo(
    () => [...editableRegions, ...editableFreeformObjects],
    [editableFreeformObjects, editableRegions]
  );
  const editableItemIds = useMemo(
    () => new Set(editableItems.map((item) => item.id)),
    [editableItems]
  );
  const resolvedSelectedRegionIds = useMemo(
    () => selectedRegionIds.filter((regionId) => editableItemIds.has(regionId)),
    [editableItemIds, selectedRegionIds]
  );
  const selectedRegion = useMemo(
    () =>
      editableItems.find((region) => region.id === selectedRegionId) ??
      editableItems.find((region) => region.id === resolvedSelectedRegionIds[resolvedSelectedRegionIds.length - 1]) ??
      editableItems[0] ??
      null,
    [editableItems, resolvedSelectedRegionIds, selectedRegionId]
  );
  const updatePath = useCallback(
    (path: Array<number | string>, value: unknown) => {
      if (selectedPage.id === "overview") {
        const dirtyPaths = resolveOverviewGroupStylePaths(selectedRegion?.id, path);
        applyConfigUpdate(
          (current) =>
            applyOverviewGroupStyleFieldUpdate(
              current as typeof seedConfig,
              selectedRegion?.id,
              path,
              value
            ),
          { dirtyPaths }
        );
        return;
      }

      applyConfigUpdate((current) => setValueAtPath(current, path, value), { dirtyPaths: [path] });
    },
    [applyConfigUpdate, seedConfig, selectedPage.id, selectedRegion?.id]
  );
  const handleResetField = useCallback(
    (path: Array<number | string>) => {
      if (selectedPage.id === "overview") {
        resetPaths(resolveOverviewGroupStylePaths(selectedRegion?.id, path));
        return;
      }

      resetPaths([path]);
    },
    [resetPaths, selectedPage.id, selectedRegion?.id]
  );
  const selectedRegions = useMemo(
    () => editableItems.filter((region) => resolvedSelectedRegionIds.includes(region.id) && region.geometry),
    [editableItems, resolvedSelectedRegionIds]
  );
  const distanceLockTargetRegion = useMemo(
    () =>
      selectedRegions.length === 2
        ? selectedRegions.find((region) => region.id !== selectedRegion?.id) ?? null
        : null,
    [selectedRegion, selectedRegions]
  );
  const selectedCardRegion = selectedRegion?.nodeType === "card-rail-card" ? selectedRegion : null;
  const selectedFreeformObjectRegion = selectedRegion?.nodeType === "freeform-object" ? selectedRegion : null;
  const selectedFreeformObject = useMemo(
    () =>
      selectedFreeformObjectRegion
        ? freeformObjects.find((object) => object.id === selectedFreeformObjectRegion.id) ?? null
        : null,
    [freeformObjects, selectedFreeformObjectRegion]
  );
  const shouldLoadEditorAssetOptions = Boolean(
    assetContextId ||
    (selectedWorkspace === "editor" && selectedFreeformObject && selectedFreeformObject.type !== "line")
  );
  const shouldLoadAssetHealth = selectedWorkspace === "editor" && rightTab === "health";
  const shouldLoadPublishingState = selectedWorkspace === "editor" && rightTab === "publish";
  const shouldRenderPreviewContent = renderPreview && selectedWorkspace === "editor";
  const inspectorRegion = useMemo(
    () => resolveDisplayPageMediaEffectRegion(selectedRegion, editableItems) ?? selectedRegion,
    [editableItems, selectedRegion]
  );
  const dataBindingCapability = selectedRegion?.schema.dataBinding ?? null;
  const dataBindingPageKey = selectedPage.id === "factory-circuit-guanyin"
    ? "factory-circuit-guanyin"
    : selectedPage.templateKey === "overview"
      || selectedPage.templateKey === "solar"
      || selectedPage.templateKey === "factory-circuit"
      ? selectedPage.templateKey
      : null;
  const requestedEditorDeepLink = useMemo(
    () => resolveDisplayEditorDeepLink({
      items: editableItems.map((item) => ({
        hasDataBinding: Boolean(item.schema.dataBinding && dataBindingPageKey),
        id: item.id
      })),
      requestedItemId,
      requestedPageId,
      requestedTab,
      selectedPageId
    }),
    [dataBindingPageKey, editableItems, requestedItemId, requestedPageId, requestedTab, selectedPageId]
  );
  const lockedRegionIds = lockedRegionIdsByPage[selectedPage.id] ?? [];
  const lockedObjectIds = useMemo(
    () => freeformObjects.filter((object) => object.locked).map((object) => object.id),
    [freeformObjects]
  );
  const lockedSelectionIds = useMemo(
    () => [...lockedRegionIds, ...lockedObjectIds],
    [lockedObjectIds, lockedRegionIds]
  );
  const selectedRegionLocked = isRegionLocked(lockedSelectionIds, selectedRegion?.id);
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
    reload,
    { enabled: shouldLoadPublishingState, unsavedBindings: dirty }
  );
  const {
    errorMessage: assetHealthErrorMessage,
    isLoading: isAssetHealthLoading,
    reload: reloadAssetHealth,
    report: assetHealthReport
  } = useDisplayPageAssetHealth({ enabled: shouldLoadAssetHealth });

  useEffect(() => {
    if (initialImages || !shouldLoadEditorAssetOptions) {
      return;
    }

    let active = true;

    void getImages()
      .then((nextImages) => {
        if (!active) {
          return;
        }

        setImages(nextImages);
        setImagePickerError("");
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setImagePickerError(error instanceof Error ? error.message : "載入圖片素材失敗。");
      });

    return () => {
      active = false;
    };
  }, [initialImages, shouldLoadEditorAssetOptions]);

  useEffect(() => {
    setSelectedRegionId(null);
    setSelectedRegionIds([]);
    setProductivityMessage(null);
    setSelectionFeedbackLabel(null);
  }, [selectedPage.id]);

  useEffect(() => {
    if (!editMode && !requestedEditorDeepLink) {
      setSelectedRegionId(null);
      setSelectedRegionIds([]);
      setProductivityMessage(null);
      setSelectionFeedbackLabel(null);
      return;
    }

    if (editMode && !selectedRegionId && editableItems[0] && !hasEditorDeepLinkRequest) {
      setSelectedRegionId(editableItems[0].id);
      setSelectedRegionIds([editableItems[0].id]);
    }
  }, [editMode, editableItems, hasEditorDeepLinkRequest, requestedEditorDeepLink, selectedRegionId]);

  useEffect(() => {
    if (!requestedEditorDeepLink) {
      appliedEditorDeepLinkRef.current = null;
      return;
    }

    const deepLinkKey = `${requestedEditorDeepLink.pageId}:${requestedEditorDeepLink.itemId}:${requestedEditorDeepLink.rightTab}`;
    if (appliedEditorDeepLinkRef.current === deepLinkKey) {
      return;
    }
    appliedEditorDeepLinkRef.current = deepLinkKey;

    setSelectedRegionId(requestedEditorDeepLink.itemId);
    setSelectedRegionIds([requestedEditorDeepLink.itemId]);
    setRightTab(requestedEditorDeepLink.rightTab);
  }, [requestedEditorDeepLink]);

  useEffect(() => {
    if (selectedRegionId && !editableItemIds.has(selectedRegionId)) {
      setSelectedRegionId(editableItems[0]?.id ?? null);
    }
  }, [editableItemIds, editableItems, selectedRegionId]);

  useEffect(() => {
    if (resolvedSelectedRegionIds.length !== selectedRegionIds.length) {
      setSelectedRegionIds(resolvedSelectedRegionIds);
    }
  }, [resolvedSelectedRegionIds, selectedRegionIds.length]);

  useEffect(() => {
    if (rightTab === "data" && (!dataBindingCapability || !dataBindingPageKey)) {
      setRightTab("inspector");
    }
  }, [dataBindingCapability, dataBindingPageKey, rightTab]);

  const handleSelectRegion = useCallback(
    (regionId: string, options?: { additive?: boolean }) => {
      setProductivityMessage(null);
      setSelectionFeedbackLabel(null);
      const targetRegion = editableItems.find((region) => region.id === regionId) ?? null;
      const resolvedRegionId =
        resolveDisplayPageMediaEffectRegion(targetRegion, editableItems)?.id ?? regionId;
      if (!options?.additive) {
        setSelectedRegionId(resolvedRegionId);
        setSelectedRegionIds([resolvedRegionId]);
        return;
      }

      setSelectedRegionIds((current) => {
        const exists = current.includes(resolvedRegionId);
        if (exists) {
          const next = current.filter((id) => id !== resolvedRegionId);
          setSelectedRegionId(next[next.length - 1] ?? null);
          return next;
        }

        setSelectedRegionId(resolvedRegionId);
        return [...current, resolvedRegionId];
      });
    },
    [editableItems]
  );

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
    if (isLoading || isSaving) return;
    if (dirty && !window.confirm("重新同步將捨棄目前頁面未儲存的草稿與復原歷程。是否繼續？")) return;
    await reload({ discardLocalChanges: dirty });
    await refresh();
    await reloadAssetHealth();
  };

  const handleSave = async () => {
    await save();
    await refresh();
    await reloadAssetHealth();
  };

  const applyFreeformObjectUpdate = useCallback(
    (
      updater: (
        objects: DisplayPageFreeformObject[]
      ) => { objects: DisplayPageFreeformObject[]; selectedObjectId?: string | null } | DisplayPageFreeformObject[]
    ) => {
      if (!canEdit) return;
      const nextValue = updater(freeformObjects);
      const nextObjects = Array.isArray(nextValue) ? nextValue : nextValue.objects;
      const nextSelectedObjectId = Array.isArray(nextValue) ? undefined : nextValue.selectedObjectId;

      applyConfigUpdate((current) => ({
        ...current,
        freeformObjects: nextObjects
      }));

      if (nextSelectedObjectId !== undefined) {
        setSelectedRegionId(nextSelectedObjectId);
        setSelectedRegionIds(nextSelectedObjectId ? [nextSelectedObjectId] : []);
      }
    },
    [applyConfigUpdate, canEdit, freeformObjects]
  );

  const updateSelectedFreeformObject = useCallback(
    (updater: (object: DisplayPageFreeformObject) => DisplayPageFreeformObject) => {
      if (!selectedFreeformObject) {
        return;
      }

      applyFreeformObjectUpdate((objects) =>
        updateDisplayPageObject(objects, selectedFreeformObject.id, updater)
      );
    },
    [applyFreeformObjectUpdate, selectedFreeformObject]
  );

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
  const handleSelectWorkspace = useCallback((workspace: DisplayEditorWorkspace, context?: string, returnWorkspace: AssetWorkspaceOrigin = "editor") => {
    const nextParams = new URLSearchParams(searchParams);
    if (workspace === "assets") {
      nextParams.set("workspace", workspace);
      if (context) {
        nextParams.set("assetContext", context);
        nextParams.set("assetReturn", returnWorkspace);
      } else {
        nextParams.delete("assetContext");
        nextParams.delete("assetReturn");
      }
    } else {
      nextParams.delete("workspace");
      nextParams.delete("assetContext");
      nextParams.delete("assetReturn");
      if (workspace === "shell") {
        nextParams.set("workspace", workspace);
      }
    }
    nextParams.set("page", selectedPage.id);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, selectedPage.id, setSearchParams]);

  const applySelectionRects = useCallback(
    (
      actionLabel: string,
      nextSelections: Array<{ id: string; rect: { height: number; left: number; top: number; width: number } }>
    ) => {
      if (nextSelections.length === 0) {
        return;
      }

      const nextById = new Map(nextSelections.map((selection) => [selection.id, selection.rect]));
      applyConfigUpdate((current) => {
        let nextConfig = current;

        for (const region of editableItems) {
          const nextRect = nextById.get(region.id);
          if (!nextRect) {
            continue;
          }
          nextConfig = applyRegionRect(nextConfig, region, nextRect);
        }

        return nextConfig;
      });
      setSelectionFeedbackLabel(actionLabel);
    },
    [applyConfigUpdate, editableItems]
  );

  const geometryPasteTargets = useMemo(() => {
    if (!selectedRegion?.geometry) {
      return [];
    }

    const selectedTargets =
      selectedRegions.length > 1
        ? selectedRegions.filter((region) => region.id !== geometryClipboard?.sourceRegionId)
        : [selectedRegion];
    return selectedTargets;
  }, [geometryClipboard?.sourceRegionId, selectedRegion, selectedRegions]);
  const geometryPasteCompatibility = useMemo(
    () =>
      geometryPasteTargets.map((region) => ({
        compatibility: resolveGeometryClipboardCompatibility(region, geometryClipboard),
        locked: isRegionLocked(lockedSelectionIds, region.id),
        region
      })),
    [geometryClipboard, geometryPasteTargets, lockedSelectionIds]
  );
  const compatibleGeometryPasteCount = geometryPasteCompatibility.filter(
    (entry) => !entry.locked && entry.compatibility.compatible
  ).length;

  const handlePasteGeometry = useCallback(
    (subset: DisplayEditorGeometrySubset) => {
      if (!selectedRegion?.geometry || !geometryClipboard || geometryPasteTargets.length === 0) {
        return;
      }

      if (geometryPasteTargets.length > 1) {
        const compatibleTargets = geometryPasteCompatibility
          .filter((entry) => !entry.locked && entry.compatibility.compatible)
          .map((entry) => entry.region);
        const result = applyGeometryClipboardBatch(
          config,
          compatibleTargets,
          geometryClipboard,
          subset
        );
        const failedTargetIds = [
          ...geometryPasteCompatibility
            .filter((entry) => entry.locked || !entry.compatibility.compatible)
            .map((entry) => entry.region.id),
          ...result.failedTargetIds
        ];
        applyConfigUpdate(result.config);
        setProductivityMessage(
          failedTargetIds.length > 0
            ? `已貼用 ${compatibleGeometryPasteCount} 個相容區域，${failedTargetIds.length} 個目標被拒絕。`
            : `已將${subset === "position" ? "位置" : subset === "size" ? "尺寸" : "完整框"}貼到 ${compatibleGeometryPasteCount} 個區域。`
        );
        return;
      }

      const [targetEntry] = geometryPasteCompatibility;
      if (!targetEntry) {
        return;
      }
      if (targetEntry.locked) {
        setProductivityMessage("已鎖定區域不可貼用幾何。");
        return;
      }
      if (!targetEntry.compatibility.compatible) {
        setProductivityMessage(targetEntry.compatibility.reason);
        return;
      }

      applyConfigUpdate(applyGeometryClipboard(config, targetEntry.region, geometryClipboard, subset));
      setProductivityMessage(
        `已貼上${subset === "position" ? "位置" : subset === "size" ? "尺寸" : "完整框"}。`
      );
    },
    [
      applyConfigUpdate,
      compatibleGeometryPasteCount,
      config,
      geometryClipboard,
      geometryPasteCompatibility,
      geometryPasteTargets,
      selectedRegion
    ]
  );

  const assetOptions = useMemo(() => resolveDisplayPageObjectAssetOptions(images), [images]);
  const selectedShellObject = useMemo(
    () =>
      [...(shellDraftState?.headerObjects ?? []), ...(shellDraftState?.footerObjects ?? [])]
        .find((object) => object.id === shellSelectedObjectId) ?? null,
    [shellDraftState, shellSelectedObjectId]
  );
  const assetWorkspaceContextLabel = useMemo(
    () =>
      resolveAssetWorkspaceContextLabel({
        editableItems,
        pageId: selectedPage.id,
        returnWorkspace: assetReturnWorkspace,
        shellDraft: shellDraftState,
        targetId: assetContextId
      }),
    [assetContextId, assetReturnWorkspace, editableItems, selectedPage.id, shellDraftState]
  );
  const assetWorkspaceReturnLabel = assetReturnWorkspace === "shell" ? "返回殼層裝飾" : "返回展示頁編輯";
  const sourceConnectionRegion = useMemo(
    () => resolveSourceConnectionRegion(selectedRegion, editableItems),
    [editableItems, selectedRegion]
  );

  const handleApplyAssetSelectionAndReturn = useCallback((asset: ImageAsset) => {
    if (assetReturnWorkspace === "shell") {
      setShellWorkspaceState((current) =>
        updateShellWorkspaceDraft(
          current,
          applyManagedAssetSelectionToShellDraft(current.draft, assetContextId, asset)
        )
      );
      handleSelectWorkspace("shell");
      return;
    }

    const targetRegion =
      editableItems.find((item) => item.id === assetContextId)
      ?? selectedRegion;
    if (targetRegion) {
      applyConfigUpdate((current) => applyManagedAssetSelectionToRegionConfig(current, targetRegion, asset));
      setSelectedRegionId(targetRegion.id);
      setSelectedRegionIds([targetRegion.id]);
    }
    setInlineAssetPickerOpen(false);
    handleSelectWorkspace("editor");
  }, [
    applyConfigUpdate,
    assetContextId,
    assetReturnWorkspace,
    editableItems,
    handleSelectWorkspace,
    selectedRegion
  ]);

  const pageTabs = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap items-end gap-2" data-editor-page-picker>
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
      <div className="flex flex-wrap items-end gap-2" data-editor-workspace-tools>
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
        {([
          { label: "頁面編輯", value: "editor" },
          { label: "資產庫", value: "assets" },
          { label: "殼層裝飾", value: "shell" }
        ] as const).map((workspace) => (
          <button
            key={workspace.value}
            type="button"
            className={[
              "rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
              selectedWorkspace === workspace.value
                ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                : "border-[var(--shell-divider)] bg-white/70 text-[var(--shell-muted-ink)] hover:border-[var(--shell-divider-strong)] hover:text-[var(--shell-title-ink)]"
            ].join(" ")}
            onClick={() =>
              handleSelectWorkspace(
                workspace.value,
                undefined,
                selectedWorkspace === "shell" ? "shell" : "editor"
              )
            }
          >
            {workspace.label}
          </button>
        ))}
      </div>
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
  const freeformObjectActions = selectedFreeformObject ? (
    <div className="space-y-3 rounded-[18px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.04)] p-3">
      <div className="space-y-1 text-[12px] text-[var(--shell-copy-ink)]">
        <p className="font-semibold text-[var(--shell-title-ink)]">
          {selectedFreeformObject.type === "line" ? "自由線條" : selectedFreeformObject.type === "icon-asset" ? "自由圖示" : "自由圖片"}
        </p>
        <p>{selectedFreeformObject.id}</p>
      </div>
      {selectedFreeformObject.type !== "line" ? (
        <div className="space-y-2">
          <ShellDecorationAssetPicker
            onOpenAssetWorkspace={() => handleSelectWorkspace("assets", selectedFreeformObject.id, "editor")}
            options={assetOptions}
            value={typeof selectedFreeformObject.source.assetId === "number" ? selectedFreeformObject.source.assetId : null}
            onChange={(assetId) => {
              const selectedAsset = assetOptions.find((option) => option.assetId === assetId);
              if (!selectedAsset) {
                return;
              }

              updateSelectedFreeformObject((object) => {
                if (object.type === "line") {
                  return object;
                }

                if (object.type === "asset-image") {
                  return {
                    ...object,
                    source: {
                      ...object.source,
                      assetId,
                      fallbackSrc: selectedAsset.fallbackSrc
                    }
                  };
                }

                return {
                  ...object,
                  source: {
                    ...object.source,
                    assetId,
                    fallbackSrc: selectedAsset.fallbackSrc
                  }
                };
              });
            }}
          />
          {selectedFreeformObject.source.fallbackSrc ? (
            <p className="text-[12px] text-[var(--shell-copy-ink)]">
              目前素材：{assetOptions.find((option) => option.assetId === selectedFreeformObject.source.assetId)?.label ?? selectedFreeformObject.source.fallbackSrc}
            </p>
          ) : (
            <p className="text-[12px] text-[#8f452d]">請先從素材庫選擇圖片來源。</p>
          )}
          {imagePickerError ? <p className="text-[12px] text-[#8f452d]">{imagePickerError}</p> : null}
        </div>
      ) : null}
    </div>
  ) : null;
  const layerAuthoringActions = selectedFreeformObject ? (
    <WorkspaceBoard className="space-y-3" surface="layer-controls" tone="subtle">
      <div className="space-y-1 text-[12px] text-[var(--shell-copy-ink)]">
        <p className="font-semibold text-[var(--shell-title-ink)]">圖層順序</p>
        <p>目前選取的自由物件會和左側物件列表共用同一份排序狀態。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
          disabled={selectedFreeformObject.locked}
          onClick={() =>
            applyFreeformObjectUpdate((objects) => ({
              objects: moveDisplayPageObjectToBoundary(objects, selectedFreeformObject.id, "backward"),
              selectedObjectId: selectedFreeformObject.id
            }))
          }
        >
          移到最下層
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
          disabled={selectedFreeformObject.locked}
          onClick={() =>
            applyFreeformObjectUpdate((objects) => ({
              objects: moveDisplayPageObject(objects, selectedFreeformObject.id, "backward"),
              selectedObjectId: selectedFreeformObject.id
            }))
          }
        >
          前移一層
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
          disabled={selectedFreeformObject.locked}
          onClick={() =>
            applyFreeformObjectUpdate((objects) => ({
              objects: moveDisplayPageObject(objects, selectedFreeformObject.id, "forward"),
              selectedObjectId: selectedFreeformObject.id
            }))
          }
        >
          後移一層
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
          disabled={selectedFreeformObject.locked}
          onClick={() =>
            applyFreeformObjectUpdate((objects) => ({
              objects: moveDisplayPageObjectToBoundary(objects, selectedFreeformObject.id, "forward"),
              selectedObjectId: selectedFreeformObject.id
            }))
          }
        >
          移到最上層
        </button>
      </div>
    </WorkspaceBoard>
  ) : selectedRegion && !selectedCardRegion ? (
    <WorkspaceBoard className="space-y-1 text-[12px] text-[var(--shell-copy-ink)]" surface="blocked-state" tone="subtle">
      <p className="font-semibold text-[var(--shell-title-ink)]">圖層順序由頁面模板固定</p>
      <p>
        {selectedRegion.schema.mediaEffectSurface?.status === "supported" || (inspectorRegion && inspectorRegion.id !== selectedRegion.id)
          ? "可調整來源與效果，但不能重排這個版位的上下層。"
          : "這個版位目前不支援任意重排，請維持既有模板層級。"}
      </p>
    </WorkspaceBoard>
  ) : null;
  const geometryActions = selectedRegion?.geometry ? (
    <div className="space-y-3 rounded-[18px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.04)] p-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold"
          onClick={() => {
            setGeometryClipboard(createGeometryClipboard(selectedRegion));
            setProductivityMessage(`已複製 ${localizeDisplayEditorLabel(selectedRegion.label)} 幾何。`);
          }}
        >
          複製幾何
        </button>
        {([
          { label: "貼上位置", subset: "position" },
          { label: "貼上尺寸", subset: "size" },
          { label: "貼上完整框", subset: "full-frame" }
        ] as const).map((action) => (
          <button
            key={action.subset}
            type="button"
            disabled={!geometryClipboard || compatibleGeometryPasteCount === 0}
            className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
            onClick={() => handlePasteGeometry(action.subset)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className="space-y-1 text-[12px] text-[var(--shell-copy-ink)]">
        <p>方向鍵 8px / Alt + 方向鍵 1px / Shift + 方向鍵 24px</p>
        {geometryClipboard ? (
          <p>
            幾何來源：{localizeDisplayEditorLabel(geometryClipboard.sourceRegionLabel)}
            {compatibleGeometryPasteCount > 0
              ? `，目前可貼用 ${compatibleGeometryPasteCount} 個相容區域。`
              : "，目前沒有相容貼用目標。"}
          </p>
        ) : (
          <p>先複製一個相容區域，再貼用 position、size 或 full-frame。</p>
        )}
        {productivityMessage ? (
          <p className="font-semibold text-[var(--shell-title-ink)]">{productivityMessage}</p>
        ) : null}
      </div>
    </div>
  ) : null;

  if (selectedWorkspace === "assets") {
    return (
      <PageContainer
        density="playback"
        shellPrimitive="management-scaffold"
        title={editorRouteMeta.title}
        subtitle={editorRouteMeta.subtitle}
        description="在展示頁編輯器內管理可替換的背景、物件、圖示與殼層素材。"
        spacing="compact"
        aside={pageTabs}
      >
        <div className="h-full min-h-0 overflow-y-auto">
          <AssetLibrary
            embedded
            initialAssets={initialImages ? images : undefined}
            initialAssetHealthReport={initialAssetHealthReport}
            contextLabel={assetWorkspaceContextLabel ?? undefined}
            onApplySelection={assetWorkspaceContextLabel ? handleApplyAssetSelectionAndReturn : undefined}
            onAssetsChange={(nextAssets) => {
              setImages(nextAssets);
              setShellImagesState(nextAssets);
            }}
            onReturnToEditor={() => handleSelectWorkspace(assetReturnWorkspace)}
            returnLabel={assetWorkspaceReturnLabel}
          />
        </div>
      </PageContainer>
    );
  }

  if (selectedWorkspace === "shell") {
    return (
      <PageContainer
        density="playback"
        shellPrimitive="management-scaffold"
        title={editorRouteMeta.title}
        subtitle={editorRouteMeta.subtitle}
        description="在展示頁編輯器內管理 header 與 footer 的共用殼層裝飾。"
        spacing="compact"
        aside={pageTabs}
      >
        <div className="h-full min-h-0 overflow-y-auto">
          <WorkspaceActionBar className="mb-3 static rounded-[20px]" surface="context-board">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-subtitle-ink)]">
                共用殼層工作區
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h2 className="text-[24px] font-semibold text-[var(--shell-title-ink)]">共用殼層裝飾</h2>
                <span className="text-[12px] text-[var(--shell-copy-ink)]">
                  {selectedShellObject ? `目前選取 ${selectedShellObject.id}` : "先從物件列表選一個殼層物件"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedShellObject && selectedShellObject.type !== "line" ? (
                <button
                  type="button"
                  className="rounded-full border border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] px-4 py-2 text-[13px] font-semibold text-[var(--shell-title-ink)]"
                  onClick={() => handleSelectWorkspace("assets", selectedShellObject.id, "shell")}
                >
                  更換目前素材
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-full border border-[var(--shell-divider)] px-4 py-2 text-[13px] font-semibold text-[var(--shell-copy-ink)]"
                onClick={() => handleSelectWorkspace("editor")}
              >
                返回頁面編輯
              </button>
            </div>
          </WorkspaceActionBar>
          <WorkspaceBoard className="mb-3 text-[13px] text-[var(--shell-copy-ink)]" surface="selection-board" tone="subtle">
            {shellDraftState
              ? `草稿 version ${shellDraftState.version}，${shellDraftState.headerObjects.length + shellDraftState.footerObjects.length} 個殼層物件可直接在此調整幾何、層級與素材來源。`
              : "正在同步殼層草稿與可用素材。"}
          </WorkspaceBoard>
          <aside className="mb-3 rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3 text-[13px] text-[#5c4a1f]" data-shared-shell-scope role="note">
            共用頁首／頁尾會影響所有使用此殼層的展示頁。殼層草稿與目前頁面草稿分開儲存。
            {shellDirty ? <strong className="mt-1 block" data-shared-shell-dirty>殼層尚有未儲存變更</strong> : null}
            {dirty ? <span className="mt-1 block" data-page-draft-dirty>目前頁面也有未儲存草稿，儲存頁面不會順便存殼層。</span> : null}
          </aside>
          <ShellDecorationEditor
            embedded
            initialDraft={shellDraftState}
            initialImages={shellImagesState}
            initialSelectedObjectId={shellSelectedObjectId}
            onImagesChange={setShellImagesState}
            onOpenAssetWorkspace={(context) => handleSelectWorkspace("assets", context ?? shellSelectedObjectId ?? "shell", "shell")}
            onSelectedObjectIdChange={setShellSelectedObjectId}
            onWorkspaceStateChange={setShellWorkspaceState}
            workspaceState={shellWorkspaceState}
            renderPreview={renderPreview}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      density="playback"
      shellPrimitive="management-scaffold"
      title={editorRouteMeta.title}
      subtitle={editorRouteMeta.subtitle}
      description="切換五個展示頁畫布，並在同一頁完成區域選取、屬性調整與草稿發布。"
      hideTitleBlockHeading={editMode}
      spacing={editMode ? "compact" : "default"}
      aside={pageTabs}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-[var(--shell-divider)] bg-white/50 shadow-[0_20px_45px_rgba(80,94,54,0.08)]">
      <EditorToolbar
        canEdit={canEdit}
        canRedo={canRedo}
        canUndo={canUndo}
        dirty={dirty}
        errorMessage={errorMessage}
        isPublishing={isPublishing}
        isLoading={isLoading}
        isSaving={isSaving}
        onPreview={() => setEditMode(false)}
        onPublishCheck={() => {
          setRightTab("publish");
          void refresh();
        }}
        onRedo={redo}
        onReload={() => void handleReload()}
        onSave={() => void handleSave()}
        onUndo={undo}
        pageLabel={localizeDisplayPageLabel(selectedPage.label)}
        publishBlocked={isPublishBlocked}
      />
      {errorMessage.includes("儲存衝突") ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#ead7aa] bg-[#fff8e8] px-4 py-2 text-[13px]" data-editor-remote-revision role="status">
          <span>遠端已有較新版本。重載前會確認是否捨棄目前未儲存的草稿與復原歷程。</span>
          <button className="mgmt-action min-h-[40px]" disabled={isLoading || isSaving} onClick={() => void handleReload()} type="button">重載遠端</button>
        </div>
      ) : null}
      <div
        className="relative grid min-h-0 flex-1 grid-rows-1 overflow-hidden"
        data-editor-workspace-layout
        style={{ gridTemplateColumns: workspaceLayout.canvasGridTemplate }}
      >
        <fieldset className="contents" data-editor-draft-controls disabled={!canEdit}>
        <DisplayEditorLeftPanel
          freeformObjects={freeformObjects}
          dirty={dirty}
          editMode={editMode}
          errorMessage={errorMessage}
          message={message}
          onAddObject={(type) => {
            applyFreeformObjectUpdate((objects) => addDisplayPageObject(objects, type));
          }}
          onDeleteObject={(objectId) => {
            applyFreeformObjectUpdate((objects) =>
              selectedFreeformObject
                ? deleteDisplayPageObject(objects, objectId, selectedFreeformObject.id)
                : objects.filter((object) => object.id !== objectId)
            );
          }}
          onDuplicateObject={(objectId) => {
            applyFreeformObjectUpdate((objects) => duplicateDisplayPageObject(objects, objectId));
          }}
          onMoveObjectBackward={(objectId) => {
            applyFreeformObjectUpdate((objects) => moveDisplayPageObject(objects, objectId, "backward"));
          }}
          onMoveObjectForward={(objectId) => {
            applyFreeformObjectUpdate((objects) => moveDisplayPageObject(objects, objectId, "forward"));
          }}
          onSelectObject={handleSelectRegion}
          onSelectRegion={handleSelectRegion}
          onToggleObjectLocked={(objectId) => {
            applyFreeformObjectUpdate((objects) => toggleDisplayPageObjectLocked(objects, objectId));
          }}
          onToggleObjectVisible={(objectId) => {
            applyFreeformObjectUpdate((objects) => toggleDisplayPageObjectVisible(objects, objectId));
          }}
          onToggleRegionLock={(regionId) => {
            setLockedRegionIdsByPage((current) => ({
              ...current,
              [selectedPage.id]: toggleRegionLock(current[selectedPage.id] ?? [], regionId)
            }));
          }}
          regions={editableRegions}
          selectedObjectId={selectedFreeformObject?.id ?? null}
          lockedRegionIds={lockedRegionIds}
          selectedRegionId={selectedRegion?.id ?? null}
        />
        </fieldset>

        <DisplayEditorCanvasPane
          applyConfigUpdate={applyConfigUpdate}
          canRedo={canEdit && canRedo}
          canUndo={canEdit && canUndo}
          config={config}
          displayEditorProfilingEnabled={displayEditorProfilingEnabled}
          distanceLockTargetRegion={distanceLockTargetRegion}
          editMode={editMode && canEdit}
          lockedSelectionIds={lockedSelectionIds}
          onApplySelectionRects={applySelectionRects}
          onSelectRegion={handleSelectRegion}
          redo={redo}
          regions={editableItems}
          renderPreview={shouldRenderPreviewContent}
          selectedPage={selectedPage}
          selectedRegion={selectedRegion}
          selectedRegionIds={resolvedSelectedRegionIds}
          selectedRegions={selectedRegions}
          selectionFeedbackLabel={selectionFeedbackLabel}
          undo={undo}
        />

        <div className="flex flex-col overflow-hidden border-l border-[var(--shell-divider)]">
          <label className="flex items-center gap-2 border-b border-[var(--shell-divider)] px-3 py-1 text-[11px] text-[var(--shell-copy-ink)]">
            面板寬度
            <input
              aria-label="調整屬性面板寬度"
              className="min-h-[40px] flex-1"
              max={480}
              min={200}
              onChange={(event) => setRightPanelWidth(Number(event.target.value))}
              type="range"
              value={rightPanelWidth}
            />
          </label>
          <div className="shrink-0 flex border-b border-[var(--shell-divider)]">
            {(dataBindingCapability && dataBindingPageKey
              ? (["inspector", "data", "source", "health", "publish"] as const)
              : (["inspector", "source", "health", "publish"] as const)
            ).map((tab) => {
              const labels = { data: "資料", inspector: "屬性", source: "素材來源", health: "素材健康", publish: "發布" };
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
          <fieldset className="m-0 min-h-0 min-w-0 flex-1 overflow-y-auto border-0 p-4" data-editor-draft-controls disabled={!canEdit}>
            {rightTab === "inspector" && (
              <DisplayEditorInspectorCard
                flat
                actions={
                  inspectorRegion ? <div className="space-y-4">{layerAuthoringActions}{geometryActions}{freeformObjectActions}{cardRailActions}</div> : null
                }
                editMode={editMode}
                extraContent={
                  inspectorRegion ? (
                    <DisplayPageMediaEffectInspector
                      availableRegions={editableItems}
                      config={config}
                      onConfigChange={applyConfigUpdate}
                      selectedRegion={inspectorRegion}
                    />
                  ) : null
                }
                emptyMessage={
                  editableItems.length > 0
                    ? "請先在畫布或物件列表中選取一個可編輯項目。"
                    : "這個頁面的專屬編輯區域尚未展開，先保留預覽與路由覆蓋。"
                }
                onChange={updatePath}
                onOpenAssetLibrary={() => {
              const nextParams = new URLSearchParams(searchParams);
              if (inspectorRegion?.id) {
                nextParams.set("assetContext", inspectorRegion.id);
                nextParams.set("assetReturn", "editor");
              }
              nextParams.delete("workspace");
              setSearchParams(nextParams, { replace: true });
              setInlineAssetPickerOpen(true);
            }}
                onResetField={handleResetField}
                selectedRegion={inspectorRegion}
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
            {rightTab === "data" && dataBindingCapability && dataBindingPageKey && (
              <DataInspectorPanel
                capability={dataBindingCapability}
                config={config}
                editMode={editMode}
                onChange={updatePath}
                onReset={handleResetField}
                pageId={selectedPage.id}
                pageKey={dataBindingPageKey}
              />
            )}
            {rightTab === "source" && (
              <SourceConnectionPanel
                editMode={editMode}
                freeformObject={selectedFreeformObject}
                config={config}
                onJumpToProperties={() => {
                  if (sourceConnectionRegion && sourceConnectionRegion.id !== selectedRegion?.id) {
                    setSelectedRegionId(sourceConnectionRegion.id);
                    setSelectedRegionIds([sourceConnectionRegion.id]);
                  }
                  setRightTab("inspector");
                }}
                onOpenAssetLibrary={() => handleSelectWorkspace("assets", sourceConnectionRegion?.id ?? selectedFreeformObject?.id ?? undefined, "editor")}
                onRestoreSeedDefault={() =>
                  applyConfigUpdate((current) => restoreRegionSourceToSeedDefault(current, sourceConnectionRegion))
                }
                availableRegions={editableItems}
                selectedRegion={selectedRegion}
              />
            )}
            {rightTab === "publish" && (
              <PublishReviewDrawer
                blockingCount={blockingCount}
                isPublishBlocked={isPublishBlocked}
                isPublishing={isPublishing}
                onClose={() => setRightTab("inspector")}
                onConfirmPublish={() => { if (canEdit && !dirty) void publish(); }}
                publishingError={publishingError}
                publishingState={publishingState}
              />
            )}
          </fieldset>
          </div>
        {workspaceLayout.useDrawer ? (
          <button
            className="mgmt-action absolute left-2 top-2 z-10 min-h-[40px]"
            data-editor-left-drawer-toggle
            onClick={() => setLeftCollapsed((current) => !current)}
            type="button"
          >
            {leftCollapsed ? "開啟結構面板" : "收合結構面板"}
          </button>
        ) : null}
        {inlineAssetPickerOpen ? (
          <div className="absolute inset-y-0 right-0 z-20 w-full max-w-xl overflow-y-auto border-l border-[var(--shell-divider)] bg-white shadow-lg" data-editor-inline-asset-picker>
            <div className="flex items-center justify-between gap-2 border-b border-[var(--shell-divider)] px-3 py-2">
              <strong>選擇素材</strong>
              <button className="mgmt-action min-h-[40px]" onClick={() => setInlineAssetPickerOpen(false)} type="button">取消</button>
            </div>
            <AssetLibrary
              embedded
              initialAssets={images}
              contextLabel={assetWorkspaceContextLabel ?? undefined}
              onApplySelection={handleApplyAssetSelectionAndReturn}
              onAssetsChange={setImages}
              onReturnToEditor={() => setInlineAssetPickerOpen(false)}
              returnLabel="返回編輯"
            />
          </div>
        ) : null}
        </div>
        </div>
    </PageContainer>
  );
}
