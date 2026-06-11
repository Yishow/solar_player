import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveDisplayPageRuntimeRefreshSpec } from "../pages/runtimeRefreshRegistry";

const source = readFileSync(path.join(import.meta.dirname, "useImagePlaylistRuntime.ts"), "utf8");

test("image playlist runtime hook hydrates from the pure read playlist contract", () => {
  assert.match(source, /fetchImagePlaylist\(\)/);
  assert.doesNotMatch(source, /activeIndex/);
  assert.equal(source.includes("bootstrap: true"), false);
});

test("image playlist runtime hook accepts an optional initial playlist for staged hydration", () => {
  assert.match(source, /initialPayload\?: ImagePlaylistRuntimePayload \| null/);
  assert.match(source, /initialPayload:\s*options\?\.initialPayload/);
});

test("image playlist runtime refresh key does not change with local active index", () => {
  assert.equal(
    resolveDisplayPageRuntimeRefreshSpec("images", { activeIndex: 0 }).refreshKey,
    resolveDisplayPageRuntimeRefreshSpec("images", { activeIndex: 3 }).refreshKey
  );
});
