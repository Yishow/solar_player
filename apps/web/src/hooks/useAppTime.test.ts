import assert from "node:assert/strict";
import test from "node:test";
import type { AppTimeSnapshot } from "@solar-display/shared";
import {
  buildAppTimeHeaderView,
  resolveAbsoluteAppTimeEpoch
} from "./useAppTime";

function snapshot(
  state: AppTimeSnapshot["state"],
  nowEpochMs: number | null = 1_785_391_500_000
): AppTimeSnapshot {
  return {
    lastSignalMonotonicMs: nowEpochMs === null ? null : 1_000,
    nowEpochMs,
    state
  };
}

test("buildAppTimeHeaderView formats Asia/Taipei App Time and all four readable states", () => {
  assert.deepEqual(
    buildAppTimeHeaderView(snapshot("waiting", null)),
    {
      date: "伺服器時間",
      state: "waiting",
      stateLabel: "等待同步",
      time: "--:--",
      weekday: "--"
    }
  );

  const expectedClock = {
    date: "2026 / 07 / 30",
    time: "14:05",
    weekday: "星期四  Thu."
  };
  for (const [state, stateLabel] of [
    ["synced", "已同步"],
    ["stale", "訊號延遲"],
    ["time-untrusted", "時間不可信"]
  ] as const) {
    assert.deepEqual(buildAppTimeHeaderView(snapshot(state)), {
      ...expectedClock,
      state,
      stateLabel
    });
  }
});

test("absolute App Time freezes the last trusted epoch while waiting or time-untrusted", () => {
  const trustedEpoch = resolveAbsoluteAppTimeEpoch(
    snapshot("stale", 1_785_391_500_000),
    null
  );

  assert.equal(
    resolveAbsoluteAppTimeEpoch(snapshot("time-untrusted"), trustedEpoch),
    trustedEpoch
  );
  assert.equal(
    resolveAbsoluteAppTimeEpoch(snapshot("waiting", null), trustedEpoch),
    trustedEpoch
  );
  assert.equal(
    resolveAbsoluteAppTimeEpoch(snapshot("waiting", null), null),
    null
  );
});
