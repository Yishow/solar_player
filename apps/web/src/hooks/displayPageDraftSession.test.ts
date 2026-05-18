import assert from "node:assert/strict";
import test from "node:test";
import { defaultFallbackPolicy } from "@solar-display/shared";
import {
  applyDraftConfigUpdate,
  createDraftSession,
  redoDraftSession,
  resetDraftPaths,
  undoDraftSession
} from "./displayPageDraftSession";

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
