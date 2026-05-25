import assert from "node:assert/strict";
import test from "node:test";
import type { DisplaySyncEvent, PublicShellDecorationConfig, ShellDecorationObject } from "@solar-display/shared";
import {
  createUseShellDecorations,
  resolveShellDecorationRuntimePayload,
  shouldRefreshShellDecorationsForDisplaySync
} from "./useShellDecorations";

function lineObject(id: string, zIndex: number): ShellDecorationObject {
  return {
    frame: { height: 2, left: 86, top: 76, width: 642 },
    id,
    locked: false,
    metadata: {},
    mount: "header",
    source: { kind: "line" },
    style: {},
    type: "line",
    visible: true,
    zIndex
  };
}

test("resolveShellDecorationRuntimePayload sorts live objects and falls back to deterministic empty bands", () => {
  assert.deepEqual(resolveShellDecorationRuntimePayload(null), {
    footerObjects: [],
    headerObjects: []
  });

  const payload: PublicShellDecorationConfig = {
    footerObjects: [],
    headerObjects: [lineObject("second", 5), lineObject("first", 1)],
    updatedAt: "2026-05-26T00:00:00.000Z",
    version: 2
  };

  assert.deepEqual(
    resolveShellDecorationRuntimePayload(payload).headerObjects.map((object) => object.id),
    ["first", "second"]
  );
});

test("useShellDecorations wires one public runtime loader and refreshes on shared shell publish sync", async () => {
  const payload: PublicShellDecorationConfig = {
    footerObjects: [],
    headerObjects: [lineObject("line-b", 5), lineObject("line-a", 1)],
    updatedAt: "2026-05-26T00:00:00.000Z",
    version: 3
  };
  const loadCalls: string[] = [];
  let captured:
    | {
        enabled: boolean;
        load: () => Promise<PublicShellDecorationConfig>;
        refreshKey: string;
        shouldRefresh: (event: DisplaySyncEvent) => boolean;
      }
    | undefined;

  const useShellDecorations = createUseShellDecorations({
    load: async () => {
      loadCalls.push("load");
      return payload;
    },
    useRuntimeRefresh: (options) => {
      captured = options;
      return {
        errorMessage: "",
        isLoading: false,
        isRefreshing: false,
        lastResolvedAt: "2026-05-26T01:00:00.000Z",
        payload,
        refresh: async () => {},
        usesFallback: false
      };
    }
  });

  const state = useShellDecorations();

  assert.ok(captured);
  assert.equal(captured.enabled, true);
  assert.equal(captured.refreshKey, "shell-decorations");
  assert.equal(shouldRefreshShellDecorationsForDisplaySync({ scope: "display-pages" }), true);
  assert.equal(captured.shouldRefresh({ generatedAt: "", reason: "", scope: "display-pages" }), true);
  assert.equal(captured.shouldRefresh({ generatedAt: "", reason: "", scope: "brand" }), false);
  assert.deepEqual(
    state.headerObjects.map((object) => object.id),
    ["line-a", "line-b"]
  );

  const loadedPayload = await captured.load();
  assert.equal(loadCalls.length, 1);
  assert.deepEqual(loadedPayload, payload);
});
