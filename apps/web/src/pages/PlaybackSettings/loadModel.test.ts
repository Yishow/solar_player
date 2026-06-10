import assert from "node:assert/strict";
import test from "node:test";
import type {
  DisplayRotationPreview,
  PlaybackPage,
  PlaybackSettings
} from "@solar-display/shared";
import {
  loadPlaybackDiagnosticsModel,
  loadPlaybackEditableModel
} from "./loadModel";

const settings: PlaybackSettings = {
  autoplay: true,
  brightness: 100,
  idleMode: "disabled",
  idleTimeout: 0,
  loop: true,
  orientation: "landscape",
  repeatDays: [],
  scheduleEnabled: false,
  scheduleEnd: null,
  scheduleStart: null,
  startPage: 1,
  transitionSpeed: 800,
  transitionType: "fade",
  updatedAt: "2026-06-10T00:00:00.000Z"
};

const page: PlaybackPage = {
  displayOrder: 1,
  durationSeconds: 15,
  enabled: true,
  id: 1,
  labelEn: "Overview",
  labelZh: "總覽",
  pageKey: "overview",
  route: "/overview",
  templateKey: "overview"
};

const rotationPreview: DisplayRotationPreview = {
  evaluatedAt: "2026-06-10T00:00:00.000Z",
  fallbackRoute: null,
  playablePages: [page],
  skippedPages: []
};

test("loadPlaybackEditableModel only reads settings and playback pages for first paint", async () => {
  let settingsReads = 0;
  let pageReads = 0;

  const model = await loadPlaybackEditableModel({
    readPages: async () => {
      pageReads += 1;
      return [page];
    },
    readSettings: async () => {
      settingsReads += 1;
      return settings;
    }
  });

  assert.equal(settingsReads, 1);
  assert.equal(pageReads, 1);
  assert.equal(model.settings, settings);
  assert.deepEqual(model.pages, [page]);
});

test("loadPlaybackDiagnosticsModel keeps rotation preview outside the editable model", async () => {
  let previewReads = 0;

  const model = await loadPlaybackDiagnosticsModel({
    readRotationPreview: async () => {
      previewReads += 1;
      return rotationPreview;
    }
  });

  assert.equal(previewReads, 1);
  assert.equal(model.rotationPreview, rotationPreview);
});
