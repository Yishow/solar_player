import assert from "node:assert/strict";
import test from "node:test";
import { defaultFallbackPolicy } from "@solar-display/shared";
import {
  applyDraftConfigUpdate,
  createDraftSession,
  rebaseDraftSessionBaseline,
  redoDraftSession,
  resetDraftPaths,
  undoDraftSession
} from "./displayPageDraftSession";

test("scoped dirty paths can be reconciled without marking unrelated fields clean", () => {
  const seedConfig = {
    heroCopy: {
      lead: "baseline lead",
      title: "baseline title"
    }
  };
  const session = createDraftSession(seedConfig, null, defaultFallbackPolicy);
  const titleEdited = applyDraftConfigUpdate(
    session,
    (current) => ({
      ...current,
      heroCopy: {
        ...current.heroCopy,
        title: "local title"
      }
    }),
    { dirtyPaths: [["heroCopy", "title"]] }
  );
  const leadEdited = applyDraftConfigUpdate(
    titleEdited,
    (current) => ({
      ...current,
      heroCopy: {
        ...current.heroCopy,
        lead: "local lead"
      }
    }),
    { dirtyPaths: [["heroCopy", "lead"]] }
  );

  const titleReset = resetDraftPaths(leadEdited, seedConfig, [["heroCopy", "title"]]);
  const leadReset = resetDraftPaths(titleReset, seedConfig, [["heroCopy", "lead"]]);

  assert.equal(titleEdited.dirty, true);
  assert.equal(leadEdited.dirty, true);
  assert.equal(titleReset.dirty, true);
  assert.equal(leadReset.dirty, false);
});

test("coarse editor operations restore dirty state through undo and redo history", () => {
  const session = createDraftSession({ left: 86, top: 172 }, null, defaultFallbackPolicy);
  const moved = applyDraftConfigUpdate(session, (current) => ({ ...current, left: 110 }));
  const undone = undoDraftSession(moved);
  const redone = redoDraftSession(undone);

  assert.equal(moved.dirty, true);
  assert.equal(undone.dirty, false);
  assert.equal(redone.dirty, true);
});

test("scoped no-op updates do not create undo history", () => {
  const session = createDraftSession(
    {
      heroCopy: {
        title: "baseline title"
      }
    },
    null,
    defaultFallbackPolicy
  );
  const noOp = applyDraftConfigUpdate(
    session,
    (current) => ({
      ...current,
      heroCopy: {
        ...current.heroCopy,
        title: "baseline title"
      }
    }),
    { dirtyPaths: [["heroCopy", "title"]] }
  );

  assert.equal(noOp.dirty, false);
  assert.equal(noOp.history.past.length, 0);
});

test("baseline rebase clears stale dirty history snapshots", () => {
  const session = applyDraftConfigUpdate(
    createDraftSession({ title: "baseline" }, null, defaultFallbackPolicy),
    (current) => ({ ...current, title: "local" }),
    { dirtyPaths: [["title"]] }
  );
  const rebased = rebaseDraftSessionBaseline(
    session,
    { title: "server" },
    {
      fallbackPolicy: defaultFallbackPolicy,
      pageId: "overview",
      publishedAt: null,
      publishedBy: null,
      regions: {},
      stage: "draft",
      updatedAt: "2026-06-11T00:00:00.000Z",
      version: 2
    },
    defaultFallbackPolicy,
    { markDirty: true }
  );

  assert.equal(rebased.dirty, true);
  assert.equal(undoDraftSession(rebased).dirty, true);
});

test("resetDraftPaths restores only the requested field paths", () => {
  const seedConfig = {
    heroCopyLayout: {
      left: 86,
      top: 172,
      width: 642
    },
    heroMedia: {
      src: "/hero.png"
    }
  };
  const session = createDraftSession(
    {
      heroCopyLayout: {
        left: 120,
        top: 210,
        width: 700
      },
      heroMedia: {
        src: "/custom.png"
      }
    },
    null,
    defaultFallbackPolicy
  );

  const nextSession = resetDraftPaths(session, seedConfig, [["heroCopyLayout", "width"]]);

  assert.equal(nextSession.config.heroCopyLayout.left, 120);
  assert.equal(nextSession.config.heroCopyLayout.top, 210);
  assert.equal(nextSession.config.heroCopyLayout.width, 642);
  assert.equal(nextSession.config.heroMedia.src, "/custom.png");
});

test("undo and redo stay scoped to the current page draft session", () => {
  const overviewSession = applyDraftConfigUpdate(
    createDraftSession({ left: 86, top: 172 }, null, defaultFallbackPolicy),
    (current) => ({ ...current, left: 110 })
  );
  const solarSession = applyDraftConfigUpdate(
    createDraftSession({ left: 320, top: 240 }, null, defaultFallbackPolicy),
    (current) => ({ ...current, top: 280 })
  );

  const undoneOverview = undoDraftSession(overviewSession);
  const redoneOverview = redoDraftSession(undoneOverview);

  assert.deepEqual(undoneOverview.config, { left: 86, top: 172 });
  assert.deepEqual(redoneOverview.config, { left: 110, top: 172 });
  assert.deepEqual(solarSession.config, { left: 320, top: 280 });
});
