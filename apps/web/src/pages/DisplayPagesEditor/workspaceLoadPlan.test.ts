import assert from "node:assert/strict";
import test from "node:test";
import {
  parseWorkspaceRouteInputs,
  resolveWorkspaceLoadPlan,
  type WorkspaceLoadPlanOptions
} from "./workspaceLoadPlan";

test("workspaceLoadPlan for editor requires registry and selected page draft, defers health and shell", () => {
  const plan = resolveWorkspaceLoadPlan({
    workspace: "editor"
  });

  assert.equal(plan.workspace, "editor");
  assert.equal(plan.needsRegistry, true);
  assert.equal(plan.needsPageDraft, true);
  assert.equal(plan.needsImageModel, false);
  assert.equal(plan.needsAssetHealth, false);
  assert.equal(plan.needsShellData, false);
});

test("workspaceLoadPlan for assets cold entry requires image model, defers health, and avoids page draft", () => {
  const plan = resolveWorkspaceLoadPlan({
    workspace: "assets",
    hasReturnContext: false
  });

  assert.equal(plan.workspace, "assets");
  assert.equal(plan.needsImageModel, true);
  assert.equal(plan.needsAssetHealth, false); // health is deferred / independent
  assert.equal(plan.deferredHealth, true);
  assert.equal(plan.needsPageDraft, false);
  assert.equal(plan.needsShellData, false);
});

test("workspaceLoadPlan for assets with editor return context preserves page draft requirement without blocking image model", () => {
  const plan = resolveWorkspaceLoadPlan({
    workspace: "assets",
    hasReturnContext: true,
    returnWorkspace: "editor"
  });

  assert.equal(plan.workspace, "assets");
  assert.equal(plan.needsImageModel, true);
  assert.equal(plan.deferredHealth, true);
  assert.equal(plan.needsPageDraft, true); // preserved for return
  assert.equal(plan.pageDraftBlocksContent, false); // but does not block assets presentation
});

test("workspaceLoadPlan for shell cold entry requires shell data and does not wait for page draft", () => {
  const plan = resolveWorkspaceLoadPlan({
    workspace: "shell"
  });

  assert.equal(plan.workspace, "shell");
  assert.equal(plan.needsShellData, true);
  assert.equal(plan.needsPageDraft, false);
  assert.equal(plan.needsImageModel, false);
});

test("parseWorkspaceRouteInputs correctly parses search parameters into load plan and inputs", () => {
  const params = new URLSearchParams("workspace=assets&assetContext=field-1&assetReturn=editor&page=solar");
  const inputs = parseWorkspaceRouteInputs(params);

  assert.equal(inputs.workspace, "assets");
  assert.equal(inputs.hasReturnContext, true);
  assert.equal(inputs.returnWorkspace, "editor");
  assert.equal(inputs.requestedPageId, "solar");
  assert.equal(inputs.plan.workspace, "assets");
  assert.equal(inputs.plan.needsImageModel, true);
  assert.equal(inputs.plan.needsPageDraft, true);

  const defaultInputs = parseWorkspaceRouteInputs(new URLSearchParams(""));
  assert.equal(defaultInputs.workspace, "editor");
  assert.equal(defaultInputs.hasReturnContext, false);
  assert.equal(defaultInputs.returnWorkspace, "editor");
  assert.equal(defaultInputs.requestedPageId, null);
  assert.equal(defaultInputs.plan.workspace, "editor");
});
