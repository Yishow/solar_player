import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const viteConfigSource = readFileSync(path.join(import.meta.dirname, "../vite.config.ts"), "utf8");

test("vite dev server proxies backend API, uploads, and socket traffic for same-origin remote sessions", () => {
  assert.match(viteConfigSource, /proxy:\s*\{/);
  assert.match(viteConfigSource, /"\/api"/);
  assert.match(viteConfigSource, /"\/socket\.io"/);
  assert.match(viteConfigSource, /"\/uploads"/);
  assert.match(viteConfigSource, /resolveDevPorts\(/);
  assert.doesNotMatch(viteConfigSource, /target:\s*"http:\/\/127\.0\.0\.1:3000"/);
  assert.match(viteConfigSource, /ws:\s*true/);
  assert.doesNotMatch(viteConfigSource, /changeOrigin:\s*true/);
});
