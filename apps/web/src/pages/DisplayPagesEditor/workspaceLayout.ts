export const DEFAULT_LEFT_PANEL_WIDTH = 240;
export const DEFAULT_RIGHT_PANEL_WIDTH = 320;
export const MIN_PANEL_WIDTH = 200;
export const MAX_PANEL_WIDTH = 480;
export const SMALL_DESKTOP_WIDTH = 1366;

export type EditorWorkspaceLayout = {
  canvasGridTemplate: string;
  leftCollapsed: boolean;
  leftWidth: number;
  rightCollapsed: boolean;
  rightWidth: number;
  useDrawer: boolean;
};

export type AssetPickerSession = {
  dirty: boolean;
  open: boolean;
  pageId: string;
  selectedItemId: string | null;
  zoom: number;
};

export type DualSaveState = {
  pageDirty: boolean;
  shellDirty: boolean;
};

export function clampPanelWidth(width: number) {
  return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width));
}

export function resolveEditorWorkspaceLayout({
  leftCollapsed = false,
  leftWidth = DEFAULT_LEFT_PANEL_WIDTH,
  rightCollapsed = false,
  rightWidth = DEFAULT_RIGHT_PANEL_WIDTH,
  viewportWidth
}: {
  leftCollapsed?: boolean;
  leftWidth?: number;
  rightCollapsed?: boolean;
  rightWidth?: number;
  viewportWidth: number;
}): EditorWorkspaceLayout {
  const useDrawer = viewportWidth <= SMALL_DESKTOP_WIDTH;
  const nextLeftCollapsed = leftCollapsed || useDrawer;
  const nextRightCollapsed = rightCollapsed;
  const resolvedLeft = nextLeftCollapsed ? 0 : clampPanelWidth(leftWidth);
  const resolvedRight = nextRightCollapsed ? 0 : clampPanelWidth(rightWidth);
  return {
    canvasGridTemplate: `${resolvedLeft}px minmax(0, 1fr) ${resolvedRight}px`,
    leftCollapsed: nextLeftCollapsed,
    leftWidth: resolvedLeft,
    rightCollapsed: nextRightCollapsed,
    rightWidth: resolvedRight,
    useDrawer
  };
}

export function preserveStoredGeometry<T>(geometry: T, _layout: EditorWorkspaceLayout): T {
  return geometry;
}

export function openAssetPickerSession(context: Omit<AssetPickerSession, "open">): AssetPickerSession {
  return { ...context, open: true };
}

export function cancelAssetPickerSession(session: AssetPickerSession): AssetPickerSession {
  return {
    dirty: session.dirty,
    open: false,
    pageId: session.pageId,
    selectedItemId: session.selectedItemId,
    zoom: session.zoom
  };
}

export function applyAssetPickerSession(
  session: AssetPickerSession,
  appliedItemId: string
): AssetPickerSession {
  return {
    dirty: true,
    open: false,
    pageId: session.pageId,
    selectedItemId: appliedItemId,
    zoom: session.zoom
  };
}

export function afterPageSave(state: DualSaveState): DualSaveState {
  return { pageDirty: false, shellDirty: state.shellDirty };
}

export function afterShellSave(state: DualSaveState): DualSaveState {
  return { pageDirty: state.pageDirty, shellDirty: false };
}

export function remoteRevisionAction(localDirty: boolean, remoteVersion: number, localVersion: number) {
  if (!localDirty || remoteVersion <= localVersion) {
    return "ignore" as const;
  }
  return "prompt-compare-or-reload" as const;
}

export function inspectorPrimarySections(args: {
  hasAssetFields: boolean;
  hasDataBinding: boolean;
  isFixedTemplate: boolean;
}): Array<"content" | "data" | "appearance" | "constraint"> {
  const sections: Array<"content" | "data" | "appearance" | "constraint"> = ["content", "appearance"];
  if (args.hasDataBinding) {
    sections.splice(1, 0, "data");
  }
  if (args.isFixedTemplate) {
    sections.push("constraint");
  }
  return sections;
}
