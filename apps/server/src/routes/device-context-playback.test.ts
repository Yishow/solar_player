import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import type { FastifyInstance } from "fastify";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-device-context-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
const databasePath = process.env.DATABASE_PATH;

const [
  { buildApp },
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
  delete process.env.UPLOADS_DIR;
});

async function createPairedDevice(
  app: FastifyInstance,
  siteScope: "cl" | "kn",
  suffix: string,
  playbackProfileId?: number
) {
  const groupResponse = await app.inject({
    method: "POST",
    payload: {
      enabled: true,
      name: `${siteScope.toUpperCase()} 展示群組-${suffix}`,
      playbackProfileId,
      siteScope
    },
    url: "/api/device-groups"
  });
  assert.equal(groupResponse.statusCode, 201);
  const groupId = groupResponse.json<{ data: { id: number } }>().data.id;

  const deviceResponse = await app.inject({
    method: "POST",
    payload: {
      clientId: `lobby-${siteScope}-${suffix}`,
      displayName: `${siteScope.toUpperCase()} 大廳-${suffix}`,
      enabled: true,
      groupId
    },
    url: "/api/devices"
  });
  assert.equal(deviceResponse.statusCode, 201);
  const deviceId = deviceResponse.json<{ data: { id: number } }>().data.id;

  const issueResponse = await app.inject({
    method: "POST",
    url: `/api/devices/${deviceId}/pairing-tokens`
  });
  assert.equal(issueResponse.statusCode, 201);
  const token = issueResponse.json<{ data: { token: string } }>().data.token;

  const exchangeResponse = await app.inject({
    method: "POST",
    payload: { token },
    url: "/api/device-pairing/exchange"
  });
  assert.equal(exchangeResponse.statusCode, 204);
  const credential = exchangeResponse.cookies.find(
    (cookie) => cookie.name === "solar_device_credential"
  )?.value;
  assert.ok(credential);

  return { credential, deviceId, groupId };
}

test("formal playback runtime returns 304 for an unchanged ETag", async () => {
  const app = await buildApp();

  try {
    const paired = await createPairedDevice(app, "cl", "etag");
    const first = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      method: "GET",
      url: "/api/playback/runtime"
    });
    const etag = first.headers.etag;
    assert.equal(first.statusCode, 200);
    assert.ok(etag);
    assert.equal(first.headers["cache-control"], "private, no-cache");
    assert.equal(first.headers.vary, "Cookie");

    const unchanged = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      headers: { "if-none-match": etag },
      method: "GET",
      url: "/api/playback/runtime"
    });
    assert.equal(unchanged.statusCode, 304);
    assert.equal(unchanged.body, "");
    assert.equal(unchanged.headers["cache-control"], "private, no-cache");
    assert.equal(unchanged.headers.vary, "Cookie");
  } finally {
    await app.close();
  }
});

function seedFactoryGenerationSources() {
  const database = getDatabase();
  const timestamp = new Date().toISOString();
  const upsert = database.prepare(
    `INSERT INTO live_metric_values (
       metric_scope, metric_key, value, unit, timestamp, quality, raw_payload
     ) VALUES (?, ?, ?, ?, ?, 'good', ?)
     ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
       value = excluded.value,
       unit = excluded.unit,
       timestamp = excluded.timestamp,
       quality = excluded.quality,
       raw_payload = excluded.raw_payload`
  );

  for (const [site, values] of [
    ["cl", { monthMwh: 40, todayMwh: 10, totalMwh: 100 }],
    ["kn", { monthMwh: 80, todayMwh: 20, totalMwh: 200 }]
  ] as const) {
    for (const [suffix, value] of Object.entries(values)) {
      upsert.run(
        site,
        `factoryGeneration.${suffix}`,
        value,
        suffix === "todayMwh" ? "MWh" : "MWh",
        timestamp,
        JSON.stringify({ timestamp })
      );
    }
  }
}

test("formal playback runtime resolves Site only from the paired Device context", async () => {
  const app = await buildApp();

  try {
    const paired = await createPairedDevice(app, "cl", "01");
    const response = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      headers: { "x-site-scope": "kn" },
      method: "GET",
      url: "/api/playback/runtime?siteScope=kn"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{
      context: {
        clientId: string;
        contextRevision: string;
        deviceId: number;
        groupId: number;
        profileId: number;
        siteScope: "cl" | "kn";
      };
      effectiveRotationRevision: string;
      preview: {
        playablePages: Array<{ pageKey: string }>;
        skippedPages: Array<{ pageKey: string; skipReason: string }>;
      };
    }>();
    assert.deepEqual(
      {
        clientId: body.context.clientId,
        deviceId: body.context.deviceId,
        groupId: body.context.groupId,
        siteScope: body.context.siteScope
      },
      {
        clientId: "lobby-cl-01",
        deviceId: paired.deviceId,
        groupId: paired.groupId,
        siteScope: "cl"
      }
    );
    assert.ok(body.context.profileId > 0);
    assert.match(body.context.contextRevision, /^[a-f0-9]{64}$/u);
    assert.match(body.effectiveRotationRevision, /^[a-f0-9]{64}$/u);
    assert.equal(
      body.preview.playablePages.some(
        (page) => page.pageKey === "factory-circuit-guanyin"
      ),
      false
    );
    assert.ok(
      body.preview.skippedPages.some(
        (page) =>
          page.pageKey === "factory-circuit-guanyin" &&
          page.skipReason === "site-scope"
      )
    );
  } finally {
    await app.close();
  }
});

test("formal Story requests fail closed without a Device Credential", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-story/factory-circuit"
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ code: string }>().code, "device_unpaired");
    assert.equal("payload" in response.json<Record<string, unknown>>(), false);
  } finally {
    await app.close();
  }
});

test("a page identifier and Client claims cannot cross the Device Site Scope", async () => {
  const app = await buildApp();

  try {
    const paired = await createPairedDevice(app, "cl", "02");
    const response = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      headers: { "x-site-scope": "kn" },
      method: "GET",
      url: "/api/display-story/factory-circuit-guanyin?siteScope=kn"
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json<{ code: string }>().code, "site_scope_mismatch");
    assert.equal("payload" in response.json<Record<string, unknown>>(), false);
  } finally {
    await app.close();
  }
});

test("paired CL and KN Devices receive only their own Factory Circuit Story", async () => {
  const app = await buildApp();

  try {
    const observedAt = new Date().toISOString();
    getDatabase().prepare(`
      INSERT INTO live_metric_values (
        metric_scope, metric_key, value, unit, timestamp, quality, raw_payload
      ) VALUES
        ('cl', 'factoryCircuit.stampingPower', 11, 'kW', ?, 'good', '{}'),
        ('kn', 'factoryCircuit.stampingPower', 22, 'kW', ?, 'good', '{}')
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        value = excluded.value,
        timestamp = excluded.timestamp,
        quality = excluded.quality,
        raw_payload = excluded.raw_payload
    `).run(observedAt, observedAt);
    const cases = [
      {
        expectedPowerKw: 11,
        pageId: "factory-circuit",
        siteScope: "cl"
      },
      {
        expectedPowerKw: 22,
        pageId: "factory-circuit-guanyin",
        siteScope: "kn"
      }
    ] as const;

    for (const testCase of cases) {
      const paired = await createPairedDevice(
        app,
        testCase.siteScope,
        `story-${testCase.siteScope}`
      );
      const response = await app.inject({
        cookies: { solar_device_credential: paired.credential },
        method: "GET",
        url: `/api/display-story/${testCase.pageId}`
      });

      assert.equal(response.statusCode, 200);
      const body = response.json<{
        pageId: string;
        payload: {
          kpis: Array<{ metricKey: string; metricScope: string }>;
          slots: Array<{ livePowerKw: number | null; metricKey: string | null; metricScope: string; slotKey: string }>;
        };
      }>();
      assert.equal(body.pageId, testCase.pageId);
      assert.ok(body.payload.slots.length > 0);
      const stamping = body.payload.slots.find((slot) => slot.slotKey === "stamping");
      assert.equal(stamping?.metricKey, "factoryCircuit.stampingPower");
      assert.equal(stamping?.metricScope, testCase.siteScope);
      assert.equal(stamping?.livePowerKw, testCase.expectedPowerKw);
      assert.equal(
        body.payload.kpis.find((kpi) => kpi.metricKey === "totalPower")?.metricScope,
        testCase.siteScope
      );
    }
  } finally {
    await app.close();
  }
});

test("paired CL and KN Devices receive Site-scoped Sustainability generation", async () => {
  const app = await buildApp();

  try {
    seedFactoryGenerationSources();
    const cl = await createPairedDevice(app, "cl", "sustainability-cl");
    const kn = await createPairedDevice(app, "kn", "sustainability-kn");

    const [clResponse, knResponse] = await Promise.all([
      app.inject({
        cookies: { solar_device_credential: cl.credential },
        method: "GET",
        url: "/api/sustainability-story?period=lifetime"
      }),
      app.inject({
        cookies: { solar_device_credential: kn.credential },
        method: "GET",
        url: "/api/sustainability-story?period=lifetime"
      })
    ]);
    assert.equal(clResponse.statusCode, 200);
    assert.equal(knResponse.statusCode, 200);

    const readGeneration = (response: typeof clResponse) =>
      response.json<{
        story: {
          period: {
            bigNumbers: {
              accumulatedGenerationGwh: number | null;
              annualEnergySavingPercent: number | null;
            };
            bigNumberProvenance: {
              accumulatedGenerationGwh: { source: string };
            };
          };
        };
      }>().story.period;
    const clGeneration = readGeneration(clResponse);
    const knGeneration = readGeneration(knResponse);

    assert.equal(clGeneration.bigNumbers.accumulatedGenerationGwh, 0.1);
    assert.equal(knGeneration.bigNumbers.accumulatedGenerationGwh, 0.2);
    assert.equal(clGeneration.bigNumbers.annualEnergySavingPercent, null);
    assert.equal(knGeneration.bigNumbers.annualEnergySavingPercent, null);
    assert.match(
      clGeneration.bigNumberProvenance.accumulatedGenerationGwh.source,
      /^CL MQTT/u
    );
    assert.match(
      knGeneration.bigNumberProvenance.accumulatedGenerationGwh.source,
      /^KN MQTT/u
    );
  } finally {
    await app.close();
  }
});

test("paired CL and KN Devices do not receive unscoped Overview or Solar metrics", async () => {
  const app = await buildApp();

  try {
    seedFactoryGenerationSources();
    const timestamp = new Date().toISOString();
    const upsert = getDatabase().prepare(
      `INSERT INTO live_metric_values (
         metric_scope, metric_key, value, unit, timestamp, quality, raw_payload
       ) VALUES ('global', ?, ?, ?, ?, 'good', '{}')
       ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
         value = excluded.value,
         unit = excluded.unit,
         timestamp = excluded.timestamp,
         quality = excluded.quality,
         raw_payload = excluded.raw_payload`
    );
    for (const [metricKey, value, unit] of [
      ["realTimePower", 999, "kW"],
      ["selfConsumptionEnergy", 700, "kWh"],
      ["consumptionEnergy", 1_000, "kWh"],
      ["selfConsumptionRatio", 70, "%"],
      ["systemEfficiency", 98, "%"]
    ] as const) {
      upsert.run(metricKey, value, unit, timestamp);
    }

    const cl = await createPairedDevice(app, "cl", "story-scope-cl");
    const kn = await createPairedDevice(app, "kn", "story-scope-kn");
    const responses = await Promise.all(
      [cl, kn].flatMap((device) =>
        ["overview", "solar"].map((pageId) =>
          app.inject({
            cookies: { solar_device_credential: device.credential },
            method: "GET",
            url: `/api/display-story/${pageId}`
          })
        )
      )
    );
    for (const response of responses) {
      assert.equal(response.statusCode, 200);
    }

    type StoryPayload = {
      kpis?: Array<{
        bindingState: string;
        metricKey: string;
        metricScope: string;
        sourceTopics?: Array<{ metricKey: string; topic: string }>;
        value: string;
      }>;
      metrics?: Array<{
        bindingState: string;
        metricKey: string;
        metricScope: string;
        sourceTopics?: Array<{ metricKey: string; topic: string }>;
        value: string;
      }>;
    };
    const [clOverview, clSolar, knOverview, knSolar] = responses.map(
      (response) =>
        response.json<{
          payload: StoryPayload;
        }>().payload
    );
    const readMetric = (payload: StoryPayload, metricKey: string) =>
      [...(payload.metrics ?? []), ...(payload.kpis ?? [])].find(
        (metric) => metric.metricKey === metricKey
      );

    assert.notEqual(
      readMetric(clOverview!, "todayGeneration")?.value,
      readMetric(knOverview!, "todayGeneration")?.value
    );
    assert.equal(readMetric(clOverview!, "realTimePower")?.metricScope, "cl");
    assert.equal(readMetric(knOverview!, "realTimePower")?.metricScope, "kn");
    for (const payload of [clOverview!, knOverview!]) {
      assert.equal(readMetric(payload, "realTimePower")?.bindingState, "missing");
      assert.equal(readMetric(payload, "realTimePower")?.value, "--");
      assert.equal(readMetric(payload, "realTimePower")?.sourceTopics, undefined);
    }
    for (const payload of [clSolar!, knSolar!]) {
      assert.equal(readMetric(payload, "realTimePower")?.bindingState, "missing");
      assert.equal(readMetric(payload, "realTimePower")?.value, "--");
      assert.equal(
        readMetric(payload, "selfConsumptionRatio")?.bindingState,
        "missing"
      );
      assert.equal(readMetric(payload, "systemEfficiency")?.bindingState, "missing");
      assert.equal(readMetric(payload, "realTimePower")?.sourceTopics, undefined);
      assert.equal(
        readMetric(payload, "selfConsumptionRatio")?.sourceTopics,
        undefined
      );
      assert.equal(readMetric(payload, "systemEfficiency")?.sourceTopics, undefined);
    }
  } finally {
    await app.close();
  }
});

test("a stale CL story metric never falls back to the fresh KN value or provenance", async () => {
  const app = await buildApp();

  try {
    seedFactoryGenerationSources();
    const stalePayload = JSON.stringify({
      month_mwh: 40,
      timestamp: "2020-01-01T00:00:00.000Z",
      today_mwh: 10,
      total_mwh: 100
    });
    getDatabase().prepare(`
      UPDATE live_metric_values
      SET raw_payload = ?
      WHERE metric_scope = 'cl' AND metric_key LIKE 'factoryGeneration.%'
    `).run(stalePayload);
    const cl = await createPairedDevice(app, "cl", "stale-story-cl");
    const kn = await createPairedDevice(app, "kn", "fresh-story-kn");
    const [clResponse, knResponse] = await Promise.all([
      app.inject({ cookies: { solar_device_credential: cl.credential }, method: "GET", url: "/api/display-story/overview" }),
      app.inject({ cookies: { solar_device_credential: kn.credential }, method: "GET", url: "/api/display-story/overview" })
    ]);
    const readToday = (response: typeof clResponse) => response.json<{
      payload: { metrics: Array<{ bindingState: string; metricKey: string; sourceTopics?: unknown; value: string }> }
    }>().payload.metrics.find((metric) => metric.metricKey === "todayGeneration");
    const clToday = readToday(clResponse);
    const knToday = readToday(knResponse);
    assert.equal(clToday?.bindingState, "missing");
    assert.equal(clToday?.value, "--");
    assert.equal(clToday?.sourceTopics, undefined);
    assert.notEqual(knToday?.value, "--");
  } finally {
    await app.close();
  }
});

test("Overview trend uses the paired Device site and never falls back to another site", async () => {
  const app = await buildApp();

  try {
    const database = getDatabase();
    const now = new Date();
    const today = [
      now.getFullYear(),
      `${now.getMonth() + 1}`.padStart(2, "0"),
      `${now.getDate()}`.padStart(2, "0")
    ].join("-");
    database.prepare("DELETE FROM metric_snapshots").run();
    database.prepare(`
      INSERT INTO metric_snapshots (metric_scope, generation_power, captured_at)
      VALUES
        ('cl', 81, ?),
        ('cl', 95, ?)
    `).run(`${today} 08:00:00`, `${today} 09:00:00`);

    const cl = await createPairedDevice(app, "cl", "overview-trend-cl");
    const kn = await createPairedDevice(app, "kn", "overview-trend-kn");
    const [clResponse, knResponse] = await Promise.all([
      app.inject({ cookies: { solar_device_credential: cl.credential }, method: "GET", url: "/api/display-story/overview" }),
      app.inject({ cookies: { solar_device_credential: kn.credential }, method: "GET", url: "/api/display-story/overview" })
    ]);
    const readPower = (response: typeof clResponse) => response.json<{
      payload: { metrics: Array<{ metricKey: string; trendHours?: number[]; trendSeries?: number[] }> }
    }>().payload.metrics.find((metric) => metric.metricKey === "realTimePower");

    assert.deepEqual(readPower(clResponse)?.trendHours, [8, 9]);
    assert.deepEqual(readPower(clResponse)?.trendSeries, [81, 95]);
    assert.equal(readPower(knResponse)?.trendHours, undefined);
    assert.equal(readPower(knResponse)?.trendSeries, undefined);
  } finally {
    await app.close();
  }
});

test("formal live metric bootstrap ignores client scope claims and returns only trusted Device scope", async () => {
  const app = await buildApp();

  try {
    const database = getDatabase();
    database.prepare("DELETE FROM live_metric_values").run();
    database.prepare(`
      INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
      VALUES
        ('cl', 'realTimePower', 11, 'kW', '2026-08-29T01:00:00.000Z', 'good', '{}'),
        ('kn', 'realTimePower', 22, 'kW', '2026-08-29T01:00:00.000Z', 'good', '{}'),
        ('global', 'factoryPeakMultiplier', 1.2, 'x', '2026-08-29T01:00:00.000Z', 'good', '{}')
    `).run();
    const denied = await app.inject({ method: "GET", url: "/api/metrics/live" });
    assert.equal(denied.statusCode, 401);
    const paired = await createPairedDevice(app, "cl", "live-bootstrap-scope");
    const response = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      headers: { "x-site-scope": "kn" },
      method: "GET",
      url: "/api/metrics/live?siteScope=kn&metricScope=kn"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{
      globalSnapshot: { metricScope: string; metrics: Record<string, { value: number }> };
      metricScope: string;
      metrics: Record<string, { value: number }>;
    }>();
    assert.equal(body.metricScope, "cl");
    assert.equal(body.globalSnapshot.metricScope, "global");
    assert.equal(body.globalSnapshot.metrics.factoryPeakMultiplier?.value, 1.2);
    const metrics = body.metrics;
    assert.equal(metrics.realTimePower?.value, 11);
    assert.equal(Object.values(metrics).some((metric) => metric.value === 22), false);
  } finally {
    await app.close();
  }
});

test("CL runtime Readiness and Rotation ignore missing KN source mappings", async () => {
  const app = await buildApp();

  try {
    seedFactoryGenerationSources();
    getDatabase()
      .prepare("DELETE FROM topic_mappings WHERE metric_scope = 'kn' AND metric_key LIKE 'factoryGeneration.%'")
      .run();
    const paired = await createPairedDevice(app, "cl", "readiness-cl");

    const [readinessResponse, runtimeResponse] = await Promise.all([
      app.inject({
        cookies: { solar_device_credential: paired.credential },
        method: "GET",
        url: "/api/playback/readiness"
      }),
      app.inject({
        cookies: { solar_device_credential: paired.credential },
        method: "GET",
        url: "/api/playback/runtime"
      })
    ]);

    assert.equal(readinessResponse.statusCode, 200);
    const readinessBody = readinessResponse.json<{
      context: { siteScope: "cl" | "kn" };
      readiness: {
        findings: Array<{
          pageId: string;
          reason: string;
          requirementKey: string;
          sourceId: string | null;
          status: string;
        }>;
      };
    }>();
    assert.equal(readinessBody.context.siteScope, "cl");
    assert.equal(
      readinessBody.readiness.findings.some(
        (finding) =>
          finding.pageId === "factory-circuit-guanyin" ||
          finding.reason.includes("factoryGeneration.kn.") ||
          finding.sourceId?.includes("solar/KN/summary")
      ),
      false
    );
    assert.equal(
      readinessBody.readiness.findings.find(
        (finding) =>
          finding.pageId === "sustainability" &&
          finding.requirementKey === "accumulatedGenerationGwh"
      )?.status,
      "ready"
    );

    assert.equal(runtimeResponse.statusCode, 200);
    const runtimeBody = runtimeResponse.json<{
      preview: {
        skippedPages: Array<{
          detail: string | null;
          pageKey: string;
          skipReason: string;
        }>;
      };
    }>();
    assert.equal(
      runtimeBody.preview.skippedPages.some(
        (page) =>
          ["overview", "solar", "sustainability"].includes(page.pageKey) &&
          (page.detail?.includes("factoryGeneration.kn.") ?? false)
      ),
      false
    );
  } finally {
    await app.close();
  }
});

test("25 CL and 25 KN Devices share one Effective Rotation snapshot per Site", async () => {
  const app = await buildApp();

  try {
    const devices: Array<{
      credential: string;
      deviceId: number;
      groupId: number;
      siteScope: "cl" | "kn";
    }> = [];
    for (const siteScope of ["cl", "kn"] as const) {
      for (let index = 0; index < 25; index += 1) {
        devices.push({
          ...(await createPairedDevice(
            app,
            siteScope,
            `cache-${siteScope}-${index}`
          )),
          siteScope
        });
      }
    }

    const responses = await Promise.all(
      devices.map((device) =>
        app.inject({
          cookies: { solar_device_credential: device.credential },
          method: "GET",
          url: "/api/playback/runtime"
        })
      )
    );
    const bodies = responses.map((response, index) => {
      assert.equal(response.statusCode, 200);
      const body = response.json<{
        context: { siteScope: "cl" | "kn" };
        effectiveRotationRevision: string;
        preview: {
          playablePages: Array<{ pageKey: string }>;
          skippedPages: Array<{ pageKey: string; skipReason: string }>;
        };
      }>();
      assert.equal(body.context.siteScope, devices[index]?.siteScope);
      return body;
    });
    const clBodies = bodies.slice(0, 25);
    const knBodies = bodies.slice(25);

    assert.equal(
      new Set(clBodies.map((body) => body.effectiveRotationRevision)).size,
      1
    );
    assert.equal(
      new Set(knBodies.map((body) => body.effectiveRotationRevision)).size,
      1
    );
    assert.notEqual(
      clBodies[0]?.effectiveRotationRevision,
      knBodies[0]?.effectiveRotationRevision
    );
    for (const body of clBodies) {
      assert.equal(
        body.preview.playablePages.some(
          (page) => page.pageKey === "factory-circuit-guanyin"
        ),
        false
      );
    }
    for (const body of knBodies) {
      assert.equal(
        body.preview.playablePages.some(
          (page) => page.pageKey === "factory-circuit"
        ),
        false
      );
    }
  } finally {
    await app.close();
  }
});

test("formal runtime evaluates the Playback Profile assigned by Device context", async () => {
  const app = await buildApp();

  try {
    const database = getDatabase();
    const customProfile = database
      .prepare(
        `INSERT INTO playback_profiles (
           profile_key, name, is_default, created_at, updated_at
         ) VALUES ('night-shift', 'Night Shift', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .run();
    const profileId = Number(customProfile.lastInsertRowid);
    database
      .prepare(
        `INSERT INTO playback_profile_settings
         SELECT ?, autoplay, loop, start_page, transition_type, transition_speed,
                schedule_enabled, schedule_start, schedule_end, repeat_days,
                idle_mode, idle_timeout, 73, orientation,
                enforce_fresh_runtime_data, CURRENT_TIMESTAMP
         FROM playback_profile_settings
         WHERE profile_id = (
           SELECT id FROM playback_profiles WHERE is_default = 1 LIMIT 1
         )`
      )
      .run(profileId);
    database
      .prepare(
        `INSERT INTO playback_profile_pages
         SELECT ?, page_id,
                CASE
                  WHEN page_id = (
                    SELECT id FROM display_page_registry WHERE page_key = 'solar'
                  ) THEN 0
                  ELSE enabled
                END,
                display_order, duration_seconds, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         FROM playback_profile_pages
         WHERE profile_id = (
           SELECT id FROM playback_profiles WHERE is_default = 1 LIMIT 1
         )`
      )
      .run(profileId);
    const paired = await createPairedDevice(
      app,
      "cl",
      "assigned-profile",
      profileId
    );

    const response = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      method: "GET",
      url: "/api/playback/runtime"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{
      context: { profileId: number };
      preview: {
        playablePages: Array<{ pageKey: string }>;
        skippedPages: Array<{ pageKey: string; skipReason: string }>;
      };
      settings: { brightness: number };
    }>();
    assert.equal(body.context.profileId, profileId);
    assert.equal(body.settings.brightness, 73);
    assert.equal(
      body.preview.playablePages.some((page) => page.pageKey === "solar"),
      false
    );
    assert.ok(
      body.preview.skippedPages.some(
        (page) => page.pageKey === "solar" && page.skipReason === "disabled"
      )
    );
  } finally {
    await app.close();
  }
});

test("Effective Rotation invalidates on Freshness, Profile, and Readiness changes", async () => {
  const app = await buildApp();

  try {
    const paired = await createPairedDevice(app, "cl", "cache-invalidation");
    const readRevision = async () => {
      const response = await app.inject({
        cookies: { solar_device_credential: paired.credential },
        method: "GET",
        url: "/api/playback/runtime"
      });
      assert.equal(response.statusCode, 200);
      return response.json<{ effectiveRotationRevision: string }>()
        .effectiveRotationRevision;
    };

    const initialRevision = await readRevision();
    const timestamp = new Date().toISOString();
    const upsertMetric = getDatabase().prepare(
      `INSERT INTO live_metric_values (
         metric_scope, metric_key, value, unit, timestamp, quality, raw_payload
       ) VALUES ('cl', ?, 96, 'kW', ?, 'good', ?)
       ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
         value = excluded.value,
         timestamp = excluded.timestamp,
         quality = excluded.quality,
         raw_payload = excluded.raw_payload`
    );
    for (const metricKey of [
      "factoryGeneration.todayMwh",
      "factoryGeneration.monthMwh",
      "factoryGeneration.totalMwh"
    ]) {
      upsertMetric.run(metricKey, timestamp, JSON.stringify({ timestamp }));
    }
    const freshnessRevision = await readRevision();

    getDatabase()
      .prepare(
        `UPDATE playback_profile_pages
         SET duration_seconds = duration_seconds + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE profile_id = (
           SELECT id FROM playback_profiles WHERE is_default = 1 LIMIT 1
         )
           AND page_id = (
             SELECT id FROM display_page_registry WHERE page_key = 'overview'
           )`
      )
      .run();
    const profileRevision = await readRevision();

    getDatabase()
      .prepare(
        "DELETE FROM topic_mappings WHERE metric_scope = 'cl' AND metric_key = 'factoryGeneration.todayMwh'"
      )
      .run();
    getDatabase()
      .prepare(
        "DELETE FROM live_metric_values WHERE metric_scope = 'cl' AND metric_key = 'factoryGeneration.todayMwh'"
      )
      .run();
    const readinessRevision = await readRevision();

    assert.equal(
      new Set([
        initialRevision,
        freshnessRevision,
        profileRevision,
        readinessRevision
      ]).size,
      4
    );
  } finally {
    await app.close();
  }
});

test("revoked, disabled, and group-disabled Devices receive explicit 403 states", async () => {
  const app = await buildApp();

  try {
    const revoked = await createPairedDevice(app, "cl", "revoked");
    const revokeResponse = await app.inject({
      method: "POST",
      url: `/api/devices/${revoked.deviceId}/credentials/revoke`
    });
    assert.equal(revokeResponse.statusCode, 200);
    const revokedResponse = await app.inject({
      cookies: { solar_device_credential: revoked.credential },
      method: "GET",
      url: "/api/display-story/overview"
    });
    assert.equal(revokedResponse.statusCode, 403);
    assert.equal(
      revokedResponse.json<{ code: string }>().code,
      "credential_revoked"
    );

    const disabled = await createPairedDevice(app, "cl", "disabled");
    const disableResponse = await app.inject({
      method: "PUT",
      payload: { enabled: false },
      url: `/api/devices/${disabled.deviceId}`
    });
    assert.equal(disableResponse.statusCode, 200);
    const disabledResponse = await app.inject({
      cookies: { solar_device_credential: disabled.credential },
      method: "GET",
      url: "/api/display-story/overview"
    });
    assert.equal(disabledResponse.statusCode, 403);
    assert.equal(
      disabledResponse.json<{ code: string }>().code,
      "device_disabled"
    );

    const groupDisabled = await createPairedDevice(app, "kn", "group-disabled");
    getDatabase()
      .prepare("UPDATE device_groups SET enabled = 0 WHERE id = ?")
      .run(groupDisabled.groupId);
    const groupDisabledResponse = await app.inject({
      cookies: { solar_device_credential: groupDisabled.credential },
      method: "GET",
      url: "/api/display-story/overview"
    });
    assert.equal(groupDisabledResponse.statusCode, 403);
    assert.equal(
      groupDisabledResponse.json<{ code: string }>().code,
      "group_disabled"
    );
  } finally {
    await app.close();
  }
});

test("a Device assigned to an incomplete Profile receives profile_missing", async () => {
  const app = await buildApp();

  try {
    const paired = await createPairedDevice(app, "cl", "profile-missing");
    getDatabase()
      .prepare("DELETE FROM playback_profile_settings WHERE profile_id = ?")
      .run(
        getDatabase()
          .prepare("SELECT playback_profile_id FROM device_groups WHERE id = ?")
          .pluck()
          .get(paired.groupId)
      );

    const response = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      method: "GET",
      url: "/api/playback/runtime"
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json<{ code: string }>().code, "profile_missing");
  } finally {
    await app.close();
  }
});

async function publishProfileVersion(app: FastifyInstance, profileId: number) {
  const draft = await app.inject({
    method: "GET",
    url: `/api/playback-profiles/${profileId}/draft`
  });
  assert.equal(draft.statusCode, 200);
  const loaded = draft.json<{
    data: {
      pages: Array<{ id: number }>;
      revision: number;
      settings: { brightness: number };
    };
  }>().data;
  const saved = await app.inject({
    method: "PUT",
    payload: {
      expectedRevision: loaded.revision,
      pages: loaded.pages,
      settings: {
        ...loaded.settings,
        brightness: loaded.settings.brightness === 71 ? 72 : 71,
        startPage: loaded.pages[0]!.id
      }
    },
    url: `/api/playback-profiles/${profileId}/draft`
  });
  assert.equal(saved.statusCode, 200);
  const published = await app.inject({
    method: "POST",
    payload: {
      expectedRevision: saved.json<{ data: { revision: number } }>().data.revision
    },
    url: `/api/playback-profiles/${profileId}/publish`
  });
  assert.equal(published.statusCode, 201);
  return published.json<{ data: { id: number } }>().data.id;
}

test("published Profile Version cohort evaluates Effective Rotation once per revision", async () => {
  const { readEffectiveRotationEvaluationCount } = await import(
    "../services/displayRotationService.js"
  );
  const app = await buildApp();

  try {
    const cohort: Awaited<ReturnType<typeof createPairedDevice>>[] = [];
    for (let index = 0; index < 25; index += 1) {
      cohort.push(await createPairedDevice(app, "kn", `rotation-cohort-${index}`));
    }

    const first = await app.inject({
      cookies: { solar_device_credential: cohort[0]!.credential },
      method: "GET",
      url: "/api/playback/runtime"
    });
    assert.equal(first.statusCode, 200);
    const profileId = first.json<{ context: { profileId: number } }>()
      .context.profileId;

    const desiredVersion = await publishProfileVersion(app, profileId);

    const before = readEffectiveRotationEvaluationCount();
    for (let sweep = 0; sweep < 2; sweep += 1) {
      for (const device of cohort) {
        const response = await app.inject({
          cookies: { solar_device_credential: device.credential },
          method: "GET",
          url: "/api/playback/runtime"
        });
        assert.equal(response.statusCode, 200);
        assert.equal(
          response.json<{ profileRollout: { desiredVersion: number } }>()
            .profileRollout.desiredVersion,
          desiredVersion
        );
      }
    }
    const after = readEffectiveRotationEvaluationCount();

    assert.equal(
      after - before,
      1,
      `expected one full Effective Rotation evaluation for the cohort, observed ${after - before}`
    );
  } finally {
    await app.close();
  }
});

test("acceptance metrics header is present on a conditional 304 response", async () => {
  process.env.PHASE1_ACCEPTANCE_METRICS = "1";
  const app = await buildApp();

  try {
    const paired = await createPairedDevice(app, "cl", "metrics-304");
    const first = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      method: "GET",
      url: "/api/playback/runtime"
    });
    assert.equal(first.statusCode, 200);
    assert.ok(first.headers["x-solar-rotation-evaluations"]);
    const etag = first.headers.etag;
    assert.ok(etag);

    const conditional = await app.inject({
      cookies: { solar_device_credential: paired.credential },
      headers: { "if-none-match": etag },
      method: "GET",
      url: "/api/playback/runtime"
    });

    assert.equal(conditional.statusCode, 304);
    assert.ok(
      conditional.headers["x-solar-rotation-evaluations"],
      "conditional 304 response did not carry the acceptance metrics header"
    );
  } finally {
    delete process.env.PHASE1_ACCEPTANCE_METRICS;
    await app.close();
  }
});
