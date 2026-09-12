import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData, useSearchParams } from "react-router-dom";
import type {
  DisplayPageId,
  DisplayPageAssetHealthReport,
  ImageAsset,
  ShellDecorationEnvelope
} from "@solar-display/shared";
import { ManagementShellFrame } from "../../layouts/ManagementShell";
import {
  loadDisplayPageRegistrySnapshot,
  useDisplayPageRegistry
} from "../../hooks/useDisplayPageRegistry";
import { loadDisplayPageConfigEnvelope } from "../../hooks/useDisplayPageConfig";
import { fallbackPageDefinitions } from "./fallbackPageDefinitions";
import { buildRuntimePageDefinitions, runtimePageDefinitions } from "./runtimePageDefinitions";
import { DisplayPagesEditor } from "./index";
import {
  loadImageManagementModel,
  readCachedImageManagementModel
} from "../ImageManagement/loadModel";
import { loadShellDecorationEditorData } from "../ShellDecorationEditor";
import { getDisplayPageAssetHealth } from "../../services/api";
import {
  parseWorkspaceRouteInputs,
  resolveWorkspaceLoadPlan,
  type WorkspaceLoadPlan,
  type WorkspaceRouteInputs,
  type WorkspaceType
} from "./workspaceLoadPlan";

type ShellDecorationEditorRouteData = {
  draft: ShellDecorationEnvelope;
  images: ImageAsset[];
};

let cachedShellDecorationEditorRouteData: ShellDecorationEditorRouteData | null = null;
let cachedEditorAssetHealthReport: DisplayPageAssetHealthReport | null | undefined;
let pendingShellDecorationEditorRouteRequest: Promise<ShellDecorationEditorRouteData | null> | null = null;
let pendingImageManagementModelRequest: Promise<unknown> | null = null;

export function clearDisplayPagesEditorRoutePreloadCache() {
  cachedShellDecorationEditorRouteData = null;
  cachedEditorAssetHealthReport = null;
  pendingShellDecorationEditorRouteRequest = null;
  pendingImageManagementModelRequest = null;
}

export type DisplayPagesEditorRouteLoaderData = WorkspaceRouteInputs;

export async function loadWorkspaceResources(
  plan: WorkspaceLoadPlan,
  requestedPageId?: string | null,
  retryOnlyResource?: "registry" | "imageModel" | "shellData" | null,
  onHealthLoaded?: (report: DisplayPageAssetHealthReport | null) => void
): Promise<void> {
  if (plan.needsRegistry && (!retryOnlyResource || retryOnlyResource === "registry")) {
    const pages = await loadDisplayPageRegistrySnapshot();
    const defs = pages.length > 0 ? buildRuntimePageDefinitions(pages) : runtimePageDefinitions;
    const selectedPage = defs.find((p) => p.id === requestedPageId) ?? defs[0];
    if (selectedPage && plan.needsPageDraft) {
      await loadDisplayPageConfigEnvelope(selectedPage.id as DisplayPageId, "draft");
    }
  }

  if (plan.needsImageModel && (!retryOnlyResource || retryOnlyResource === "imageModel")) {
    if (!pendingImageManagementModelRequest) {
      pendingImageManagementModelRequest = loadImageManagementModel().finally(() => {
        pendingImageManagementModelRequest = null;
      });
    }
    await pendingImageManagementModelRequest;
    if (plan.deferredHealth) {
      getDisplayPageAssetHealth()
        .then((report) => {
          cachedEditorAssetHealthReport = report;
          onHealthLoaded?.(report);
        })
        .catch((err) => {
          cachedEditorAssetHealthReport = null;
          console.warn("[DisplayPagesEditor] Deferred asset health check failed:", err);
          onHealthLoaded?.(null);
        });
    }
  }

  if (plan.needsShellData && (!retryOnlyResource || retryOnlyResource === "shellData")) {
    if (!cachedShellDecorationEditorRouteData) {
      if (!pendingShellDecorationEditorRouteRequest) {
        pendingShellDecorationEditorRouteRequest = loadShellDecorationEditorData()
          .then((data) => {
            cachedShellDecorationEditorRouteData = data;
            return data;
          })
          .finally(() => {
            pendingShellDecorationEditorRouteRequest = null;
          });
      }
      await pendingShellDecorationEditorRouteRequest;
    }
  }
}

export async function loadDisplayPagesEditorRoute({
  request
}: {
  request: Request;
}): Promise<DisplayPagesEditorRouteLoaderData> {
  const url = new URL(request.url);
  return parseWorkspaceRouteInputs(url.searchParams);
}

function useSafeLoaderData<T>(): T | undefined {
  try {
    return useLoaderData() as T;
  } catch {
    return undefined;
  }
}

export function DisplayPagesEditorWorkspaceHost({
  editMode,
  initialEditorState,
  onEditModeChange,
  renderPreview = true
}: {
  editMode: boolean;
  initialEditorState?: {
    editMode?: boolean;
    lockedRegionIds?: string[];
    selectedRegionId?: string | null;
  };
  onEditModeChange: (active: boolean) => void;
  renderPreview?: boolean;
}) {
  const registry = useDisplayPageRegistry();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [failedResource, setFailedResource] = useState<"registry" | "imageModel" | "shellData" | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const workspaceGenerationRef = useRef(0);

  const loaderData = useSafeLoaderData<DisplayPagesEditorRouteLoaderData>();
  const [searchParams] = useSearchParams();
  const {
    hasReturnContext,
    plan,
    requestedPageId,
    returnWorkspace,
    workspace
  } = useMemo(() => {
    if (!searchParams.toString() && loaderData) {
      return loaderData;
    }
    return parseWorkspaceRouteInputs(searchParams);
  }, [loaderData, searchParams]);

  const [imagesState, setImagesState] = useState<ImageAsset[] | undefined>(
    () => readCachedImageManagementModel()?.assets
  );
  const [assetHealthState, setAssetHealthState] = useState<
    DisplayPageAssetHealthReport | null | undefined
  >(() => cachedEditorAssetHealthReport);
  const [shellDataState, setShellDataState] = useState<
    ShellDecorationEditorRouteData | null
  >(() => cachedShellDecorationEditorRouteData);

  const pageDefinitions = useMemo(
    () => (registry.pages.length > 0 ? buildRuntimePageDefinitions(registry.pages) : runtimePageDefinitions),
    [registry.pages]
  );

  const loadResources = useCallback(async (retryTarget?: "registry" | "imageModel" | "shellData" | null) => {
    const currentGeneration = ++workspaceGenerationRef.current;
    setLoadError(null);
    try {
      await loadWorkspaceResources(
        plan,
        requestedPageId,
        retryTarget,
        (deferredReport) => {
          if (workspaceGenerationRef.current === currentGeneration) {
            setAssetHealthState(deferredReport);
          }
        }
      );
      if (workspaceGenerationRef.current !== currentGeneration) {
        return;
      }
      setImagesState(readCachedImageManagementModel()?.assets);
      setAssetHealthState(cachedEditorAssetHealthReport);
      setShellDataState(cachedShellDecorationEditorRouteData);
      setFailedResource(null);
    } catch (error) {
      if (workspaceGenerationRef.current !== currentGeneration) {
        return;
      }
      if (plan.needsShellData && !cachedShellDecorationEditorRouteData) {
        setFailedResource("shellData");
      } else if (plan.needsImageModel && !readCachedImageManagementModel()) {
        setFailedResource("imageModel");
      } else {
        setFailedResource("registry");
      }
      const msg = error instanceof Error ? error.message : String(error);
      setLoadError(msg);
    }
  }, [plan, requestedPageId]);

  useEffect(() => {
    loadResources();
  }, [loadResources, retryVersion]);

  const handleRetry = useCallback(() => {
    if (failedResource) {
      loadResources(failedResource);
    } else {
      setRetryVersion((v) => v + 1);
    }
  }, [failedResource, loadResources]);

  const initialImages = imagesState ?? readCachedImageManagementModel()?.assets;
  const initialShellDecorationData = shellDataState ?? cachedShellDecorationEditorRouteData;

  return (
    <div className="relative flex h-full w-full flex-col">
      {loadError && (
        <div
          role="alert"
          data-testid="workspace-resource-error-banner"
          className="flex items-center justify-between border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 z-10"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">工作區資源載入失敗：</span>
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            data-testid="workspace-resource-retry-button"
            onClick={handleRetry}
            className="rounded bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            重試
          </button>
        </div>
      )}
      <DisplayPagesEditor
        editMode={editMode}
        initialEditorState={initialEditorState}
        initialImages={initialImages}
        initialAssetHealthReport={assetHealthState ?? cachedEditorAssetHealthReport}
        initialShellDecorationDraft={initialShellDecorationData?.draft}
        initialShellDecorationImages={initialShellDecorationData?.images}
        onEditModeChange={onEditModeChange}
        pageDefinitions={pageDefinitions.length > 0 ? pageDefinitions : fallbackPageDefinitions}
        renderPreview={renderPreview}
      />
    </div>
  );
}

export function DisplayPagesEditorRoute({
  initialEditorState,
  renderPreview = true
}: {
  initialEditorState?: {
    editMode?: boolean;
    lockedRegionIds?: string[];
    selectedRegionId?: string | null;
  };
  renderPreview?: boolean;
}) {
  const [editMode, setEditMode] = useState(initialEditorState?.editMode ?? false);

  return (
    <ManagementShellFrame hideChrome={editMode}>
      <DisplayPagesEditorWorkspaceHost
        editMode={editMode}
        initialEditorState={initialEditorState}
        onEditModeChange={setEditMode}
        renderPreview={renderPreview}
      />
    </ManagementShellFrame>
  );
}
