import assert from "node:assert/strict";
import test from "node:test";
import { offlineAssetMap, offlineBackgroundLayout, offlinePanelLayout } from "./layout";

test("offline layout centralizes the error surface geometry and fallback asset", () => {
  assert.deepEqual(offlineBackgroundLayout, {
    height: 944,
    left: 960,
    top: 136,
    width: 960
  });
  assert.deepEqual(offlinePanelLayout, {
    left: 200,
    top: 174,
    width: 760
  });
  assert.match(offlineAssetMap.background.src, /offline-bg-ref\.jpg$/);
});
