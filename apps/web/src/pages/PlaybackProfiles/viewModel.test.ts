import assert from "node:assert/strict";
import test from "node:test";
import type {
  PlaybackProfileDraft,
  PlaybackProfileSitePreview
} from "@solar-display/shared";
import {
  buildProfilePublishConfirmation,
  buildSitePreviewSummary,
  validateProfileDraftForPublish
} from "./viewModel";

const draft: PlaybackProfileDraft = {
  pages: [
    {
      displayOrder: 1,
      durationSeconds: 15,
      enabled: true,
      id: 1,
      labelEn: "Overview",
      labelZh: "總覽",
      pageKey: "overview",
      route: "/overview",
      templateKey: "overview"
    }
  ],
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
    updatedAt: null
  },
  updatedAt: "2026-07-30T00:00:00.000Z"
};

test("validateProfileDraftForPublish blocks empty and invalid start-page Drafts", () => {
  assert.equal(
    validateProfileDraftForPublish({
      ...draft,
      pages: draft.pages.map((page) => ({ ...page, enabled: false }))
    }),
    "至少需要一個啟用頁面。"
  );
  assert.equal(
    validateProfileDraftForPublish({
      ...draft,
      settings: { ...draft.settings, startPage: 999 }
    }),
    "起始頁面必須是已啟用頁面。"
  );
  assert.equal(validateProfileDraftForPublish(draft), null);
});

test("Preview summary keeps configured/effective/skipped counts visible", () => {
  const preview = {
    configured: draft.pages,
    diagnostics: {
      fallback: [],
      freshness: ["overview:fresh"],
      readiness: [],
      site: []
    },
    effective: draft.pages,
    siteScope: "cl",
    skipped: []
  } satisfies PlaybackProfileSitePreview;

  assert.deepEqual(buildSitePreviewSummary(preview), {
    configured: 1,
    diagnostics: 1,
    effective: 1,
    skipped: 0
  });
});

test("publish confirmation names the Profile and immutable next Version", () => {
  assert.equal(
    buildProfilePublishConfirmation("Operations", 3),
    "確定發布「Operations」為不可變更的 Version 3？"
  );
});
