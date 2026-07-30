import assert from "node:assert/strict";
import test from "node:test";
import type {
  PlaybackProfileVersion,
  PlaybackRuntime
} from "@solar-display/shared";
import {
  applyStagedProfileRollout,
  stageProfileRollout
} from "./profileRollout";

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
const version = {
  createdAt: "2026-07-30T00:00:00.000Z",
  createdBy: "test",
  id: 5,
  profileId: 2,
  rollbackFromVersionId: null,
  schemaVersion: 1,
  snapshot: {
    pages: [page],
    settings: {
      autoplay: true,
      brightness: 100,
      enforceFreshRuntimeData: true,
      idleMode: "disabled" as const,
      idleTimeout: 300,
      loop: true,
      orientation: "landscape" as const,
      repeatDays: [1, 2, 3, 4, 5],
      scheduleEnabled: false,
      scheduleEnd: "18:00",
      scheduleStart: "08:00",
      startPage: 1,
      transitionSpeed: 250,
      transitionType: "fade" as const,
      updatedAt: null
    }
  },
  versionNumber: 1
} satisfies PlaybackProfileVersion;
const runtime = {
  countdownMs: 5_000,
  currentIndex: 0,
  isIdle: false,
  isPlaying: true,
  lastInteractionAt: 0
} satisfies PlaybackRuntime;
const preview = {
  evaluatedAt: "2026-07-30T00:00:00.000Z",
  fallbackRoute: null,
  playablePages: [page],
  skippedPages: []
};

test("valid candidate stages waiting and applies only at the safe boundary", () => {
  const staged = stageProfileRollout({
    appliedVersion: 4,
    currentRuntime: runtime,
    desired: version,
    nextPages: [page],
    previousPages: [page],
    preview,
    receivedAtMs: 1_000
  });
  assert.equal(staged.status.updateState, "waiting");
  assert.equal(applyStagedProfileRollout(staged, 5_999), null);
  const applied = applyStagedProfileRollout(staged, 6_000);
  assert.equal(applied?.status.appliedVersion, version.id);
  assert.equal(applied?.status.updateState, "applied");
});

test("invalid candidate preserves the prior applied Version with bounded failure", () => {
  const staged = stageProfileRollout({
    appliedVersion: 4,
    currentRuntime: runtime,
    desired: {
      ...version,
      schemaVersion: 2
    } as unknown as PlaybackProfileVersion,
    nextPages: [page],
    previousPages: [page],
    preview,
    receivedAtMs: 1_000
  });
  assert.equal(staged.status.appliedVersion, 4);
  assert.equal(staged.status.updateState, "failed");
  assert.ok((staged.status.lastError?.length ?? 0) <= 160);
});

test("candidate that removes the current page applies on the next safe tick", () => {
  const staged = stageProfileRollout({
    appliedVersion: 4,
    currentRuntime: runtime,
    desired: {
      ...version,
      snapshot: {
        ...version.snapshot,
        pages: [{
          ...page,
          id: 2,
          pageKey: "solar",
          route: "/solar",
          templateKey: "solar"
        }],
        settings: {
          ...version.snapshot.settings,
          startPage: 2
        }
      }
    },
    nextPages: [{
      ...page,
      id: 2,
      pageKey: "solar",
      route: "/solar",
      templateKey: "solar"
    }],
    previousPages: [page],
    preview: {
      ...preview,
      playablePages: [{
        ...page,
        id: 2,
        pageKey: "solar",
        route: "/solar",
        templateKey: "solar"
      }]
    },
    receivedAtMs: 1_000
  });

  const applied = applyStagedProfileRollout(staged, 1_000);
  assert.equal(applied?.runtime.currentIndex, 0);
  assert.equal(applied?.status.appliedVersion, version.id);
});

test("candidate with an unhealthy formal asset reference fails closed", () => {
  const staged = stageProfileRollout({
    appliedVersion: 4,
    currentRuntime: runtime,
    desired: version,
    nextPages: [],
    previousPages: [page],
    preview: {
      ...preview,
      playablePages: [],
      skippedPages: [{
        ...page,
        detail: "missing published background",
        skipReason: "asset-unhealthy"
      }]
    },
    receivedAtMs: 1_000
  });

  assert.equal(staged.status.appliedVersion, 4);
  assert.equal(staged.status.updateState, "failed");
  assert.match(staged.status.lastError ?? "", /asset reference/u);
});

test("candidate validation accepts the Server canonical none transition and fractional values", () => {
  const staged = stageProfileRollout({
    appliedVersion: 4,
    currentRuntime: runtime,
    desired: {
      ...version,
      snapshot: {
        ...version.snapshot,
        settings: {
          ...version.snapshot.settings,
          brightness: 71.5,
          transitionSpeed: 0,
          transitionType: "none"
        }
      }
    },
    nextPages: [page],
    previousPages: [page],
    preview,
    receivedAtMs: 1_000
  });

  assert.equal(staged.status.updateState, "waiting");
});
