import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMetricSnapshotCapturedAt } from "../db/normalizeMetricSnapshotCapturedAt.js";
import {
  buildApp,
  getDatabase
} from "./display-pages-asset-governance.test-support.js";

function isoForUtc(year: number, month: number, day: number, hour: number) {
  return new Date(Date.UTC(year, month - 1, day, hour)).toISOString();
}

test("metrics history routes keep year and total boundaries distinct", async () => {
  const currentYear = new Date().getUTCFullYear();
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();

  database
    .prepare(
      `
        INSERT INTO metric_snapshots (
          generation,
          consumption,
          self_consumption,
          co2,
          ratio,
          efficiency,
          captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(120, 90, 60, 55, 50, 91, isoForUtc(currentYear, 5, 10, 9));
  database
    .prepare(
      `
        INSERT INTO metric_snapshots (
          generation,
          consumption,
          self_consumption,
          co2,
          ratio,
          efficiency,
          captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(88, 70, 41, 32, 46, 89, isoForUtc(currentYear - 1, 12, 31, 23));

  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      `${currentYear}-05-10`,
      120,
      90,
      60,
      55,
      612,
      isoForUtc(currentYear, 5, 10, 11),
      488,
      isoForUtc(currentYear, 5, 10, 15)
    );
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      `${currentYear - 1}-12-31`,
      88,
      70,
      41,
      32,
      420,
      isoForUtc(currentYear - 1, 12, 31, 12),
      360,
      isoForUtc(currentYear - 1, 12, 31, 16)
    );

  const app = await buildApp();

  try {
    const [yearHistoryResponse, totalHistoryResponse, yearSummaryResponse, totalSummaryResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/metrics/history?range=year"
      }),
      app.inject({
        method: "GET",
        url: "/api/metrics/history?range=total"
      }),
      app.inject({
        method: "GET",
        url: "/api/metrics/daily-summary?range=year"
      }),
      app.inject({
        method: "GET",
        url: "/api/metrics/daily-summary?range=total"
      })
    ]);

    assert.equal(yearHistoryResponse.statusCode, 200);
    assert.equal(totalHistoryResponse.statusCode, 200);
    assert.equal(yearSummaryResponse.statusCode, 200);
    assert.equal(totalSummaryResponse.statusCode, 200);

    const yearHistoryBody = yearHistoryResponse.json() as {
      range: string;
      snapshots: Array<{ capturedAt: string }>;
    };
    const totalHistoryBody = totalHistoryResponse.json() as {
      range: string;
      snapshots: Array<{ capturedAt: string }>;
    };
    const yearSummaryBody = yearSummaryResponse.json() as {
      summaries: Array<{ date: string }>;
    };
    const totalSummaryBody = totalSummaryResponse.json() as {
      summaries: Array<{ date: string }>;
    };

    assert.equal(yearHistoryBody.range, "year");
    assert.equal(yearHistoryBody.snapshots.length, 1);
    assert.match(yearHistoryBody.snapshots[0]?.capturedAt ?? "", new RegExp(`^${currentYear}-`));
    assert.equal(totalHistoryBody.snapshots.length, 2);

    assert.equal(yearSummaryBody.summaries.length, 1);
    assert.equal(yearSummaryBody.summaries[0]?.date, `${currentYear}-05-10`);
    assert.equal(totalSummaryBody.summaries.length, 2);
  } finally {
    await app.close();
  }
});

test("metrics history filters and sorts mixed timestamp formats chronologically", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database
    .prepare(
      `
        INSERT INTO metric_snapshots (
          generation,
          consumption,
          self_consumption,
          co2,
          ratio,
          efficiency,
          captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(10, 9, 8, 7, 0.5, 91, "2026-06-08 23:30:00");
  database
    .prepare(
      `
        INSERT INTO metric_snapshots (
          generation,
          consumption,
          self_consumption,
          co2,
          ratio,
          efficiency,
          captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(11, 10, 9, 8, 0.6, 92, "2026-06-09T00:15:00.000Z");
  normalizeMetricSnapshotCapturedAt(database);

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/metrics/history?range=total"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      snapshots: Array<{ capturedAt: string }>;
    };

    const normalize = (capturedAt: string) => new Date(capturedAt.replace(" ", "T")).toISOString();
    assert.deepEqual(body.snapshots.map((snapshot) => snapshot.capturedAt), [
      normalize("2026-06-08 23:30:00"),
      "2026-06-09T00:15:00.000Z"
    ]);
  } finally {
    await app.close();
  }
});
