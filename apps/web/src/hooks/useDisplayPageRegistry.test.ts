import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { DisplayPageInstance } from "@solar-display/shared";
import {
  clearDisplayPageRegistrySnapshot,
  getActiveDisplayPageRegistrySnapshot,
  loadDisplayPageRegistrySnapshot
} from "./useDisplayPageRegistry";

const registryHookSource = readFileSync(
  path.join(import.meta.dirname, "useDisplayPageRegistry.ts"),
  "utf8"
);

function createPage(
  overrides: Partial<DisplayPageInstance> & Pick<DisplayPageInstance, "id" | "pageKey" | "route" | "routeSlug" | "templateKey">
): DisplayPageInstance {
  return {
    archivedAt: null,
    createdAt: "2026-05-20T00:00:00.000Z",
    displayNameEn: "Overview",
    displayNameZh: "總覽",
    displayOrder: 1,
    draftVersion: 1,
    durationSeconds: 15,
    enabled: true,
    hasDraftChanges: false,
    lastPublishedAt: "2026-05-20T00:00:00.000Z",
    liveVersion: 1,
    updatedAt: "2026-05-20T00:00:00.000Z",
    ...overrides
  };
}

test("display page registry snapshot loader shares an in-flight request", async () => {
  clearDisplayPageRegistrySnapshot();
  let readCount = 0;
  let resolveRead: ((pages: DisplayPageInstance[]) => void) | null = null;
  const readRegistry = () => {
    readCount += 1;
    return new Promise<DisplayPageInstance[]>((resolve) => {
      resolveRead = resolve;
    });
  };

  const firstLoad = loadDisplayPageRegistrySnapshot({ readRegistry });
  const secondLoad = loadDisplayPageRegistrySnapshot({ readRegistry });

  assert.equal(readCount, 1);
  const completeRead = resolveRead as ((pages: DisplayPageInstance[]) => void) | null;
  assert.ok(completeRead);
  completeRead([
    createPage({
      id: 1,
      pageKey: "overview",
      route: "/overview",
      routeSlug: "overview",
      templateKey: "overview"
    })
  ]);

  const [firstPages, secondPages] = await Promise.all([firstLoad, secondLoad]);

  assert.equal(firstPages[0]?.pageKey, "overview");
  assert.equal(secondPages[0]?.pageKey, "overview");
  assert.equal(getActiveDisplayPageRegistrySnapshot()?.[0]?.pageKey, "overview");
});

test("display page registry snapshot loader force reloads after display sync invalidation", async () => {
  clearDisplayPageRegistrySnapshot();
  let readCount = 0;
  const overview = createPage({
    id: 1,
    pageKey: "overview",
    route: "/overview",
    routeSlug: "overview",
    templateKey: "overview"
  });
  const solar = createPage({
    id: 2,
    pageKey: "solar",
    route: "/solar",
    routeSlug: "solar",
    templateKey: "solar"
  });
  const readRegistry = async () => {
    readCount += 1;
    return readCount === 1 ? [overview] : [solar];
  };

  assert.equal((await loadDisplayPageRegistrySnapshot({ readRegistry }))[0]?.pageKey, "overview");
  assert.equal((await loadDisplayPageRegistrySnapshot({ readRegistry }))[0]?.pageKey, "overview");
  assert.equal(readCount, 1);

  assert.equal(
    (await loadDisplayPageRegistrySnapshot({ force: true, readRegistry }))[0]?.pageKey,
    "solar"
  );
  assert.equal(readCount, 2);
  assert.equal(getActiveDisplayPageRegistrySnapshot()?.[0]?.pageKey, "solar");
  assert.match(registryHookSource, /useDisplaySyncRefresh\(reload,\s*\["display-pages"\]\)/);
  assert.match(registryHookSource, /load\(\{\s*force:\s*true\s*\}\)/);
});

test("display page registry hook ignores stale loads after a newer sync reload starts", () => {
  assert.match(registryHookSource, /const requestIdRef = useRef\(0\)/);
  assert.match(registryHookSource, /requestId !== requestIdRef\.current/);
  assert.match(registryHookSource, /requestId === requestIdRef\.current/);
});
