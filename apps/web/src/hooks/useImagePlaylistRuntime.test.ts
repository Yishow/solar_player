import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = readFileSync(path.join(import.meta.dirname, "useImagePlaylistRuntime.ts"), "utf8");

test("image playlist runtime hook hydrates from the pure read playlist contract", () => {
  assert.match(source, /fetchImagePlaylist\(activeIndex\)/);
  assert.equal(source.includes("bootstrap: true"), false);
});

test("image playlist runtime hook accepts an optional initial playlist for staged hydration", () => {
  assert.match(source, /initialPayload\?: ImagePlaylistRuntimePayload \| null/);
  assert.match(source, /initialPayload:\s*options\?\.initialPayload/);
});
