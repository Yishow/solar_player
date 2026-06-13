import React, { useMemo, useState } from "react";
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
import { buildRuntimePageDefinitions } from "./runtimePageDefinitions";
import { runtimePageDefinitions } from "./runtimePageDefinitions";
import { DisplayPagesEditor } from "./index";
import {
  loadImageManagementModel,
  readCachedImageManagementModel
} from "../ImageManagement/loadModel";
import { loadShellDecorationEditorData } from "../ShellDecorationEditor";
import { getDisplayPageAssetHealth } from "../../services/api";

type ShellDecorationEditorRouteData = {
  draft: ShellDecorationEnvelope;
  images: ImageAsset[];
};

let cachedShellDecorationEditorRouteData: ShellDecorationEditorRouteData | null = null;
let cachedEditorAssetHealthReport: DisplayPageAssetHealthReport | null | undefined;

function readCachedShellDecorationEditorRouteData() {
  return cachedShellDecorationEditorRouteData;
}

export async function loadDisplayPagesEditorRoute({ request }: { request: Request }) {
  const url = new URL(request.url);

  try {
    const registryPages = await loadDisplayPageRegistrySnapshot();
    const pageDefinitions = registryPages.length > 0
      ? buildRuntimePageDefinitions(registryPages)
      : runtimePageDefinitions;
    const requestedPageId = url.searchParams.get("page");
    const selectedPage =
      pageDefinitions.find((page) => page.id === requestedPageId) ??
      pageDefinitions[0];

    if (selectedPage) {
      await loadDisplayPageConfigEnvelope(selectedPage.id as DisplayPageId, "draft");
    }
  } catch {
    // The editor component falls back to its existing inline loading path.
  }

  const workspace = url.searchParams.get("workspace");
  if (workspace === "assets") {
    try {
      await loadImageManagementModel();
    } catch {
      // Asset workspace keeps its existing embedded loader fallback.
    }

    try {
      cachedEditorAssetHealthReport = await getDisplayPageAssetHealth();
    } catch {
      cachedEditorAssetHealthReport = undefined;
    }
  }

  if (workspace === "shell") {
    try {
      cachedShellDecorationEditorRouteData = await loadShellDecorationEditorData();
    } catch {
      // Shell workspace keeps its existing embedded loader fallback.
    }
  }

  return null;
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
  const registry = useDisplayPageRegistry();
  const [editMode, setEditMode] = useState(initialEditorState?.editMode ?? false);
  const initialImages = readCachedImageManagementModel()?.assets;
  const initialAssetHealthReport = cachedEditorAssetHealthReport;
  const initialShellDecorationData = readCachedShellDecorationEditorRouteData();
  const pageDefinitions = useMemo(
    () => (registry.pages.length > 0 ? buildRuntimePageDefinitions(registry.pages) : runtimePageDefinitions),
    [registry.pages]
  );

  return (
    <ManagementShellFrame hideChrome={editMode}>
      <DisplayPagesEditor
        editMode={editMode}
        initialEditorState={initialEditorState}
        initialImages={initialImages}
        initialAssetHealthReport={initialAssetHealthReport}
        initialShellDecorationDraft={initialShellDecorationData?.draft}
        initialShellDecorationImages={initialShellDecorationData?.images}
        onEditModeChange={setEditMode}
        pageDefinitions={pageDefinitions.length > 0 ? pageDefinitions : fallbackPageDefinitions}
        renderPreview={renderPreview}
      />
    </ManagementShellFrame>
  );
}
