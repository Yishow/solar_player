import assert from "node:assert/strict";
import test from "node:test";
import {
  createEditorHistory,
  pushEditorHistory,
  redoEditorHistory,
  undoEditorHistory
} from "./history";

test("undo restores the previous unsaved rectangle and redo reapplies it", () => {
  const initial = { left: 100, top: 120, width: 320, height: 180 };
  const resized = { left: 100, top: 120, width: 360, height: 180 };
  const moved = { left: 132, top: 120, width: 360, height: 180 };
  const history = pushEditorHistory(pushEditorHistory(createEditorHistory<typeof initial>(), initial, resized), resized, moved);

  const undone = undoEditorHistory(history, moved);
  assert.deepEqual(undone.current, resized);

  const redone = redoEditorHistory(undone.history, undone.current);
  assert.deepEqual(redone.current, moved);
});

test("recording a new edit after undo clears the redo branch", () => {
  const initial = { left: 100, top: 120, width: 320, height: 180 };
  const resized = { left: 100, top: 120, width: 360, height: 180 };
  const moved = { left: 132, top: 120, width: 360, height: 180 };
  const history = pushEditorHistory(pushEditorHistory(createEditorHistory<typeof initial>(), initial, resized), resized, moved);

  const undone = undoEditorHistory(history, moved);
  const branched = pushEditorHistory(undone.history, undone.current, {
    ...undone.current,
    top: 148
  });

  assert.equal(branched.future.length, 0);
});
