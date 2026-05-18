import assert from "node:assert/strict";
import test from "node:test";
import {
  isDisplayEditorHistoryKey,
  isDisplayEditorNudgeKey,
  isDisplayEditorToggleKey
} from "./useDisplayEditor";

test("display editor toggle shortcut only reacts to plain E presses outside form fields", () => {
  assert.equal(
    isDisplayEditorToggleKey({
      key: "e",
      targetTagName: "DIV"
    }),
    true
  );
  assert.equal(
    isDisplayEditorToggleKey({
      key: "E",
      targetTagName: "BUTTON"
    }),
    true
  );
  assert.equal(
    isDisplayEditorToggleKey({
      key: "e",
      metaKey: true,
      targetTagName: "DIV"
    }),
    false
  );
  assert.equal(
    isDisplayEditorToggleKey({
      key: "e",
      targetTagName: "INPUT"
    }),
    false
  );
});

test("display editor nudge shortcut only reacts to arrow keys outside form fields", () => {
  assert.equal(
    isDisplayEditorNudgeKey({
      key: "ArrowRight",
      targetTagName: "DIV"
    }),
    true
  );
  assert.equal(
    isDisplayEditorNudgeKey({
      key: "ArrowLeft",
      targetTagName: "TEXTAREA"
    }),
    false
  );
  assert.equal(
    isDisplayEditorNudgeKey({
      ctrlKey: true,
      key: "ArrowUp",
      targetTagName: "DIV"
    }),
    false
  );
});

test("display editor history shortcut distinguishes undo and redo", () => {
  assert.equal(
    isDisplayEditorHistoryKey({
      key: "z",
      metaKey: true,
      shiftKey: false,
      targetTagName: "DIV"
    }),
    "undo"
  );
  assert.equal(
    isDisplayEditorHistoryKey({
      key: "z",
      metaKey: true,
      shiftKey: true,
      targetTagName: "DIV"
    }),
    "redo"
  );
  assert.equal(
    isDisplayEditorHistoryKey({
      key: "z",
      targetTagName: "INPUT"
    }),
    null
  );
});
