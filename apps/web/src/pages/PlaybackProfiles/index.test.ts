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

function domPrompt(result: string) {
  Object.defineProperty(window, "prompt", {
    configurable: true,
    value: () => result
  });
}

async function settleProfiles() {
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function sidebarProfileNames(document: Document) {
  return [...document.querySelectorAll(".profile-list-sidebar strong")].map((element) => element.textContent);
}

const createdProfile: PlaybackProfileSummary = {
  archivedAt: null,
  id: 3,
  isDefault: false,
  name: "Night Shift",
  profileKey: "night-shift"
};

// Renders the content with a scripted catalog: each Profile list read takes the
// next entry of `catalogReads`, and `published` records what reached the
// optional Fleet subscriber.
async function withProfileCatalog(
  run: (input: {
    counts: { catalogReads: number; creates: number };
    document: Document;
    published: PlaybackProfileSummary[][];
  }) => Promise<void>,
  options: {
    catalogReads: Array<() => Promise<PlaybackProfileSummary[]>>;
    createPlaybackProfile: () => Promise<PlaybackProfileSummary>;
    subscribe: boolean;
  }
) {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "http://127.0.0.1/", pretendToBeVisual: true }
  );
  for (const [key, value] of Object.entries({
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    navigator: dom.window.navigator,
    window: dom.window
  })) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const counts = { catalogReads: 0, creates: 0 };
  const published: PlaybackProfileSummary[][] = [];
  const profileApi = {
    archivePlaybackProfile: async () => profile,
    createPlaybackProfile: async () => {
      counts.creates += 1;
      return options.createPlaybackProfile();
    },
    getPlaybackProfileDraft: async () => draft,
    getPlaybackProfiles: async () => {
      const read = options.catalogReads[counts.catalogReads];
      counts.catalogReads += 1;
      assert.ok(read, "unexpected extra Profile catalog read");
      return read();
    },
    getPlaybackProfileVersions: async () => [],
    previewPlaybackProfile: async () => ({} as PlaybackProfilePreview),
    publishPlaybackProfile: async () => ({} as never),
    renamePlaybackProfile: async () => profile,
    rollbackPlaybackProfile: async () => ({} as never),
    savePlaybackProfileDraft: async () => draft
  };
  let root: Root | null = null;
  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(createElement(PlaybackProfilesContent, {
        loaderData: { loadError: "", profiles: [profile] },
        ...(options.subscribe
          ? { onProfilesRefreshed: (profiles: PlaybackProfileSummary[]) => published.push(profiles) }
          : {}),
        profileApi
      }));
      await settleProfiles();
    });
    await run({ counts, document: dom.window.document, published });
  } finally {
    await act(async () => root?.unmount());
    dom.window.close();
  }
}

async function clickAndSettle(button: HTMLButtonElement) {
  await act(async () => {
    button.click();
    await settleProfiles();
  });
}

test("a failed catalog refresh after a successful create keeps the last catalog and retries only the catalog read", async () => {
  await withProfileCatalog(async ({ counts, document, published }) => {
    domPrompt("Night Shift");
    await clickAndSettle(findButton(document, "＋ 新增 Profile"));

    assert.equal(counts.creates, 1);
    assert.deepEqual(sidebarProfileNames(document), ["Operations"], "the last successful catalog stays visible");
    assert.match(document.body.textContent ?? "", /catalog read failed/u);
    assert.deepEqual(published, [], "a failed refresh publishes nothing");
    const reload = findButton(document, "重新載入清單");
    assert.ok(reload, "a reload-catalog action is offered after the refresh failure");

    await clickAndSettle(reload);
    assert.equal(counts.creates, 1, "the catalog retry must not repeat the successful create");
    assert.equal(counts.catalogReads, 2);
    assert.deepEqual(sidebarProfileNames(document), ["Operations", "Night Shift"]);
    assert.deepEqual(published, [[profile, createdProfile]]);
    assert.equal(findButton(document, "重新載入清單"), undefined, "a successful reload clears the retry state");
  }, {
    catalogReads: [
      async () => {
        throw new Error("catalog read failed");
      },
      async () => [profile, createdProfile]
    ],
    createPlaybackProfile: async () => createdProfile,
    subscribe: true
  });
});

test("a successful empty catalog reload is published as the authoritative catalog", async () => {
  await withProfileCatalog(async ({ document, published }) => {
    domPrompt("Night Shift");
    await clickAndSettle(findButton(document, "＋ 新增 Profile"));
    assert.deepEqual(published, []);

    await clickAndSettle(findButton(document, "重新載入清單"));
    assert.deepEqual(published, [[]], "a valid empty catalog is published, unlike a failed read");
    assert.deepEqual(sidebarProfileNames(document), []);
    assert.equal(findButton(document, "重新載入清單"), undefined);
  }, {
    catalogReads: [
      async () => {
        throw new Error("catalog read failed");
      },
      async () => []
    ],
    createPlaybackProfile: async () => createdProfile,
    subscribe: true
  });
});

test("a failed Profile mutation neither publishes a catalog nor offers a catalog reload", async () => {
  await withProfileCatalog(async ({ counts, document, published }) => {
    domPrompt("Night Shift");
    await clickAndSettle(findButton(document, "＋ 新增 Profile"));

    assert.match(document.body.textContent ?? "", /create failed/u);
    assert.equal(counts.catalogReads, 0);
    assert.deepEqual(published, []);
    assert.deepEqual(sidebarProfileNames(document), ["Operations"]);
    assert.equal(findButton(document, "重新載入清單"), undefined);
  }, {
    catalogReads: [],
    createPlaybackProfile: async () => {
      throw new Error("create failed");
    },
    subscribe: true
  });
});

test("standalone Playback Profiles refreshes its own catalog without a Fleet subscriber", async () => {
  await withProfileCatalog(async ({ document, published }) => {
    domPrompt("Night Shift");
    await clickAndSettle(findButton(document, "＋ 新增 Profile"));

    assert.deepEqual(sidebarProfileNames(document), ["Operations", "Night Shift"]);
    assert.deepEqual(published, []);
    assert.equal(findButton(document, "重新載入清單"), undefined);
  }, {
    catalogReads: [async () => [profile, createdProfile]],
    createPlaybackProfile: async () => createdProfile,
    subscribe: false
  });
});
