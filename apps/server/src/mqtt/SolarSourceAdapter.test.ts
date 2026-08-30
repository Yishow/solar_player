import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import {
  isSolarAdapterManagedMetricIdentity,
  SolarSourceAdapter,
  SolarSourceContractError,
  parseSolarCollectorMessage
} from "./SolarSourceAdapter.js";

const observedAt = "2026-08-29T12:34:56.000Z";

function createMetricDatabase() {
  const database = new Database(":memory:");
  database.exec(`
    CREATE TABLE live_metric_values (
      metric_scope TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      value REAL,
      unit TEXT,
      timestamp TEXT,
      quality TEXT,
      raw_payload TEXT,
      PRIMARY KEY (metric_scope, metric_key)
    )
  `);
  return database;
}

test("parses a retained CL summary into scoped source-semantic metrics", () => {
  const result = parseSolarCollectorMessage(
    "solar/CL/summary",
    JSON.stringify({
      factory: "CL",
      month_mwh: 366.93,
      timestamp: observedAt,
      today_mwh: 3.49,
      total_mwh: 9986.306,
      total_power_kw: 120.5
    })
  );

  assert.deepEqual(result, {
    kind: "metrics",
    metricScope: "cl",
    payload: {
      factory: "CL",
      month_mwh: 366.93,
      timestamp: observedAt,
      today_mwh: 3.49,
      total_mwh: 9986.306,
      total_power_kw: 120.5
    },
    readings: [
      { metricKey: "factoryGeneration.powerKw", unit: "kW", value: 120.5 },
      { metricKey: "factoryGeneration.todayMwh", unit: "MWh", value: 3.49 },
      { metricKey: "factoryGeneration.monthMwh", unit: "MWh", value: 366.93 },
      { metricKey: "factoryGeneration.totalMwh", unit: "MWh", value: 9986.306 }
    ],
    sourceTimestamp: observedAt,
    sourceTopic: "solar/CL/summary",
    sourceType: "summary"
  });
});

test("keeps an incomplete KN cumulative total absent instead of fabricating a value", () => {
  const result = parseSolarCollectorMessage(
    "solar/KN/summary",
    JSON.stringify({
      factory: "KN",
      month_mwh: 265.77,
      timestamp: observedAt,
      today_mwh: 2.92,
      total_power_kw: 98.2
    })
  );

  assert.equal(result.kind, "metrics");
  assert.deepEqual(
    result.kind === "metrics" ? result.readings.map(({ metricKey }) => metricKey) : [],
    [
      "factoryGeneration.powerKw",
      "factoryGeneration.todayMwh",
      "factoryGeneration.monthMwh"
    ]
  );
});

test("parses whole-zone payloads and preserves a stable zone identity", () => {
  const result = parseSolarCollectorMessage(
    "solar/CL/zone/12",
    JSON.stringify({
      capacity_kwp: 99.5,
      factory: "CL",
      month_mwh: 8.5,
      name: "一期",
      power_kw: 42.25,
      timestamp: observedAt,
      today_hours: 3.25,
      today_kwh: 321.5,
      total_mwh: 628.07,
      zone_id: 12
    })
  );

  assert.deepEqual(result, {
    kind: "metrics",
    metricScope: "cl",
    payload: {
      capacity_kwp: 99.5,
      factory: "CL",
      month_mwh: 8.5,
      name: "一期",
      power_kw: 42.25,
      timestamp: observedAt,
      today_hours: 3.25,
      today_kwh: 321.5,
      total_mwh: 628.07,
      zone_id: 12
    },
    readings: [
      { metricKey: "solarZone.12.powerKw", unit: "kW", value: 42.25 },
      { metricKey: "solarZone.12.todayKwh", unit: "kWh", value: 321.5 },
      { metricKey: "solarZone.12.monthMwh", unit: "MWh", value: 8.5 },
      { metricKey: "solarZone.12.totalMwh", unit: "MWh", value: 628.07 },
      { metricKey: "solarZone.12.capacityKwp", unit: "kWp", value: 99.5 },
      { metricKey: "solarZone.12.todayHours", unit: "h", value: 3.25 }
    ],
    sourceTimestamp: observedAt,
    sourceTopic: "solar/CL/zone/12",
    sourceType: "zone",
    zone: { displayName: "一期", zoneId: "12" }
  });
});

test("parses status and heartbeat as diagnostics instead of numeric metrics", () => {
  assert.deepEqual(
    parseSolarCollectorMessage(
      "solar/KN/status",
      JSON.stringify({ factory: "KN", status: "online", timestamp: observedAt })
    ),
    {
      kind: "diagnostic",
      metricScope: "kn",
      payload: { factory: "KN", status: "online", timestamp: observedAt },
      sourceTopic: "solar/KN/status",
      sourceType: "status"
    }
  );
  assert.deepEqual(
    parseSolarCollectorMessage(
      "solar/KN/heartbeat",
      JSON.stringify({ factory: "KN", timestamp: observedAt })
    ),
    {
      kind: "diagnostic",
      metricScope: "kn",
      payload: { factory: "KN", timestamp: observedAt },
      sourceTopic: "solar/KN/heartbeat",
      sourceType: "heartbeat"
    }
  );
});

for (const [name, topic, payload, code] of [
  [
    "rejects a payload factory that disagrees with its topic",
    "solar/CL/summary",
    { factory: "KN", month_mwh: 1, timestamp: observedAt, today_mwh: 1, total_power_kw: 1 },
    "site-mismatch"
  ],
  [
    "rejects an unknown Solar site",
    "solar/XX/summary",
    { factory: "XX", month_mwh: 1, timestamp: observedAt, today_mwh: 1, total_power_kw: 1 },
    "unsupported-site"
  ],
  [
    "rejects an invalid source timestamp",
    "solar/CL/summary",
    { factory: "CL", month_mwh: 1, timestamp: "not-a-date", today_mwh: 1, total_power_kw: 1 },
    "invalid-timestamp"
  ]
] as const) {
  test(name, () => {
    assert.throws(
      () => parseSolarCollectorMessage(topic, JSON.stringify(payload)),
      (error) => error instanceof SolarSourceContractError && error.code === code
    );
  });
}

test("preserves a delayed retained source timestamp for downstream stale classification", () => {
  const delayedTimestamp = "2025-01-01T00:00:00.000Z";
  const result = parseSolarCollectorMessage(
    "solar/CL/summary",
    JSON.stringify({
      factory: "CL",
      month_mwh: 1,
      timestamp: delayedTimestamp,
      today_mwh: 1,
      total_power_kw: 1
    })
  );

  assert.equal(result.kind === "metrics" ? result.sourceTimestamp : null, delayedTimestamp);
});

test("recognizes only scoped Solar adapter source identities", () => {
  assert.equal(isSolarAdapterManagedMetricIdentity("cl", "factoryGeneration.powerKw"), true);
  assert.equal(isSolarAdapterManagedMetricIdentity("kn", "solarZone.roof.powerKw"), true);
  assert.equal(isSolarAdapterManagedMetricIdentity("global", "factoryGeneration.powerKw"), false);
  assert.equal(isSolarAdapterManagedMetricIdentity("global", "solarZone.roof.powerKw"), false);
  assert.equal(isSolarAdapterManagedMetricIdentity("cl", "custom.powerKw"), false);
});

test("persists one summary atomically with source timestamp and topic provenance", async () => {
  const database = createMetricDatabase();
  const adapter = new SolarSourceAdapter({ database });

  try {
    await adapter.handleMessage("solar/CL/summary", JSON.stringify({
      factory: "CL",
      month_mwh: 366.93,
      timestamp: observedAt,
      today_mwh: 3.49,
      total_mwh: 9986.306,
      total_power_kw: 120.5
    }));

    const rows = database.prepare(`
      SELECT metric_scope, metric_key, value, unit, timestamp, raw_payload
      FROM live_metric_values
      ORDER BY metric_key
    `).all() as Array<Record<string, unknown>>;
    assert.equal(rows.length, 4);
    assert.ok(rows.every((row) => row.metric_scope === "cl"));
    assert.ok(rows.every((row) => row.timestamp === observedAt));
    assert.ok(rows.every((row) =>
      JSON.parse(String(row.raw_payload)).sourceTopic === "solar/CL/summary"
    ));
  } finally {
    database.close();
  }
});

test("malformed summaries leave last-good readings unchanged", async () => {
  const database = createMetricDatabase();
  const adapter = new SolarSourceAdapter({ database });

  try {
    await adapter.handleMessage("solar/CL/summary", JSON.stringify({
      factory: "CL",
      month_mwh: 366.93,
      timestamp: observedAt,
      today_mwh: 3.49,
      total_power_kw: 120.5
    }));

    await assert.rejects(
      () => adapter.handleMessage("solar/CL/summary", JSON.stringify({
        factory: "KN",
        month_mwh: 999,
        timestamp: "not-a-date",
        today_mwh: 999,
        total_power_kw: 999
      })),
      SolarSourceContractError
    );

    assert.deepEqual(
      database.prepare(`
        SELECT metric_key, value, timestamp
        FROM live_metric_values
        ORDER BY metric_key
      `).all(),
      [
        { metric_key: "factoryGeneration.monthMwh", timestamp: observedAt, value: 366.93 },
        { metric_key: "factoryGeneration.powerKw", timestamp: observedAt, value: 120.5 },
        { metric_key: "factoryGeneration.todayMwh", timestamp: observedAt, value: 3.49 }
      ]
    );
  } finally {
    database.close();
  }
});

test("discovers the same zone id independently per site and refreshes mutable metadata", async () => {
  const database = createMetricDatabase();
  const adapter = new SolarSourceAdapter({ database });
  const zonePayload = (factory: "CL" | "KN", name: string, powerKw: number) => JSON.stringify({
    capacity_kwp: 99.5,
    factory,
    month_mwh: 8.5,
    name,
    power_kw: powerKw,
    timestamp: observedAt,
    today_hours: 3.25,
    today_kwh: 321.5,
    total_mwh: 628.07,
    zone_id: 12
  });

  try {
    await adapter.handleMessage("solar/CL/zone/12", zonePayload("CL", "一期", 42.25));
    await adapter.handleMessage("solar/KN/zone/12", zonePayload("KN", "中壢一期", 35.5));
    await adapter.handleMessage("solar/CL/zone/12", zonePayload("CL", "一期更新", 43));

    assert.deepEqual(adapter.readDiscoveredZones(), [
      {
        displayName: "一期更新",
        lastObservedFields: [
          "capacity_kwp",
          "month_mwh",
          "power_kw",
          "today_hours",
          "today_kwh",
          "total_mwh"
        ],
        metricScope: "cl",
        sourceTimestamp: observedAt,
        sourceTopic: "solar/CL/zone/12",
        zoneId: "12"
      },
      {
        displayName: "中壢一期",
        lastObservedFields: [
          "capacity_kwp",
          "month_mwh",
          "power_kw",
          "today_hours",
          "today_kwh",
          "total_mwh"
        ],
        metricScope: "kn",
        sourceTimestamp: observedAt,
        sourceTopic: "solar/KN/zone/12",
        zoneId: "12"
      }
    ]);
    assert.deepEqual(
      database.prepare(`
        SELECT metric_scope, metric_key, value
        FROM live_metric_values
        WHERE metric_key = 'solarZone.12.powerKw'
        ORDER BY metric_scope
      `).all(),
      [
        { metric_key: "solarZone.12.powerKw", metric_scope: "cl", value: 43 },
        { metric_key: "solarZone.12.powerKw", metric_scope: "kn", value: 35.5 }
      ]
    );
  } finally {
    database.close();
  }
});

test("keeps the last available zone name when a later payload omits it", async () => {
  const database = createMetricDatabase();
  const adapter = new SolarSourceAdapter({ database });

  try {
    await adapter.handleMessage("solar/CL/zone/12", JSON.stringify({
      factory: "CL",
      name: "一期",
      power_kw: 42.25,
      timestamp: observedAt,
      zone_id: 12
    }));
    await adapter.handleMessage("solar/CL/zone/12", JSON.stringify({
      factory: "CL",
      power_kw: 43,
      timestamp: "2026-08-29T12:35:56.000Z",
      zone_id: 12
    }));

    assert.equal(adapter.readDiscoveredZones()[0]?.displayName, "一期");
  } finally {
    database.close();
  }
});

test("records unsupported Solar site errors as bounded management diagnostics", async () => {
  const database = createMetricDatabase();
  const adapter = new SolarSourceAdapter({
    database,
    now: () => new Date("2026-08-29T12:36:00.000Z")
  });

  try {
    await assert.rejects(
      () => adapter.handleMessage("solar/XX/summary", JSON.stringify({ factory: "XX" })),
      SolarSourceContractError
    );

    assert.deepEqual(adapter.readContractErrors(), [{
      code: "unsupported-site",
      message: "Unsupported Solar site: XX",
      observedAt: "2026-08-29T12:36:00.000Z",
      sourceTopic: "solar/XX/summary"
    }]);
  } finally {
    database.close();
  }
});

test("tracks source health diagnostics without creating numeric health metrics", async () => {
  const database = createMetricDatabase();
  let nowMs = Date.parse("2026-08-29T12:35:00.000Z");
  const adapter = new SolarSourceAdapter({
    database,
    healthTimeoutMs: 60_000,
    now: () => new Date(nowMs)
  });

  try {
    await adapter.handleMessage(
      "solar/CL/status",
      JSON.stringify({ factory: "CL", status: "online", timestamp: observedAt })
    );
    await adapter.handleMessage(
      "solar/CL/heartbeat",
      JSON.stringify({ factory: "CL", timestamp: observedAt })
    );
    await adapter.handleMessage("solar/CL/summary", JSON.stringify({
      factory: "CL",
      month_mwh: 366.93,
      timestamp: observedAt,
      today_mwh: 3.49,
      total_power_kw: 120.5
    }));
    await adapter.handleMessage("solar/CL/zone/12", JSON.stringify({
      factory: "CL",
      name: "一期",
      power_kw: 42.25,
      timestamp: observedAt,
      zone_id: 12
    }));
    await adapter.handleMessage(
      "solar/CL/alert",
      JSON.stringify({ factory: "CL", message: "inverter warning", timestamp: observedAt })
    );

    const cl = adapter.readSourceDiagnostics().find(({ metricScope }) => metricScope === "cl");
    assert.deepEqual(cl, {
      discoveredZoneCount: 1,
      health: "healthy",
      lastAlert: "inverter warning",
      lastError: null,
      lastGoodSummaryAt: observedAt,
      lastHeartbeatAt: "2026-08-29T12:35:00.000Z",
      lastStatus: "online",
      metricScope: "cl",
      ownership: "managed",
      sourceId: "solar-collector",
      sourceTimestamp: observedAt,
      sourceTopic: "solar/CL/summary"
    });
    const healthMetricCount = database
      .prepare("SELECT COUNT(*) AS count FROM live_metric_values WHERE metric_key LIKE 'solarSource.%'")
      .get() as { count: number };
    assert.equal(healthMetricCount.count, 0);

    nowMs += 60_001;
    assert.equal(
      adapter.readSourceDiagnostics().find(({ metricScope }) => metricScope === "cl")?.health,
      "stale"
    );

    await assert.rejects(
      () => adapter.handleMessage("solar/CL/summary", "not-json"),
      SolarSourceContractError
    );
    assert.equal(
      adapter.readSourceDiagnostics().find(({ metricScope }) => metricScope === "cl")?.lastError?.code,
      "invalid-json"
    );
  } finally {
    database.close();
  }
});
