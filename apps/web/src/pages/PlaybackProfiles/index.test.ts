import assert from "node:assert/strict";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import test from "node:test";
import type {
  PlaybackProfileDraft,
  PlaybackProfilePreview,
  PlaybackProfileSummary
} from "@solar-display/shared";
import { PlaybackProfileDraftConflictError } from "../../services/api";
import { PlaybackProfilesContent } from "./PlaybackProfilesContent";
import { PlaybackProfilePreviewPanel } from "./PlaybackProfilePreviewPanel";
import {
  createProfileRequestGuard,
  isProfileDraftDirty
} from "./viewModel";

test("profile request guard rejects a late response after Profile switching", () => {
  const guard = createProfileRequestGuard();
  const profileARequest = guard.begin();
  const profileBRequest = guard.begin();

  assert.equal(guard.isCurrent(profileARequest), false);
  assert.equal(guard.isCurrent(profileBRequest), true);
});

test("Preview component renders CL and KN effective, skipped, and diagnostic details", () => {
  const page = {
    displayOrder: 1,
    durationSeconds: 15,
    enabled: true,
    id: 1,
    labelEn: "Overview",
    labelZh: "總覽",
    pageKey: "overview",
    route: "/overview",
    templateKey: "overview" as const
  };
  const preview = {
    cl: {
      configured: [page],
      diagnostics: {
        fallback: [],
        freshness: ["overview:stale-runtime"],
        readiness: [],
        site: []
      },
      effective: [],
      siteScope: "cl",
      skipped: [{
        ...page,
        detail: "runtime data is stale",
        skipReason: "stale-runtime"
      }]
    },
    kn: {
      configured: [page],
      diagnostics: {
        fallback: [],
        freshness: [],
        readiness: ["overview:data-not-ready"],
        site: []
      },
      effective: [page],
      siteScope: "kn",
      skipped: []
    },
    profileId: 2,
    revision: 4
  } satisfies PlaybackProfilePreview;

  const html = renderToStaticMarkup(
    createElement(PlaybackProfilePreviewPanel, { preview })
  );
  assert.match(html, /CL Preview/u);
  assert.match(html, /KN Preview/u);
  assert.match(html, /跳過：總覽 · stale-runtime/u);
  assert.match(html, /runtime data is stale/u);
  assert.match(html, /overview:data-not-ready/u);
  assert.match(html, /有效：總覽/u);
});

const profile: PlaybackProfileSummary = {
  archivedAt: null,
  id: 2,
  isDefault: false,
  name: "Operations",
  profileKey: "operations"
};

const draft: PlaybackProfileDraft = {
  pages: [{
    displayOrder: 1,
    durationSeconds: 15,
    enabled: true,
    id: 1,
    labelEn: "Overview",
    labelZh: "總覽",
    pageKey: "overview",
    route: "/overview",
    templateKey: "overview"
  }],
  profileId: 2,
  revision: 4,
  settings: {
    autoplay: true,
    brightness: 100,
    enforceFreshRuntimeData: true,
    idleMode: "disabled",
    idleTimeout: 300,
    loop: true,
    orientation: "landscape",
    repeatDays: [1, 2, 3, 4, 5],
    scheduleEnabled: false,
    scheduleEnd: "18:00",
    scheduleStart: "08:00",
    startPage: 1,
    transitionSpeed: 250,
    transitionType: "fade",
    updatedAt: "2026-07-30T00:00:00.000Z"
  },
  updatedAt: "2026-07-30T00:00:00.000Z"
};

async function withRenderedProfiles(
  run: (input: {
    document: Document;
    getDraftCalls: () => number;
    getPublishCalls: () => number;
  }) => Promise<void>,
  options: { staleSave?: boolean } = {}
) {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "http://127.0.0.1/", pretendToBeVisual: true }
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: dom.window
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: dom.window.document
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator
  });
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: dom.window.HTMLElement
  });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let draftCalls = 0;
  let publishCalls = 0;
  const profileApi = {
    archivePlaybackProfile: async () => profile,
    createPlaybackProfile: async () => profile,
    getPlaybackProfileDraft: async () => {
      draftCalls += 1;
      return draft;
    },
    getPlaybackProfiles: async () => [profile],
    getPlaybackProfileVersions: async () => [],
    previewPlaybackProfile: async () => ({} as PlaybackProfilePreview),
    publishPlaybackProfile: async () => {
      publishCalls += 1;
      return {} as never;
    },
    renamePlaybackProfile: async () => profile,
    rollbackPlaybackProfile: async () => ({} as never),
    savePlaybackProfileDraft: async () => {
      if (options.staleSave) {
        throw new PlaybackProfileDraftConflictError(
          "stale",
          409,
          { code: "profile_draft_conflict", currentRevision: 7 },
          7
        );
      }
      return draft;
    }
  };
  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(createElement(PlaybackProfilesContent, {
        loaderData: { loadError: "", profiles: [profile] },
        profileApi
      }));
      await Promise.resolve();
      await Promise.resolve();
    });
    await run({
      document: dom.window.document,
      getDraftCalls: () => draftCalls,
      getPublishCalls: () => publishCalls
    });
  } finally {
    await act(async () => root?.unmount());
    dom.window.close();
  }
}

function findButton(document: Document, label: string) {
  return [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find((button) => button.textContent?.trim() === label)!;
}

test("stale Draft save reloads the current revision and displays conflict guidance", async () => {
  await withRenderedProfiles(async ({ document, getDraftCalls }) => {
    await act(async () => {
      findButton(document, "儲存 Draft").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(getDraftCalls(), 2);
    assert.match(document.body.textContent ?? "", /revision 7，已重新載入/u);
  }, { staleSave: true });
});

test("Publish confirmation cancellation prevents the API call and confirmation allows it", async () => {
  await withRenderedProfiles(async ({ document, getPublishCalls }) => {
    domConfirm(false);
    await act(async () => findButton(document, "發布 Version").click());
    assert.equal(getPublishCalls(), 0);

    domConfirm(true);
    await act(async () => {
      findButton(document, "發布 Version").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(getPublishCalls(), 1);
  });
});

test("unsaved Draft detection distinguishes local edits from the persisted baseline", () => {
  assert.equal(isProfileDraftDirty(draft, draft), false);
  assert.equal(isProfileDraftDirty({
    ...draft,
    settings: { ...draft.settings, brightness: 73 }
  }, draft), true);
});

function domConfirm(result: boolean) {
  Object.defineProperty(window, "confirm", {
    configurable: true,
    value: () => result
  });
}
