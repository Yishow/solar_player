import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";

import {
    applyFreshnessToLiveMetricsSnapshot,
    readLiveMetricsSnapshot
} from "./liveMetrics.js";

const FRESHNESS_POLICY_SCHEMA = `
  CREATE TABLE freshness_policy (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    realtime_delayed_after_ms INTEGER NOT NULL,
    realtime_stale_after_ms INTEGER NOT NULL,
    realtime_historical_after_ms INTEGER NOT NULL,
    daily_delayed_after_ms INTEGER NOT NULL,
    daily_stale_after_ms INTEGER NOT NULL,
    daily_historical_after_ms INTEGER NOT NULL,
    cumulative_delayed_after_ms INTEGER NOT NULL,
    cumulative_stale_after_ms INTEGER NOT NULL,
    cumulative_historical_after_ms INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO freshness_policy VALUES (
    1, 30000, 90000, 1800000, 93600000, 172800000, 604800000,
    600000, 3600000, 86400000, '2026-01-01T00:00:00.000Z'
  );
  CREATE TABLE live_metric_values (
    metric_key TEXT PRIMARY KEY,
    value REAL,
    unit TEXT,
    timestamp DATETIME,
    quality TEXT,
    raw_payload TEXT
  );
`;

function createMetricsDatabase() {
    const database = new Database(":memory:");
    database.exec(FRESHNESS_POLICY_SCHEMA);
    return database;
}

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

// Writes the metric the way MqttClientService and MockMetricsFeedService do —
// via SQLite CURRENT_TIMESTAMP, which stores a zone-less UTC wall clock. Fixtures
// that hand-build an ISO string never exercise this path, which is why the
// timezone defect survived.
function insertViaCurrentTimestamp(database: Database.Database, metricKey: string) {
    database
        .prepare(
            `INSERT INTO live_metric_values
               (metric_key, value, unit, timestamp, quality, raw_payload)
             VALUES (?, 1234, 'kW', CURRENT_TIMESTAMP, 'good', '{}')`
        )
        .run(metricKey);
}

function readFreshnessOf(database: Database.Database, metricKey: string) {
    const snapshot = applyFreshnessToLiveMetricsSnapshot(
        readLiveMetricsSnapshot(database),
        database,
        Date.now()
    );
    const freshness = snapshot.metrics[metricKey]?.freshness;
    assert.ok(freshness, `expected freshness for ${metricKey}`);
    return freshness;
}

function withTimeZone<T>(timeZone: string, run: () => T): T {
    const previous = process.env.TZ;
    process.env.TZ = timeZone;
    try {
        return run();
    } finally {
        if (previous === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = previous;
        }
    }
}

test("a metric written via CURRENT_TIMESTAMP is live, not historical", () => {
    const database = createMetricsDatabase();

    try {
        insertViaCurrentTimestamp(database, "realTimePower");
        // Pinned to a non-UTC zone on purpose: under TZ=UTC the mis-parse is a
        // no-op, so an unpinned assertion would pass on a UTC CI even with the
        // defect present.
        const freshness = withTimeZone("Asia/Taipei", () =>
            readFreshnessOf(database, "realTimePower")
        );

        assert.equal(freshness.state, "live");
        assert.ok(
            freshness.ageMs !== null && freshness.ageMs < 30_000,
            `expected a near-zero age, got ${freshness.ageMs}`
        );
    } finally {
        database.close();
    }
});

test("CURRENT_TIMESTAMP metric age does not depend on the server time zone", () => {
    const database = createMetricsDatabase();

    try {
        insertViaCurrentTimestamp(database, "realTimePower");

        const utcAge = withTimeZone("UTC", () =>
            readFreshnessOf(database, "realTimePower").ageMs
        );
        const taipeiAge = withTimeZone("Asia/Taipei", () =>
            readFreshnessOf(database, "realTimePower").ageMs
        );

        assert.ok(utcAge !== null && taipeiAge !== null);
        assert.ok(
            Math.abs(utcAge - taipeiAge) < 5_000,
            `age differed across time zones: UTC=${utcAge} Taipei=${taipeiAge}`
        );
    } finally {
        database.close();
    }
});

test("an ISO timestamp carrying a zone designator keeps its instant", () => {
    const database = createMetricsDatabase();
    const sourceTimestamp = new Date(Date.now() - 5_000).toISOString();

    try {
        database
            .prepare(
                `INSERT INTO live_metric_values
                   (metric_key, value, unit, timestamp, quality, raw_payload)
                 VALUES ('factoryGeneration.cl.totalMwh', 42, 'MWh', ?, 'good', '{}')`
            )
            .run(sourceTimestamp);

        const freshness = readFreshnessOf(database, "factoryGeneration.cl.totalMwh");

        assert.equal(freshness.sourceTimestamp, sourceTimestamp);
        assert.equal(freshness.state, "live");
    } finally {
        database.close();
    }
});

test("the latest timestamp is chosen by instant, not by string order", () => {
    const database = createMetricsDatabase();
    const insert = database.prepare(
        `INSERT INTO live_metric_values
           (metric_key, value, unit, timestamp, quality, raw_payload)
         VALUES (?, 1, 'kW', ?, 'good', '{}')`
    );

    try {
        // Same second, but only one carries fractional digits. Lexicographically
        // "…25Z" sorts after "…25.500Z" because 'Z' > '.', so string ordering
        // would pick the older reading as the latest.
        insert.run("newerWithFraction", "2026-08-06T17:14:25.500Z");
        insert.run("olderWholeSecond", "2026-08-06 17:14:25");

        const snapshot = readLiveMetricsSnapshot(database);

        assert.equal(snapshot.timestamp, "2026-08-06T17:14:25.500Z");
    } finally {
        database.close();
    }
});

test("an unparseable timestamp does not displace a parseable one", () => {
    const database = createMetricsDatabase();
    const insert = database.prepare(
        `INSERT INTO live_metric_values
           (metric_key, value, unit, timestamp, quality, raw_payload)
         VALUES (?, 1, 'kW', ?, 'good', '{}')`
    );

    try {
        // The unparseable row is read first, so it would seed the latest
        // timestamp; a parseable row must still replace it.
        insert.run("aUnparseable", "not a timestamp");
        insert.run("bParseable", "2026-08-06T17:14:25.500Z");

        const snapshot = readLiveMetricsSnapshot(database);

        assert.equal(snapshot.timestamp, "2026-08-06T17:14:25.500Z");
    } finally {
        database.close();
    }
});

test("a snapshot of only unparseable timestamps still reads without throwing", () => {
    const database = createMetricsDatabase();

    try {
        database
            .prepare(
                `INSERT INTO live_metric_values
                   (metric_key, value, unit, timestamp, quality, raw_payload)
                 VALUES ('realTimePower', 1, 'kW', 'not a timestamp', 'good', '{}')`
            )
            .run();

        const snapshot = readLiveMetricsSnapshot(database);

        assert.equal(snapshot.timestamp, "not a timestamp");
    } finally {
        database.close();
    }
});
