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
