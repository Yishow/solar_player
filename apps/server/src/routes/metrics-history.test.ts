import assert from "node:assert/strict";
import test from "node:test";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { normalizeMetricSnapshotCapturedAt } from "../db/normalizeMetricSnapshotCapturedAt.js";
import { seedAcceptedReading } from "../services/meterReadingService.js";
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

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function padTwo(value: number) {
  return `${value}`.padStart(2, "0");
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
}

function localMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function historyMeter(channelId: string): MeterSourceDefinition {
  return {
    channelId,
    enabled: true,
    energyFlowRole: "consumption",
    epochId: "epoch-1",
    expectedCadenceSeconds: 60,
    inputUnit: "kWh",
    measurementKind: "cumulative-energy",
    meterId: channelId,
    metricKey: channelId,
    metricScope: "kn",
    reviewStatus: "reviewed",
    scaleDecimal: "1",
    sourceRevision: 1,
    sourceTimestampTimeZone: "UTC",
    timestampPolicy: "source-required"
  };
}

/**
 * R7 fixture: two daily summaries in the current month plus one in an earlier month, with
 * canonical meter evidence for the two past days only. Dates are derived from the real clock
 * because the daily-summary range contract is evaluated by SQLite's own `date('now')`.
 */
function seedRangeSemanticsFixture() {
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();

  const today = localMidnight(new Date());
  const threeDaysAgo = addLocalDays(today, -3);
  const previousMonthFirst = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const insertSummary = database.prepare(`
    INSERT INTO daily_energy_summaries (
      metric_scope, date, generation_total, consumption_total, self_consumption_total, co2_total,
      peak_generation, peak_generation_time, peak_consumption, peak_consumption_time
    ) VALUES ('kn', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSummary.run(localDateKey(previousMonthFirst), 500, 9999, 400, 300, 612, "11:00", 488, "15:00");
  insertSummary.run(localDateKey(threeDaysAgo), 700, 9999, 600, 400, 700, "12:00", 500, "16:00");
  insertSummary.run(localDateKey(today), 800, 9999, 700, 500, 800, "13:00", 600, "17:00");

  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES ('kn-energy', 'kn', 1, 1, ?, 'ready', ?, ?, '[]', ?, 1, ?)
  `).run(
    localTimeZone,
    new Date(today.getFullYear() - 1, 0, 1).toISOString(),
    JSON.stringify({ coverageReview: "reviewed", kind: "meter-set", label: "觀音總錶", memberChannelIds: ["kn-main"] }),
    JSON.stringify({ kind: "site-main" }),
    new Date(today.getFullYear() - 1, 0, 1).toISOString()
  );

  const meter = historyMeter("kn-main");
  const seedAt = (date: Date, value: string) => {
    const instant = date.toISOString();
    seedAcceptedReading(database, meter, value, instant, instant);
  };
  seedAt(previousMonthFirst, "10");
  seedAt(addLocalDays(previousMonthFirst, 1), "30");
  seedAt(threeDaysAgo, "100");
  seedAt(addLocalDays(threeDaysAgo, 1), "180");

  return {
    previousMonthKey: localDateKey(previousMonthFirst),
    seeded: [previousMonthFirst, threeDaysAgo, today],
    threeDaysAgoKey: localDateKey(threeDaysAgo),
    today,
    todayKey: localDateKey(today)
  };
}

type SummaryRow = {
  co2Total: number | null;
  consumptionTotal: number | null;
  date: string;
  generationTotal: number | null;
  peakGeneration: number | null;
  quality?: string;
};

async function readDailySummaries(app: Awaited<ReturnType<typeof buildApp>>, credential: string, range: string) {
  const response = await app.inject({
    cookies: { solar_device_credential: credential },
    method: "GET",
    url: `/api/metrics/daily-summary?range=${range}`
  });
  assert.equal(response.statusCode, 200);
  return (response.json() as { summaries: SummaryRow[] }).summaries;
}

test("R7 day, week, year and total daily summaries keep their requested range semantics", async () => {
  const fixture = seedRangeSemanticsFixture();
  const paired = createPairedDeviceTestContext("kn");
  const app = await buildApp();

  const yearStart = new Date(fixture.today.getFullYear(), 0, 1);
  const weekStart = addLocalDays(fixture.today, -6);
  const expected = (from: Date | null) =>
    new Set(fixture.seeded.filter((date) => from === null || date >= from).map(localDateKey));

  try {
    const [day, week, year, total] = await Promise.all([
      readDailySummaries(app, paired.credential, "day"),
      readDailySummaries(app, paired.credential, "week"),
      readDailySummaries(app, paired.credential, "year"),
      readDailySummaries(app, paired.credential, "total")
    ]);

    assert.deepEqual(new Set(day.map((row) => row.date)), expected(fixture.today));
    assert.deepEqual(new Set(week.map((row) => row.date)), expected(weekStart));
    assert.deepEqual(new Set(year.map((row) => row.date)), expected(yearStart));
    assert.deepEqual(new Set(total.map((row) => row.date)), expected(null));

    const earlier = total.find((row) => row.date === fixture.previousMonthKey);
    assert.equal(earlier?.generationTotal, 500);
    assert.equal(earlier?.co2Total, 300);
    assert.equal(earlier?.peakGeneration, 612);
    assert.equal(earlier?.consumptionTotal, 20);

    const recent = total.find((row) => row.date === fixture.threeDaysAgoKey);
    assert.equal(recent?.generationTotal, 700);
    assert.equal(recent?.consumptionTotal, 80);
    assert.equal(recent?.quality, "exact");

    const todayRow = total.find((row) => row.date === fixture.todayKey);
    assert.equal(todayRow?.generationTotal, 800);
    assert.equal(todayRow?.consumptionTotal, null);
    assert.equal(todayRow?.quality, "partial");
  } finally {
    await app.close();
  }
});

test("R7 month keeps its full calendar curve while other ranges stay unchanged by the profile", async () => {
  const fixture = seedRangeSemanticsFixture();
  const paired = createPairedDeviceTestContext("kn");
  const app = await buildApp();

  const monthStart = new Date(fixture.today.getFullYear(), fixture.today.getMonth(), 1);
  const daysInMonth = new Date(fixture.today.getFullYear(), fixture.today.getMonth() + 1, 0).getDate();

  try {
    const month = await readDailySummaries(app, paired.credential, "month");
    const monthDates = new Set(month.map((row) => row.date));
    for (let day = 1; day <= daysInMonth; day += 1) {
      assert.ok(monthDates.has(localDateKey(new Date(monthStart.getFullYear(), monthStart.getMonth(), day))));
    }
    assert.equal(monthDates.size, daysInMonth);
    assert.equal(month.find((row) => row.date === fixture.todayKey)?.generationTotal, 800);
    assert.equal(month.find((row) => row.date === fixture.todayKey)?.consumptionTotal, null);
  } finally {
    await app.close();
  }
});

test("R7 daily summaries without an energy profile keep the legacy range behaviour", async () => {
  const database = getDatabase();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  const today = localMidnight(new Date());
  const previousMonthFirst = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  database.prepare("INSERT INTO daily_energy_summaries (metric_scope, date, generation_total, consumption_total) VALUES ('cl', ?, ?, ?)")
    .run(localDateKey(previousMonthFirst), 10, 100);
  database.prepare("INSERT INTO daily_energy_summaries (metric_scope, date, generation_total, consumption_total) VALUES ('cl', ?, ?, ?)")
    .run(localDateKey(today), 20, 200);

  const paired = createPairedDeviceTestContext("cl");
  const app = await buildApp();
  try {
    const total = await readDailySummaries(app, paired.credential, "total");
    assert.deepEqual(total.map((row) => row.date), [localDateKey(today), localDateKey(previousMonthFirst)]);
    assert.deepEqual(total.map((row) => row.consumptionTotal), [200, 100]);
    const month = await readDailySummaries(app, paired.credential, "month");
    assert.deepEqual(month.map((row) => row.date), [localDateKey(today)]);
  } finally {
    await app.close();
  }
});

type ConsumerProfileLayout = {
  active: boolean;
  departments: Array<{ departmentId: string; memberChannelIds: string[]; nameZh: string }>;
  effectiveFrom: Date;
  revision: number;
};

function insertConsumerProfile(layout: ConsumerProfileLayout) {
  getDatabase().prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES ('kn-energy', 'kn', ?, 1, ?, 'ready', ?, ?, ?, ?, ?, ?)
  `).run(
    layout.revision,
    localTimeZone,
    layout.effectiveFrom.toISOString(),
    JSON.stringify({ coverageReview: "reviewed", kind: "meter-set", label: "觀音總錶", memberChannelIds: ["kn-main"] }),
    JSON.stringify(layout.departments.map((department) => ({ ...department, accountingIncluded: true, coverageReview: "reviewed" }))),
    JSON.stringify({ kind: "site-main" }),
    layout.active ? 1 : 0,
    layout.effectiveFrom.toISOString()
  );
}

const CONSUMER_DEPARTMENTS = [
  { departmentId: "dept-a", memberChannelIds: ["kn-a"], nameZh: "A 部門" },
  { departmentId: "dept-b", memberChannelIds: ["kn-b"], nameZh: "B 部門" }
];

/** One site, one month: readings that make the site total and both departments resolvable. */
function seedConsumerConsistencyFixture() {
  const database = getDatabase();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const closingAt = new Date(now.getTime() - 60_000);
  insertConsumerProfile({
    active: true,
    departments: CONSUMER_DEPARTMENTS,
    effectiveFrom: new Date(now.getFullYear() - 1, 0, 1),
    revision: 1
  });
  for (const [channelId, closingValue] of [["kn-main", "1000"], ["kn-a", "400"], ["kn-b", "600"]] as const) {
    seedAcceptedReading(getDatabase(), historyMeter(channelId), "0", monthStart.toISOString(), monthStart.toISOString());
    seedAcceptedReading(getDatabase(), historyMeter(channelId), closingValue, closingAt.toISOString(), closingAt.toISOString());
  }
  return { closingAt, monthStart, now, todayKey: localDateKey(localMidnight(now)) };
}

async function readJson(app: Awaited<ReturnType<typeof buildApp>>, credential: string, url: string) {
  const response = await app.inject({ cookies: { solar_device_credential: credential }, method: "GET", url });
  assert.equal(response.statusCode, 200);
  return response.json();
}

test("R5 site total, department shares and the daily curve report one period context", async () => {
  const fixture = seedConsumerConsistencyFixture();
  const paired = createPairedDeviceTestContext("kn");
  const app = await buildApp();

  try {
    const [monthHistory, shares, dayHistory, daily] = await Promise.all([
      readJson(app, paired.credential, "/api/metrics/history?range=month"),
      readJson(app, paired.credential, "/api/metrics/department-shares?range=month"),
      readJson(app, paired.credential, "/api/metrics/history?range=day"),
      readJson(app, paired.credential, "/api/metrics/daily-summary?range=month")
    ]);

    assert.equal(monthHistory.periodSummary.valueKwh, "1000");
    assert.equal(monthHistory.periodSummary.quality, "estimated-boundary");
    assert.equal(shares.profileRevision, monthHistory.periodSummary.profileRevision);
    assert.equal(shares.siteTimeZone, monthHistory.periodSummary.siteTimeZone);
    assert.equal(shares.periodStart, monthHistory.periodSummary.periodStart);
    assert.equal(shares.periodEnd, monthHistory.periodSummary.periodEnd);
    // Each request stamps its own as-of instant; the contract is the same period basis, not the same millisecond.
    assert.ok(Math.abs(Date.parse(shares.calculatedThrough) - Date.parse(monthHistory.periodSummary.calculatedThrough)) < 5_000);
    assert.equal(shares.quality, monthHistory.periodSummary.quality);
    assert.deepEqual(shares.shares.map((share: { ratio: number | null }) => share.ratio), [0.4, 0.6]);
    assert.equal(shares.unallocatedKwh, "0");

    const todayRow = daily.summaries.find((row: SummaryRow) => row.date === fixture.todayKey);
    assert.equal(todayRow?.valueKwh, dayHistory.periodSummary.quality === "exact"
      || dayHistory.periodSummary.quality === "estimated-boundary" ? dayHistory.periodSummary.valueKwh : null);
    assert.equal(todayRow?.quality, dayHistory.periodSummary.quality);
  } finally {
    await app.close();
  }
});

test("R5 a mid-month revision boundary reaches every consumer of the same period", async () => {
  const fixture = seedConsumerConsistencyFixture();
  getDatabase().prepare("UPDATE site_energy_profiles SET active = 0 WHERE revision = 1").run();
  insertConsumerProfile({
    active: true,
    departments: CONSUMER_DEPARTMENTS,
    effectiveFrom: new Date(Math.max(fixture.monthStart.getTime() + 1, fixture.now.getTime() - 3_600_000)),
    revision: 2
  });
  const paired = createPairedDeviceTestContext("kn");
  const app = await buildApp();

  try {
    const [monthHistory, shares] = await Promise.all([
      readJson(app, paired.credential, "/api/metrics/history?range=month"),
      readJson(app, paired.credential, "/api/metrics/department-shares?range=month")
    ]);

    assert.equal(monthHistory.periodSummary.valueKwh, null);
    assert.equal(monthHistory.periodSummary.quality, "partial");
    assert.ok(monthHistory.periodSummary.issues.includes("PROFILE_REVISION_BOUNDARY"));

    assert.equal(shares.quality, "partial");
    assert.equal(shares.profileRevision, monthHistory.periodSummary.profileRevision);
    assert.ok(shares.issues.includes("PROFILE_REVISION_BOUNDARY"));
    assert.deepEqual(shares.shares.map((share: { ratio: number | null }) => share.ratio), [null, null]);
    assert.deepEqual(
      shares.profileRevisionBoundaries.map((boundary: { profileRevision: number }) => boundary.profileRevision),
      monthHistory.periodSummary.profileRevisionBoundaries.map((boundary: { profileRevision: number }) => boundary.profileRevision)
    );
  } finally {
    await app.close();
  }
});

/**
 * N3 fixture: one KN day whose accepted readings prove a 300 kWh delta while its stored daily
 * summary still carries the superseded 9999 sentinel next to a generation value of 10. Management
 * and the paired display read the same rows, so the same evidence must produce the same answer.
 */
function seedLegacySentinelFixture() {
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();

  const today = localMidnight(new Date());
  const evidenceDay = addLocalDays(today, -3);

  const insertSummary = database.prepare(`
    INSERT INTO daily_energy_summaries (
      metric_scope, date, generation_total, consumption_total, self_consumption_total, co2_total,
      peak_generation, peak_generation_time, peak_consumption, peak_consumption_time
    ) VALUES ('kn', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSummary.run(localDateKey(evidenceDay), 10, 9999, 7, 5, 612, "11:00", 488, "15:00");
  insertSummary.run(localDateKey(today), 20, 5555, 14, 9, 700, "12:00", 500, "16:00");

  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES ('kn-energy', 'kn', 1, 1, ?, 'ready', ?, ?, '[]', ?, 1, ?)
  `).run(
    localTimeZone,
    new Date(today.getFullYear() - 1, 0, 1).toISOString(),
    JSON.stringify({ coverageReview: "reviewed", kind: "meter-set", label: "觀音總錶", memberChannelIds: ["kn-main"] }),
    JSON.stringify({ kind: "site-main" }),
    new Date(today.getFullYear() - 1, 0, 1).toISOString()
  );

  const meter = historyMeter("kn-main");
  for (const [date, value] of [[evidenceDay, "1000"], [addLocalDays(evidenceDay, 1), "1300"]] as const) {
    const instant = date.toISOString();
    seedAcceptedReading(database, meter, value, instant, instant);
  }

  return { evidenceDayKey: localDateKey(evidenceDay), todayKey: localDateKey(today) };
}

async function readManagementHistory(app: Awaited<ReturnType<typeof buildApp>>, metricScope: string, range: string) {
  const response = await app.inject({
    method: "GET",
    url: `/api/data-hub/energy-history?metricScope=${metricScope}&range=${range}`
  });
  assert.equal(response.statusCode, 200);
  return response.json() as {
    counters: Array<{ metricKey: string; totalValue: number | null }>;
    periodSummary: { periodStart?: string; quality: string; valueKwh: string | null } | null;
    summaries: SummaryRow[];
  };
}

test("N3 management history and the paired display agree despite a legacy sentinel", async () => {
  const fixture = seedLegacySentinelFixture();
  const paired = createPairedDeviceTestContext("kn");
  const app = await buildApp();

  try {
    const [management, display] = await Promise.all([
      readManagementHistory(app, "kn", "total"),
      readDailySummaries(app, paired.credential, "total")
    ]);

    const managementRow = management.summaries.find((row) => row.date === fixture.evidenceDayKey);
    const displayRow = display.find((row) => row.date === fixture.evidenceDayKey);

    assert.equal(displayRow?.consumptionTotal, 300);
    assert.equal(managementRow?.consumptionTotal, 300, "management chart and table must render 300, not the 9999 sentinel");
    assert.equal(managementRow?.quality, displayRow?.quality);
    assert.equal(managementRow?.quality, "exact");
    assert.equal(managementRow?.generationTotal, 10);
    assert.equal(managementRow?.co2Total, 5);
    assert.equal(managementRow?.peakGeneration, 612);

    const storedRow = getDatabase()
      .prepare("SELECT consumption_total, generation_total FROM daily_energy_summaries WHERE metric_scope = 'kn' AND date = ?")
      .get(fixture.evidenceDayKey) as { consumption_total: number; generation_total: number };
    assert.equal(storedRow.consumption_total, 9999, "the stored legacy row must stay untouched");
    assert.equal(storedRow.generation_total, 10);
  } finally {
    await app.close();
  }
});

test("N3 management history keeps the requested range date set while overlaying consumption", async () => {
  const fixture = seedLegacySentinelFixture();
  const app = await buildApp();

  try {
    const [day, week, year, total] = await Promise.all([
      readManagementHistory(app, "kn", "day"),
      readManagementHistory(app, "kn", "week"),
      readManagementHistory(app, "kn", "year"),
      readManagementHistory(app, "kn", "total")
    ]);

    assert.deepEqual(day.summaries.map((row) => row.date), [fixture.todayKey]);
    assert.deepEqual(new Set(week.summaries.map((row) => row.date)), new Set([fixture.todayKey, fixture.evidenceDayKey]));
    assert.deepEqual(new Set(year.summaries.map((row) => row.date)), new Set([fixture.todayKey, fixture.evidenceDayKey]));
    assert.deepEqual(new Set(total.summaries.map((row) => row.date)), new Set([fixture.todayKey, fixture.evidenceDayKey]));

    for (const body of [day, week, year, total]) {
      const todayRow = body.summaries.find((row) => row.date === fixture.todayKey);
      assert.equal(todayRow?.generationTotal, 20, "non-consumption fields keep their stored meaning");
      assert.equal(todayRow?.consumptionTotal, null, "an unproven day must stay null instead of the 5555 sentinel");
    }
  } finally {
    await app.close();
  }
});

test("N3 management history reads supported consumption through a null legacy column", async () => {
  const fixture = seedLegacySentinelFixture();
  getDatabase()
    .prepare("UPDATE daily_energy_summaries SET consumption_total = NULL WHERE metric_scope = 'kn'")
    .run();
  const app = await buildApp();

  try {
    const total = await readManagementHistory(app, "kn", "total");
    const row = total.summaries.find((entry) => entry.date === fixture.evidenceDayKey);
    assert.equal(row?.consumptionTotal, 300);
    assert.equal(row?.quality, "exact");
    assert.equal(row?.generationTotal, 10);
  } finally {
    await app.close();
  }
});

test("N3 management history keeps authorization and the no-profile path unchanged", async () => {
  seedLegacySentinelFixture();
  const app = await buildApp();

  try {
    const denied = await app.inject({
      method: "GET",
      remoteAddress: "198.51.100.24",
      url: "/api/data-hub/energy-history?metricScope=kn&range=total"
    });
    assert.equal(denied.statusCode, 403);

    getDatabase()
      .prepare("INSERT INTO daily_energy_summaries (metric_scope, date, generation_total, consumption_total) VALUES ('global', ?, 44, 88)")
      .run(fixtureGlobalDateKey());
    const global = await readManagementHistory(app, "global", "total");
    assert.equal(global.periodSummary, null, "a scope without a site profile keeps its legacy compatibility shape");
    assert.deepEqual(global.summaries.map((row) => row.consumptionTotal), [88]);
    assert.equal(global.summaries[0]?.quality, undefined);
  } finally {
    await app.close();
  }
});

function fixtureGlobalDateKey() {
  return localDateKey(localMidnight(new Date()));
}

/**
 * N4 fixture: a KN register that is continuous from the profile's own effective start, through the
 * current year's start and the recent-seven-date start, to a closing observation just before now.
 * Instants are derived from the real clock because the route stamps its own as-of.
 */
function seedRangeSpanFixture() {
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();

  const today = localMidnight(new Date());
  const spanStart = new Date(today.getFullYear() - 1, 0, 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const weekStart = addLocalDays(today, -6);
  const closingAt = new Date(Date.now() - 60_000);

  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES ('kn-energy', 'kn', 1, 1, ?, 'ready', ?, ?, '[]', ?, 1, ?)
  `).run(
    localTimeZone,
    spanStart.toISOString(),
    JSON.stringify({ coverageReview: "reviewed", kind: "meter-set", label: "觀音總錶", memberChannelIds: ["kn-main"] }),
    JSON.stringify({ kind: "site-main" }),
    spanStart.toISOString()
  );

  // Values increase with time whatever the calendar position of today is, so no seeded step can
  // look like an unexplained decrease in the first week of January.
  const meter = historyMeter("kn-main");
  const seeded = [spanStart, yearStart, weekStart, closingAt]
    .map((at) => at.getTime())
    .filter((at, index, all) => all.indexOf(at) === index)
    .sort((left, right) => left - right);
  const valueAt = new Map<number, number>();
  for (const [index, at] of seeded.entries()) {
    const value = 1000 + index * 300;
    valueAt.set(at, value);
    const instant = new Date(at).toISOString();
    seedAcceptedReading(database, meter, `${value}`, instant, instant);
  }

  const closingValue = valueAt.get(seeded[seeded.length - 1]!)!;
  const deltaFrom = (from: Date) => `${closingValue - valueAt.get(from.getTime())!}`;
  return { deltaFrom, spanStart, weekStart, yearStart };
}

test("N4 management history reports a canonical result for every range of a configured profile", async () => {
  seedRangeSpanFixture();
  const app = await buildApp();

  try {
    const bodies = await Promise.all(
      (["day", "week", "month", "year", "total"] as const).map(async (range) =>
        [range, await readManagementHistory(app, "kn", range)] as const
      )
    );

    for (const [range, body] of bodies) {
      assert.ok(body.periodSummary !== null, `${range} must not collapse into the no-profile shape`);
      assert.ok(typeof body.periodSummary?.quality === "string", `${range} must report a quality`);
    }
  } finally {
    await app.close();
  }
});

test("configured calendar projection failure stays canonical while the rest of management history remains readable", async () => {
  seedLegacySentinelFixture();
  const database = getDatabase();
  const app = await buildApp();
  const originalPrepare = database.prepare;
  let projectionFailures = 0;
  database.prepare = ((sql: string) => {
    if (sql.includes("consumption_projections") && projectionFailures === 0) {
      projectionFailures += 1;
      throw Object.assign(new Error("SELECT private FROM secret_table"), { code: "SQLITE_BUSY" });
    }
    return originalPrepare.call(database, sql);
  }) as typeof database.prepare;

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-hub/energy-history?metricScope=kn&range=month"
    });

    assert.equal(response.statusCode, 200, response.body);
    const body = response.json() as {
      periodSummary: { issues?: string[]; quality: string; valueKwh: string | null } | null;
      summaries: SummaryRow[];
    };
    assert.equal(projectionFailures, 1);
    assert.equal(body.periodSummary?.quality, "unavailable");
    assert.equal(body.periodSummary?.valueKwh, null);
    assert.deepEqual(body.periodSummary?.issues, ["UNRESOLVED_ACCOUNTING_PERIOD:month", "SQLITE_BUSY"]);
    assert.doesNotMatch(response.body, /private|secret_table|SELECT/);
    assert.ok(body.summaries.length > 0, "other readable history data stays in the response");
  } finally {
    database.prepare = originalPrepare;
    await app.close();
  }
});

test("a full database outage still follows the management history error envelope", async () => {
  seedLegacySentinelFixture();
  const database = getDatabase();
  const app = await buildApp();
  const originalPrepare = database.prepare;
  database.prepare = (() => {
    throw new Error("private database outage");
  }) as typeof database.prepare;

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/data-hub/energy-history?metricScope=kn&range=month"
    });

    assert.equal(response.statusCode, 500, response.body);
    const body = response.json() as { error?: string; success?: boolean };
    assert.equal(body.success, false);
    assert.equal(body.error, "Internal Server Error");
    assert.doesNotMatch(response.body, /private database outage/);
  } finally {
    database.prepare = originalPrepare;
    await app.close();
  }
});

test("N4 management history keeps the week and total spans distinct from the calendar year", async () => {
  const fixture = seedRangeSpanFixture();
  const app = await buildApp();

  try {
    const [week, year, total] = await Promise.all([
      readManagementHistory(app, "kn", "week"),
      readManagementHistory(app, "kn", "year"),
      readManagementHistory(app, "kn", "total")
    ]);

    const startOf = (body: { periodSummary: { periodStart?: string } | null }) => body.periodSummary?.periodStart;
    assert.equal(startOf(year), fixture.yearStart.toISOString());
    assert.equal(startOf(week), fixture.weekStart.toISOString(), "the week starts six dates back, not at the month or year start");
    assert.equal(startOf(total), fixture.spanStart.toISOString(), "total describes the supported accounting span");
    assert.notEqual(startOf(total), startOf(year), "total must not silently reuse the current year's start");
    assert.equal(total.periodSummary?.valueKwh, fixture.deltaFrom(fixture.spanStart));
    assert.equal(year.periodSummary?.valueKwh, fixture.deltaFrom(fixture.yearStart));
    assert.equal(week.periodSummary?.valueKwh, fixture.deltaFrom(fixture.weekStart));
  } finally {
    await app.close();
  }
});

test("N4 a configured week without evidence stays unavailable instead of zero", async () => {
  seedRangeSpanFixture();
  getDatabase().prepare("DELETE FROM meter_readings_accepted").run();
  const app = await buildApp();

  try {
    const week = await readManagementHistory(app, "kn", "week");
    assert.ok(week.periodSummary !== null, "a configured profile must still return a canonical result");
    assert.equal(week.periodSummary?.valueKwh, null);
    assert.notEqual(week.periodSummary?.quality, "exact");
  } finally {
    await app.close();
  }
});

test("N3 the management response carries every field the history consumers read", async () => {
  const fixture = seedLegacySentinelFixture();
  const app = await buildApp();

  try {
    const body = await readManagementHistory(app, "kn", "total");
    const row = body.summaries.find((entry) => entry.date === fixture.evidenceDayKey) as Record<string, unknown>;

    // EnergyHistory's cards, month curve and table read exactly these keys; the paired viewModel
    // fixtures mirror this shape, so a rename here has to break this test before it reaches a screen.
    for (const key of [
      "co2Total", "consumptionTotal", "date", "generationTotal", "peakConsumption",
      "peakConsumptionTime", "peakGeneration", "peakGenerationTime", "quality", "selfConsumptionTotal"
    ]) {
      assert.ok(key in row, `daily summary rows must expose ${key}`);
    }
    for (const key of ["quality", "valueKwh", "periodStart", "periodEnd", "calculatedThrough"]) {
      assert.ok(key in (body.periodSummary as Record<string, unknown>), `periodSummary must expose ${key}`);
    }
  } finally {
    await app.close();
  }
});

test("N3 management month keeps its stored rows and order while the display keeps its calendar padding", async () => {
  const fixture = seedLegacySentinelFixture();
  const paired = createPairedDeviceTestContext("kn");
  const app = await buildApp();

  try {
    const [management, display] = await Promise.all([
      readManagementHistory(app, "kn", "month"),
      readDailySummaries(app, paired.credential, "month")
    ]);

    const storedMonthDates = (getDatabase()
      .prepare("SELECT date FROM daily_energy_summaries WHERE metric_scope = 'kn' AND date >= ? ORDER BY date DESC")
      .all(`${fixture.todayKey.slice(0, 7)}-01`) as Array<{ date: string }>).map((row) => row.date);

    // Sharing the overlay must not hand management the display's month padding rule.
    assert.deepEqual(management.summaries.map((row) => row.date), storedMonthDates);
    assert.ok(display.length > management.summaries.length, "the display month still expands to the full calendar");
    assert.equal(display[0]?.date, `${fixture.todayKey.slice(0, 7)}-01`);

    const overlaid = management.summaries.find((row) => row.date === fixture.evidenceDayKey);
    assert.equal(overlaid?.consumptionTotal, 300);
    assert.equal(overlaid?.quality, "exact");
  } finally {
    await app.close();
  }
});

test("R5 department shares report the same span the consumption card reports", async () => {
  const fixture = seedRangeSpanFixture();
  getDatabase().prepare("UPDATE site_energy_profiles SET departments_json = ? WHERE metric_scope = 'kn'")
    .run(JSON.stringify([
      { accountingIncluded: true, coverageReview: "reviewed", departmentId: "kn-main", memberChannelIds: ["kn-main"], nameZh: "全廠" }
    ]));
  const paired = createPairedDeviceTestContext("kn");
  const app = await buildApp();

  try {
    for (const range of ["week", "total"] as const) {
      const [history, shares] = await Promise.all([
        readManagementHistory(app, "kn", range),
        readJson(app, paired.credential, `/api/metrics/department-shares?range=${range}`)
      ]);
      assert.equal(shares.periodStart, history.periodSummary?.periodStart, `${range} must not resolve two different spans`);
      assert.equal(shares.quality, history.periodSummary?.quality, range);
      assert.ok(shares.shares.length > 0, `${range} must not silently return an empty share set`);
    }

    const totalShares = await readJson(app, paired.credential, "/api/metrics/department-shares?range=total");
    assert.equal(totalShares.periodStart, fixture.spanStart.toISOString());
    assert.notEqual(totalShares.periodStart, fixture.yearStart.toISOString(), "total shares must not fall back to the calendar year");
  } finally {
    await app.close();
  }
});
