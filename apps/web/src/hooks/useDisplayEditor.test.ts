import assert from "node:assert/strict";
import test from "node:test";
import { isDisplayEditorToggleKey } from "./useDisplayEditor";

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
