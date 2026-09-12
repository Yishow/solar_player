export type WorkspaceType = "editor" | "assets" | "shell";

export type WorkspaceLoadPlanOptions = {
  workspace: WorkspaceType;
  hasReturnContext?: boolean;
  returnWorkspace?: "editor" | "shell";
};

export type WorkspaceLoadPlan = {
  workspace: WorkspaceType;
  needsRegistry: boolean;
  needsPageDraft: boolean;
  pageDraftBlocksContent: boolean;
  needsImageModel: boolean;
  needsAssetHealth: boolean;
  deferredHealth: boolean;
  needsShellData: boolean;
};

export function resolveWorkspaceLoadPlan(options: WorkspaceLoadPlanOptions): WorkspaceLoadPlan {
  const { workspace, hasReturnContext = false, returnWorkspace } = options;

  if (workspace === "assets") {
    const isReturningToEditor = hasReturnContext && returnWorkspace === "editor";
    return {
      workspace: "assets",
      needsRegistry: isReturningToEditor,
      needsPageDraft: isReturningToEditor,
      pageDraftBlocksContent: false,
      needsImageModel: true,
      needsAssetHealth: false,
      deferredHealth: true,
      needsShellData: false
    };
  }

  if (workspace === "shell") {
    return {
      workspace: "shell",
      needsRegistry: false,
      needsPageDraft: false,
      pageDraftBlocksContent: false,
      needsImageModel: false,
      needsAssetHealth: false,
      deferredHealth: false,
      needsShellData: true
    };
  }

  return {
    workspace: "editor",
    needsRegistry: true,
    needsPageDraft: true,
    pageDraftBlocksContent: true,
    needsImageModel: false,
    needsAssetHealth: false,
    deferredHealth: false,
    needsShellData: false
  };
}

export type WorkspaceRouteInputs = {
  hasReturnContext: boolean;
  plan: WorkspaceLoadPlan;
  requestedPageId: string | null;
  returnWorkspace: "editor" | "shell";
  workspace: WorkspaceType;
};

export function parseWorkspaceRouteInputs(
  searchParams: { get: (key: string) => string | null }
): WorkspaceRouteInputs {
  const workspaceParam = searchParams.get("workspace");
  const workspace: WorkspaceType =
    workspaceParam === "assets"
      ? "assets"
      : workspaceParam === "shell"
      ? "shell"
      : "editor";
  const hasReturnContext = Boolean(searchParams.get("assetContext"));
  const returnWorkspace =
    searchParams.get("assetReturn") === "shell" ? "shell" : "editor";
  const requestedPageId = searchParams.get("page");

  const plan = resolveWorkspaceLoadPlan({
    workspace,
    hasReturnContext,
    returnWorkspace
  });

  return {
    hasReturnContext,
    plan,
    requestedPageId,
    returnWorkspace,
    workspace
  };
}
