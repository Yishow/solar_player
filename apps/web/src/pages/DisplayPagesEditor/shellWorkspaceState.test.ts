import assert from "node:assert/strict";
import test from "node:test";
import type { ShellDecorationEnvelope } from "@solar-display/shared";
import {
  commitShellWorkspaceDraft,
  createShellWorkspaceState,
  isShellWorkspaceDirty,
  updateShellWorkspaceDraft
} from "./shellWorkspaceState";

const initialDraft: ShellDecorationEnvelope = {
  footerObjects: [],
  headerObjects: [{
    frame: { height: 2, left: 86, top: 24, width: 320 },
    id: "header-line",
    locked: false,
    metadata: {},
    mount: "header",
    source: { kind: "line" },
    style: { color: "#d2b46a", thickness: 2 },
    type: "line",
    visible: true,
    zIndex: 1
  }],
  publishedAt: null,
  publishedBy: null,
  stage: "draft",
  updatedAt: "2026-09-12T00:00:00.000Z",
  version: 3
};

test("shell workspace dirty compares editable objects while ignoring envelope metadata", () => {
  const state = createShellWorkspaceState(initialDraft);
  const metadataOnly = {
    ...initialDraft,
    updatedAt: "2026-09-12T00:01:00.000Z",
    version: 4
  };

  assert.equal(isShellWorkspaceDirty(updateShellWorkspaceDraft(state, metadataOnly)), false);
});

test("shell workspace draft edits preserve the last saved channel until a successful commit", () => {
  const state = createShellWorkspaceState(initialDraft);
  const editedDraft: ShellDecorationEnvelope = {
    ...initialDraft,
    headerObjects: initialDraft.headerObjects.map((object) => ({
      ...object,
      frame: { ...object.frame, width: 420 }
    }))
  };

  const editedState = updateShellWorkspaceDraft(state, editedDraft);
  assert.equal(isShellWorkspaceDirty(editedState), true);
  assert.deepEqual(editedState.savedChannel, {
    footerObjects: [],
    headerObjects: initialDraft.headerObjects
  });
});

test("shell workspace successful save replaces both draft and editable baseline", () => {
  const state = createShellWorkspaceState(initialDraft);
  const savedDraft: ShellDecorationEnvelope = {
    ...initialDraft,
    updatedAt: "2026-09-12T00:01:00.000Z",
    version: 4
  };

  const committed = commitShellWorkspaceDraft(state, savedDraft);
  assert.equal(committed.draft, savedDraft);
  assert.equal(isShellWorkspaceDirty(committed), false);
});

test("a pending response advances the baseline and version without discarding newer edits", () => {
  const state = createShellWorkspaceState(initialDraft);
  const edited = {
    ...initialDraft,
    headerObjects: initialDraft.headerObjects.map((object) => ({ ...object, frame: { ...object.frame, width: 420 } }))
  };
  const saved = { ...initialDraft, version: 4, updatedAt: "2026-09-12T00:01:00.000Z" };
  const committed = commitShellWorkspaceDraft(updateShellWorkspaceDraft(state, edited), saved, initialDraft);
  assert.deepEqual(committed.draft?.headerObjects, edited.headerObjects);
  assert.deepEqual(committed.savedChannel?.headerObjects, initialDraft.headerObjects);
  assert.equal(committed.draft?.version, 4);
  assert.equal(isShellWorkspaceDirty(committed), true);
});

test("an older response after remount cannot downgrade a newer saved baseline", () => {
  const saved = {
    ...initialDraft,
    version: 5,
    headerObjects: initialDraft.headerObjects.map((object) => ({ ...object, frame: { ...object.frame, width: 420 } }))
  };
  const state = createShellWorkspaceState(saved);
  assert.equal(commitShellWorkspaceDraft(state, { ...initialDraft, version: 4 }, initialDraft), state);
  assert.equal(isShellWorkspaceDirty(state), false);
});
