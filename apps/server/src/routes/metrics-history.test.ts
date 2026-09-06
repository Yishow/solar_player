import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMetricSnapshotCapturedAt } from "../db/normalizeMetricSnapshotCapturedAt.js";
import { createPairedDeviceTestContext } from "../testing/deviceContextTestSupport.js";
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
          metric_scope,
          generation,
          consumption,
          self_consumption,
          co2,
          ratio,
          efficiency,
          captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run("cl", 120, 90, 60, 55, 50, 91, isoForUtc(currentYear, 5, 10, 9));
  database
    .prepare(
      `
        INSERT INTO metric_snapshots (
          metric_scope,
          generation,
          consumption,
          self_consumption,
          co2,
          ratio,
          efficiency,
          captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run("cl", 88, 70, 41, 32, 46, 89, isoForUtc(currentYear - 1, 12, 31, 23));

  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          metric_scope,
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      "cl",
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
          metric_scope,
          date,
          generation_total,
          consumption_total,
          self_consumption_total,
          co2_total,
          peak_generation,
          peak_generation_time,
          peak_consumption,
          peak_consumption_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      "cl",
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

  const paired = createPairedDeviceTestContext("cl");
  const app = await buildApp();

  try {
    const [yearHistoryResponse, totalHistoryResponse, yearSummaryResponse, totalSummaryResponse] = await Promise.all([
      app.inject({
        cookies: { solar_device_credential: paired.credential },
        method: "GET",
        url: "/api/metrics/history?range=year&metricScope=cl"
      }),
      app.inject({
        cookies: { solar_device_credential: paired.credential },
        method: "GET",
        url: "/api/metrics/history?range=total&metricScope=cl"
      }),
      app.inject({
        cookies: { solar_device_credential: paired.credential },
        method: "GET",
        url: "/api/metrics/daily-summary?range=year&metricScope=cl"
      }),
      app.inject({
        cookies: { solar_device_credential: paired.credential },
        method: "GET",
        url: "/api/metrics/daily-summary?range=total&metricScope=cl"
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

test("monthly daily summaries start at the first day of the current calendar month", async () => {
  const now = new Date();
  const pad = (value: number) => `${value}`.padStart(2, "0");
  const formatDate = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 28);
  const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const database = getDatabase();
  database.prepare("DELETE FROM daily_energy_summaries").run();

  database
    .prepare("INSERT INTO daily_energy_summaries (metric_scope, date, generation_total, consumption_total) VALUES (?, ?, ?, ?)")
    .run("cl", formatDate(previousMonthDate), 10, 100);
  database
    .prepare("INSERT INTO daily_energy_summaries (metric_scope, date, generation_total, consumption_total) VALUES (?, ?, ?, ?)")
    .run("cl", formatDate(currentMonthDate), 20, 200);

  const paired = createPairedDeviceTestContext("cl");
  const app = await buildApp();

  try {
    const response = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      method: "GET",
      url: "/api/metrics/daily-summary?range=month&metricScope=cl"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { summaries: Array<{ consumptionTotal: number; date: string }> };
    assert.deepEqual(body.summaries.map((summary) => summary.date), [formatDate(currentMonthDate)]);
    assert.deepEqual(body.summaries.map((summary) => summary.consumptionTotal), [200]);
  } finally {
    await app.close();
  }
});

test("monthly metric history snapshots start at the first moment of the current local calendar month", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const previousMonthSnapshot = new Date(monthStart.getTime() - 10 * 60 * 1000);
  const currentMonthSnapshot = new Date(monthStart.getTime() + 15 * 60 * 1000);

  database
    .prepare(
      `
        INSERT INTO metric_snapshots (
          metric_scope,
          generation,
          consumption,
          self_consumption,
          co2,
          ratio,
          efficiency,
          captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run("cl", 88, 70, 41, 32, 46, 89, previousMonthSnapshot.toISOString());
  database
    .prepare(
      `
        INSERT INTO metric_snapshots (
          metric_scope,
          generation,
          consumption,
          self_consumption,
          co2,
          ratio,
          efficiency,
          captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run("cl", 120, 90, 60, 55, 50, 91, currentMonthSnapshot.toISOString());

  const paired = createPairedDeviceTestContext("cl");
  const app = await buildApp();

  try {
    const response = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      method: "GET",
      url: "/api/metrics/history?range=month&metricScope=cl"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      range: string;
      snapshots: Array<{ capturedAt: string }>;
    };

    assert.equal(body.range, "month");
    assert.deepEqual(body.snapshots.map((snapshot) => snapshot.capturedAt), [currentMonthSnapshot.toISOString()]);
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
          metric_scope,
          generation,
          consumption,
          self_consumption,
          co2,
          ratio,
          efficiency,
          captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run("cl", 10, 9, 8, 7, 0.5, 91, "2026-06-08 23:30:00");
  database
    .prepare(
      `
        INSERT INTO metric_snapshots (
          metric_scope,
          generation,
          consumption,
          self_consumption,
          co2,
          ratio,
          efficiency,
          captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run("cl", 11, 10, 9, 8, 0.6, 92, "2026-06-09T00:15:00.000Z");
  normalizeMetricSnapshotCapturedAt(database);

  const paired = createPairedDeviceTestContext("cl");
  const app = await buildApp();

  try {
    const response = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      method: "GET",
      url: "/api/metrics/history?range=total&metricScope=cl"
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

test("metrics history range readers return only the requested metric scope", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare(`
    INSERT INTO metric_snapshots (metric_scope, generation, captured_at)
    VALUES ('cl', 10, '2026-08-29T01:00:00.000Z'), ('kn', 20, '2026-08-29T01:00:00.000Z')
  `).run();
  database.prepare(`
    INSERT INTO daily_energy_summaries (metric_scope, date, generation_total)
    VALUES ('cl', '2026-08-29', 10), ('kn', '2026-08-29', 20)
  `).run();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_scope, metric_key, total_value)
    VALUES ('cl', 'generation', 10), ('kn', 'generation', 20)
  `).run();
  const paired = createPairedDeviceTestContext("cl");
  const app = await buildApp();

  try {
    const denied = await app.inject({ method: "GET", url: "/api/metrics/history?range=total" });
    assert.equal(denied.statusCode, 401);
    const [history, summaries, cumulative] = await Promise.all([
      app.inject({ cookies: { solar_device_credential: paired.credential }, method: "GET", url: "/api/metrics/history?range=total&metricScope=kn" }),
      app.inject({ cookies: { solar_device_credential: paired.credential }, method: "GET", url: "/api/metrics/daily-summary?range=total&metricScope=kn" }),
      app.inject({ cookies: { solar_device_credential: paired.credential }, method: "GET", url: "/api/metrics/cumulative?metricScope=kn" })
    ]);
    assert.deepEqual(history.json().snapshots.map((row: { generation: number }) => row.generation), [10]);
    assert.deepEqual(summaries.json().summaries.map((row: { generationTotal: number }) => row.generationTotal), [10]);
    assert.deepEqual(cumulative.json().counters.map((row: { totalValue: number }) => row.totalValue), [10]);
  } finally {
    await app.close();
  }
});

test("GET /api/data-hub/energy-history returns one explicit scope with the requested range", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  const now = new Date();
  const pad = (value: number) => `${value}`.padStart(2, "0");
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const nowIso = now.toISOString();

  database.prepare(`
    INSERT INTO metric_snapshots (metric_scope, generation, consumption, captured_at)
    VALUES
      ('cl', 110, 90, ?),
      ('kn', 220, 190, ?),
      ('global', 330, 290, ?)
  `).run(nowIso, nowIso, nowIso);
  database.prepare(`
    INSERT INTO daily_energy_summaries (metric_scope, date, generation_total, consumption_total)
    VALUES
      ('cl', ?, 110, 90),
      ('kn', ?, 220, 190),
      ('global', ?, 330, 290)
  `).run(todayKey, todayKey, todayKey);
  database.prepare(`
    INSERT INTO cumulative_counters (metric_scope, metric_key, total_value)
    VALUES
      ('cl', 'generation', 110),
      ('kn', 'generation', 220),
      ('global', 'generation', 330)
  `).run();

  const app = await buildApp();
  try {
    for (const metricScope of ["cl", "kn", "global"] as const) {
      for (const range of ["day", "week", "month", "year", "total"] as const) {
        const response = await app.inject({
          method: "GET",
          url: `/api/data-hub/energy-history?metricScope=${metricScope}&range=${range}`
        });

        assert.equal(response.statusCode, 200);
        const body = response.json() as {
          counters: Array<{ totalValue: number }>;
          metricScope: string;
          range: string;
          snapshots: Array<{ generation: number }>;
          summaries: Array<{ generationTotal: number }>;
        };
        assert.equal(body.metricScope, metricScope);
        assert.equal(body.range, range);
        assert.deepEqual(body.snapshots.map(({ generation }) => generation), [
          metricScope === "cl" ? 110 : metricScope === "kn" ? 220 : 330
        ]);
        assert.deepEqual(body.summaries.map(({ generationTotal }) => generationTotal), [
          metricScope === "cl" ? 110 : metricScope === "kn" ? 220 : 330
        ]);
        assert.deepEqual(body.counters.map(({ totalValue }) => totalValue), [
          metricScope === "cl" ? 110 : metricScope === "kn" ? 220 : 330
        ]);
      }
    }

    for (const query of [
      "",
      "?metricScope=all&range=day",
      "?metricScope=invalid&range=day",
      "?metricScope=cl",
      "?metricScope=cl&range=invalid"
    ]) {
      const response = await app.inject({
        method: "GET",
        url: `/api/data-hub/energy-history${query}`
      });
      assert.equal(response.statusCode, 400, query || "missing query");
    }

    const denied = await app.inject({
      method: "GET",
      remoteAddress: "198.51.100.24",
      url: "/api/data-hub/energy-history?metricScope=global&range=day"
    });
    assert.equal(denied.statusCode, 403);
  } finally {
    await app.close();
  }
});

test("GET /api/data-hub/energy-history keeps an empty selected scope empty", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare(`
    INSERT INTO metric_snapshots (metric_scope, generation, captured_at)
    VALUES ('kn', 220, '2026-08-31T01:00:00.000Z'), ('global', 330, '2026-08-31T01:00:00.000Z')
  `).run();
  database.prepare(`
    INSERT INTO daily_energy_summaries (metric_scope, date, generation_total)
    VALUES ('kn', '2026-08-31', 220), ('global', '2026-08-31', 330)
  `).run();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_scope, metric_key, total_value)
    VALUES ('kn', 'generation', 220), ('global', 'generation', 330)
  `).run();

  const app = await buildApp();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-hub/energy-history?metricScope=cl&range=week"
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      counters: [],
      metricScope: "cl",
      periodSummary: null,
      range: "week",
      snapshots: [],
      summaries: []
    });
  } finally {
    await app.close();
  }
});
