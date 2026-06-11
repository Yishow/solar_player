import assert from "node:assert/strict";
import test from "node:test";
import {
  clearMonitoringHistoryPayloadCacheForTest,
  readCachedMonitoringHistoryPayload,
  rememberMonitoringHistoryPayload,
  resolveMonitoringHistoryPayloadForRange,
  type MonitoringHistoryPayload
} from "./monitoringHistoryPayloadCache";

type TestSnapshot = {
  capturedAt: string;
  generation: number | null;
};

function payload(range: MonitoringHistoryPayload<TestSnapshot>["range"], generation: number) {
  return {
    range,
    snapshots: [
      {
        capturedAt: `${range}-point`,
        generation
      }
    ]
  };
}

test("monitoring history payload cache shares warm payloads by range", () => {
  clearMonitoringHistoryPayloadCacheForTest();
  const dayPayload = payload("day", 10);
  const weekPayload = payload("week", 70);

  rememberMonitoringHistoryPayload(dayPayload);
  rememberMonitoringHistoryPayload(weekPayload);

  assert.deepEqual(readCachedMonitoringHistoryPayload("day"), dayPayload);
  assert.deepEqual(readCachedMonitoringHistoryPayload("week"), weekPayload);
  assert.equal(readCachedMonitoringHistoryPayload("month"), null);
});

test("monitoring history payload resolver prefers same-range runtime data before warm cache", () => {
  clearMonitoringHistoryPayloadCacheForTest();
  const cachedDayPayload = payload("day", 10);
  const freshDayPayload = payload("day", 11);
  const staleWeekPayload = payload("week", 70);
  rememberMonitoringHistoryPayload(cachedDayPayload);

  assert.deepEqual(
    resolveMonitoringHistoryPayloadForRange({
      cachedPayload: cachedDayPayload,
      range: "day",
      runtimePayload: freshDayPayload
    }),
    freshDayPayload
  );
  assert.deepEqual(
    resolveMonitoringHistoryPayloadForRange({
      cachedPayload: cachedDayPayload,
      range: "day",
      runtimePayload: staleWeekPayload
    }),
    cachedDayPayload
  );
});
