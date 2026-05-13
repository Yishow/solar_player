import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";

import { readLiveMetricsSnapshot } from "./liveMetrics.js";

test("readLiveMetricsSnapshot surfaces missing live metrics table errors", () => {
  const database = new Database(":memory:");

  try {
    assert.throws(
      () => readLiveMetricsSnapshot(database),
      /no such table: live_metric_values/
    );
  } finally {
    database.close();
  }
});