import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";
import Database from "better-sqlite3";
import {
  periodWindow,
  resolveAccountingSpanConsumption,
  resolvePeriodConsumption,
  type MeterSourceDefinition,
  type PeriodSample,
  type PeriodSelection,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { selectCalculationEvidence, selectProjectionFingerprintEvidence, toPeriodSamples } from "./accountingEvidenceSelection.js";
import { readFreshnessPolicy } from "./freshnessPolicyService.js";
import { loadAcceptedMeterReadings, seedAcceptedReading } from "./meterReadingService.js";
import { loadAcceptedSamples } from "./periodConsumptionService.js";
import { listPersistedProfiles } from "./siteEnergyProfileRepository.js";

function createDatabase(effectiveFrom = "2026-01-01T00:00:00+08:00", filename = ":memory:") {
  const database = new Database(filename);
  const migrate = (name: string) => database.exec(readFileSync(resolve(process.cwd(), `src/db/migrations/${name}.sql`), "utf8"));
  for (const name of ["033_freshness_policy", "001_init", "040_meter_reading_contracts", "046_meter_reading_evidence", "041_site_energy_profiles", "045_profile_apply_guards"]) {
    migrate(name);
  }
  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES ('kn-energy', 'kn', 1, 1, 'Asia/Taipei', 'ready', ?, ?, '[]', ?, 1, ?)
  `).run(
    effectiveFrom,
    JSON.stringify({ coverageReview: "reviewed", kind: "meter-set", label: "觀音總錶", memberChannelIds: ["kn-main"] }),
    JSON.stringify({ kind: "site-main" }),
    new Date(effectiveFrom).toISOString()
  );
  for (const name of ["042_consumption_projections", "047_projection_activation_context", "048_meter_source_lifecycle", "049_meter_source_boundary_age"]) {
    migrate(name);
  }
  return database;
}

function source(sourceRevision: number, epochId: string): MeterSourceDefinition {
  return {
    channelId: "kn-main",
    enabled: true,
    energyFlowRole: "consumption",
    epochId,
    expectedCadenceSeconds: 60,
    inputUnit: "kWh",
    measurementKind: "cumulative-energy",
    meterId: "kn-main",
    metricKey: "consumptionEnergy",
    metricScope: "kn",
    reviewStatus: "reviewed",
    scaleDecimal: "1",
    sourceRevision,
    sourceTimestampTimeZone: "UTC",
    timestampPolicy: "source-required"
  };
}

// The oracle is the existing full-load path: every accepted reading of the scope,
// resolved by the shared resolver. A candidate evidence set is equivalent only
// when the same resolver produces a field-for-field identical result from it —
// values and decimal strings, quality, ordered issues, sample identifiers,
// boundary offsets, coverage and freshness alike.
function assertEquivalentEvidence(
  database: Database.Database,
  candidate: PeriodSample[],
  resolveWith: (samples: PeriodSample[]) => unknown,
  label: string
) {
  assert.deepStrictEqual(resolveWith(candidate), resolveWith(loadAcceptedSamples(database, "kn")), label);
}

function periodResolver(database: Database.Database, period: PeriodSelection, asOf: string) {
  const profile = listPersistedProfiles(database, "kn")[0]!;
  const freshnessPolicy = readFreshnessPolicy(database).policy;
  return (samples: PeriodSample[]) => resolvePeriodConsumption({
    asOf,
    freshnessPolicy,
    meterIds: profile.siteTotal.memberChannelIds,
    period,
    profile,
    samples
  });
}

const SEPTEMBER: PeriodSelection = { kind: "month", month: 9, year: 2026 };
const SEPTEMBER_AS_OF = "2026-09-15T00:00:00Z";

function seedSeptemberRegister(database: Database.Database) {
  const definition = source(1, "epoch-1");
  seedAcceptedReading(database, definition, "100", "2026-08-31T16:00:00Z", "2026-08-31T16:00:00Z");
  seedAcceptedReading(database, definition, "150", "2026-09-05T00:00:00Z", "2026-09-05T00:00:00Z");
  seedAcceptedReading(database, definition, "175", "2026-09-14T23:59:00Z", "2026-09-14T23:59:00Z");
}

test("the differential harness accepts the full-load evidence as its own reference", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  seedSeptemberRegister(database);
  const resolveSeptember = periodResolver(database, SEPTEMBER, SEPTEMBER_AS_OF);

  const reference = resolveSeptember(loadAcceptedSamples(database, "kn")) as { valueKwh: string | null; baselineSampleIds?: string[] };
  assert.equal(reference.valueKwh, "75");
  assert.equal(reference.baselineSampleIds?.length, 1);
  assertEquivalentEvidence(database, loadAcceptedSamples(database, "kn"), resolveSeptember, "full-load evidence against itself");
});

test("the differential harness detects a candidate missing one baseline reading", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  seedSeptemberRegister(database);
  const resolveSeptember = periodResolver(database, SEPTEMBER, SEPTEMBER_AS_OF);
  const full = loadAcceptedSamples(database, "kn");
  const withoutBaseline = full.filter((sample) => sample.sourceTimestamp !== "2026-08-31T16:00:00Z");
  assert.equal(withoutBaseline.length, full.length - 1);

  const degraded = resolveSeptember(withoutBaseline) as { issues?: string[]; valueKwh: string | null };
  assert.equal(degraded.valueKwh, null);
  assert.ok(degraded.issues?.some((issue) => issue.startsWith("MISSING_BASELINE")), JSON.stringify(degraded.issues));
  assert.throws(
    () => assertEquivalentEvidence(database, withoutBaseline, resolveSeptember, "candidate without its baseline"),
    assert.AssertionError
  );
});

type ReadingFixture = {
  channel?: string;
  epoch?: string;
  id: string;
  kind?: string;
  meter?: string;
  quality?: string;
  received?: string;
  revision?: number;
  scope?: string;
  source: string | null;
  value: string;
};

function insertReading(database: Database.Database, reading: ReadingFixture) {
  database.prepare(`
    INSERT INTO meter_readings_accepted (
      reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id, raw_value_decimal,
      normalized_value_kwh, source_timestamp, received_at, timestamp_quality, origin, payload_hash, created_at, measurement_kind
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'mqtt', ?, ?, ?)
  `).run(
    reading.id,
    reading.scope ?? "kn",
    reading.meter ?? reading.channel ?? "kn-main",
    reading.channel ?? "kn-main",
    reading.revision ?? 1,
    reading.epoch ?? "epoch-1",
    reading.value,
    reading.value,
    reading.source,
    reading.received ?? reading.source ?? "2026-01-01T00:00:00Z",
    reading.quality ?? "source",
    reading.id,
    reading.received ?? reading.source ?? "2026-01-01T00:00:00Z",
    reading.kind ?? "cumulative-energy"
  );
}

type EvidenceRequest = {
  asOf: string;
  label: string;
  meterIds: string[];
  period?: PeriodSelection;
  span?: { endMs: number; startMs: number };
};

function profileWithMembers(database: Database.Database, memberChannelIds: string[]): SiteEnergyProfileV1 {
  const profile = listPersistedProfiles(database, "kn")[0]!;
  return { ...profile, siteTotal: { ...profile.siteTotal, memberChannelIds } };
}

function requestWindow(request: EvidenceRequest, siteTimeZone: string) {
  const window = request.period ? periodWindow(request.period, siteTimeZone) : request.span!;
  const throughMs = Math.min(window.endMs, Date.parse(request.asOf));
  return { fromMs: Math.min(window.startMs, throughMs), throughMs };
}

/**
 * Selects once for the union of every request — as a multi-date or multi-channel
 * caller does — and requires each request to resolve identically from that
 * bounded selection and from the full-load oracle.
 */
function assertBoundedEquivalent(database: Database.Database, requests: EvidenceRequest[]) {
  const channelIds = [...new Set(requests.flatMap((request) => request.meterIds))];
  const profile = profileWithMembers(database, channelIds);
  const windows = requests.map((request) => requestWindow(request, profile.siteTimeZone));
  const selection = selectCalculationEvidence(database, {
    channelIds,
    fromMs: Math.min(...windows.map((window) => window.fromMs)),
    scope: "kn",
    throughMs: Math.max(...windows.map((window) => window.throughMs))
  });
  const bounded = toPeriodSamples(selection.rows);
  const freshnessPolicy = readFreshnessPolicy(database).policy;
  for (const request of requests) {
    const resolveWith = (samples: PeriodSample[]) => request.period
      ? resolvePeriodConsumption({ asOf: request.asOf, freshnessPolicy, meterIds: request.meterIds, period: request.period, profile, samples })
      : resolveAccountingSpanConsumption({
        accountingContext: "server-authorized-range",
        asOf: request.asOf,
        freshnessPolicy,
        meterIds: request.meterIds,
        profile,
        samples,
        span: { ...request.span!, kind: "span", spanOf: "week" }
      });
    assertEquivalentEvidence(database, bounded, resolveWith, request.label);
  }
  return selection;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SEPTEMBER_START = "2026-08-31T16:00:00Z";

function seedUnrelatedHistory(database: Database.Database, count: number, options: { channel?: string; scope?: string } = {}) {
  const insert = database.transaction(() => {
    for (let index = 0; index < count; index += 1) {
      const instant = new Date(Date.parse("2024-01-01T00:00:00Z") + index * 3_600_000).toISOString();
      insertReading(database, { ...options, id: `unrelated-${options.scope ?? "kn"}-${options.channel ?? "kn-main"}-${index}`, source: instant, value: String(index) });
    }
  });
  insert();
}

test("the selector reads only the requested scope and channels while keeping historical identities", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  insertReading(database, { id: "a-open", source: SEPTEMBER_START, value: "100" });
  insertReading(database, { id: "a-mid", source: "2026-09-05T00:00:00Z", value: "140" });
  insertReading(database, { id: "b-first", revision: 2, epoch: "epoch-2", source: "2026-09-06T00:00:00Z", value: "5" });
  insertReading(database, { id: "b-close", revision: 2, epoch: "epoch-2", source: "2026-09-14T23:59:00Z", value: "30" });
  insertReading(database, { id: "other-channel", channel: "kn-other", source: "2026-09-10T00:00:00Z", value: "1" });
  insertReading(database, { id: "other-scope", scope: "cl", source: "2026-09-10T00:00:00Z", value: "1" });

  const selection = assertBoundedEquivalent(database, [
    { asOf: SEPTEMBER_AS_OF, label: "september across a source replacement", meterIds: ["kn-main"], period: SEPTEMBER }
  ]);

  assert.deepEqual(selection.rows.map((row) => row.reading_id).sort(), ["a-mid", "a-open", "b-close", "b-first"]);
  assert.equal(selection.fullLoad, false);
});

test("one selection serves requests for different channels and windows", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  insertReading(database, { id: "main-aug-open", source: "2026-07-31T16:00:00Z", value: "10" });
  insertReading(database, { id: "main-aug-close", source: "2026-08-31T16:00:00Z", value: "60" });
  insertReading(database, { id: "main-sep-close", source: "2026-09-14T23:59:00Z", value: "90" });
  insertReading(database, { id: "other-open", channel: "kn-other", source: SEPTEMBER_START, value: "0" });
  insertReading(database, { id: "other-close", channel: "kn-other", source: "2026-09-14T23:59:00Z", value: "7" });

  assertBoundedEquivalent(database, [
    { asOf: SEPTEMBER_AS_OF, label: "august on the main channel", meterIds: ["kn-main"], period: { kind: "month", month: 8, year: 2026 } },
    { asOf: SEPTEMBER_AS_OF, label: "september on the other channel", meterIds: ["kn-other"], period: SEPTEMBER }
  ]);
});

test("a stale opening far before the window is found without reading unrelated older history", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  seedUnrelatedHistory(database, 500);
  insertReading(database, { id: "stale-open", source: "2026-08-20T00:00:00Z", value: "100" });
  insertReading(database, { id: "sep-close", source: "2026-09-14T23:59:00Z", value: "180" });

  const selection = assertBoundedEquivalent(database, [
    { asOf: SEPTEMBER_AS_OF, label: "september with a stale opening", meterIds: ["kn-main"], period: SEPTEMBER }
  ]);

  assert.ok(selection.rows.some((row) => row.reading_id === "stale-open"));
  assert.ok(selection.rows.every((row) => !row.reading_id.startsWith("unrelated-")), "history older than the opening stays unread");
});

test("a closing before the window is found for an as-of that precedes it", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  seedUnrelatedHistory(database, 200);
  insertReading(database, { id: "long-before", source: "2026-06-01T00:00:00Z", value: "100" });
  insertReading(database, { id: "later", source: "2026-10-01T00:00:00Z", value: "150" });

  const selection = assertBoundedEquivalent(database, [
    { asOf: "2026-08-15T00:00:00Z", label: "as-of before the window opens", meterIds: ["kn-main"], period: SEPTEMBER },
    { asOf: SEPTEMBER_AS_OF, label: "no reading inside the window", meterIds: ["kn-main"], period: SEPTEMBER }
  ]);

  assert.ok(selection.rows.some((row) => row.reading_id === "long-before"));
  assert.ok(selection.rows.every((row) => !row.reading_id.startsWith("unrelated-")));
});

test("an identity whose opening precedes the read is anchored even when another identity is already there", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  seedUnrelatedHistory(database, 300);
  insertReading(database, { id: "a-open", source: "2026-08-26T16:00:00Z", value: "100" });
  insertReading(database, { id: "b-near-start", revision: 2, epoch: "epoch-2", source: "2026-08-31T12:00:00Z", value: "7" });
  insertReading(database, { id: "a-close", source: "2026-09-14T23:59:00Z", value: "180" });

  const selection = assertBoundedEquivalent(database, [
    { asOf: SEPTEMBER_AS_OF, label: "september closed by an identity opened days earlier", meterIds: ["kn-main"], period: SEPTEMBER }
  ]);

  assert.ok(selection.rows.some((row) => row.reading_id === "a-open"));
  assert.ok(selection.rows.every((row) => !row.reading_id.startsWith("unrelated-")));
});

test("a reading the calculation cannot place in time does not hide an older closing", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  insertReading(database, { id: "placeable", source: "2026-06-01T00:00:00Z", value: "100" });
  insertReading(database, { id: "unplaceable", source: null, quality: "source", received: "2026-08-20T00:00:00Z", value: "150" });

  const selection = assertBoundedEquivalent(database, [
    { asOf: SEPTEMBER_AS_OF, label: "september after an unplaceable reading", meterIds: ["kn-main"], period: SEPTEMBER }
  ]);

  assert.ok(selection.rows.some((row) => row.reading_id === "placeable"));
});

test("boundary ties, offsets, estimates, resets, late arrivals and interval energy resolve identically", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  seedUnrelatedHistory(database, 300);
  const startMs = Date.parse(SEPTEMBER_START);
  const at = (offsetMs: number) => new Date(startMs + offsetMs).toISOString();
  // Around the window opening: one millisecond either side, the instant itself,
  // and the same instant written with a +08:00 offset.
  insertReading(database, { id: "open-minus-1ms", source: at(-1), value: "99" });
  insertReading(database, { id: "open-exact", source: at(0), value: "100" });
  insertReading(database, { id: "open-offset-tie", source: "2026-09-01T00:00:00.000+08:00", value: "100" });
  insertReading(database, { id: "open-plus-1ms", source: at(1), value: "101" });
  // A receive-time estimate sharing a source instant is deduplicated by the resolver.
  insertReading(database, { id: "estimate-dup", source: null, quality: "receive-time-estimated", received: at(DAY_MS), value: "120" });
  insertReading(database, { id: "source-at-estimate", source: at(DAY_MS), value: "120" });
  insertReading(database, { id: "estimate-only", source: null, quality: "receive-time-estimated", received: at(2 * DAY_MS), value: "130" });
  // A decrease inside the window, then recovery.
  insertReading(database, { id: "reset-low", source: at(3 * DAY_MS), value: "5" });
  insertReading(database, { id: "reset-recover", source: at(4 * DAY_MS), value: "20" });
  // Late arrival: a September source instant received in October.
  insertReading(database, { id: "late", source: at(5 * DAY_MS), received: "2026-10-02T00:00:00Z", value: "25" });
  // A second identity on the same channel mid-month.
  insertReading(database, { id: "replacement", revision: 2, epoch: "epoch-2", source: at(6 * DAY_MS), value: "1" });
  insertReading(database, { id: "replacement-close", revision: 2, epoch: "epoch-2", source: at(13 * DAY_MS), value: "9" });
  // Future observations after every as-of below.
  insertReading(database, { id: "future", source: "2026-11-01T00:00:00Z", value: "999" });
  // Interval energy on its own channel.
  insertReading(database, { id: "interval-before", channel: "kn-interval", kind: "interval-energy", source: at(-DAY_MS), value: "3" });
  insertReading(database, { id: "interval-in", channel: "kn-interval", kind: "interval-energy", source: at(DAY_MS), value: "4" });
  insertReading(database, { id: "interval-at-end", channel: "kn-interval", kind: "interval-energy", source: "2026-09-30T16:00:00Z", value: "5" });

  const requests: EvidenceRequest[] = [
    { asOf: SEPTEMBER_AS_OF, label: "september main", meterIds: ["kn-main"], period: SEPTEMBER },
    { asOf: "2026-10-05T00:00:00Z", label: "closed september main", meterIds: ["kn-main"], period: SEPTEMBER },
    { asOf: "2026-10-05T00:00:00Z", label: "closed september interval", meterIds: ["kn-interval"], period: SEPTEMBER },
    { asOf: "2026-10-05T00:00:00Z", label: "week span", meterIds: ["kn-main"], span: { endMs: startMs + 7 * DAY_MS, startMs } }
  ];
  for (let day = 1; day <= 14; day += 1) {
    requests.push({ asOf: SEPTEMBER_AS_OF, label: `september ${day}`, meterIds: ["kn-main"], period: { day, kind: "day", month: 9, year: 2026 } });
  }

  const selection = assertBoundedEquivalent(database, requests);
  assert.ok(selection.rows.every((row) => !row.reading_id.startsWith("unrelated-")));
  assert.equal(selection.fullLoad, false);
});

function applyEvidenceIndexes(database: Database.Database) {
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/052_accounting_evidence_query_indexes.sql"), "utf8"));
}

function recordAcceptedReadingStatements(database: Database.Database) {
  const statements: string[] = [];
  const prepare = database.prepare.bind(database);
  database.prepare = ((sql: string) => {
    if (sql.includes("meter_readings_accepted")) statements.push(sql);
    return prepare(sql);
  }) as typeof database.prepare;
  return statements;
}

function acceptedReadingAccess(database: Database.Database, sql: string) {
  const parameters = (sql.match(/\?/g) ?? []).map(() => null);
  return (database.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...parameters) as Array<{ detail: string }>)
    .map((step) => step.detail)
    .filter((detail) => /\b(SCAN|SEARCH) (a|meter_readings_accepted)\b/.test(detail));
}

test("bounded evidence reads seek the accepted-reading instant indexes instead of scanning a scope", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  applyEvidenceIndexes(database);
  seedUnrelatedHistory(database, 1_000);
  seedSeptemberRegister(database);
  insertReading(database, { id: "october-replacement", revision: 2, epoch: "epoch-2", source: "2026-10-15T00:00:00Z", value: "1" });
  const statements = recordAcceptedReadingStatements(database);

  selectCalculationEvidence(database, { channelIds: ["kn-main"], fromMs: Date.parse(SEPTEMBER_START), scope: "kn", throughMs: Date.parse(SEPTEMBER_AS_OF) });
  // A window after a gap, whose only reading belongs to a new identity, needs every anchor seek.
  selectCalculationEvidence(database, { channelIds: ["kn-main"], fromMs: Date.parse("2026-10-10T00:00:00Z"), scope: "kn", throughMs: Date.parse("2026-10-20T00:00:00Z") });
  selectProjectionFingerprintEvidence(database, "kn", {
    calculatedThrough: SEPTEMBER_AS_OF,
    meterIds: ["kn-main"],
    periodEnd: "2026-09-30T16:00:00.000Z",
    periodStart: SEPTEMBER_START,
    profileRevision: 1,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "1"
  });

  const recorded = [...new Set(statements)];
  assert.equal(recorded.length, 5, "window, eligible identity anchor, identity listing, fingerprint identity anchor, identity window");
  for (const sql of recorded) {
    const access = acceptedReadingAccess(database, sql);
    assert.ok(access.length > 0, sql);
    for (const detail of access) {
      // Naming an instant index is not enough: a seek on its (scope, channel)
      // prefix alone still walks the channel's entire history. Each access must
      // constrain the instant itself or step between identity keys.
      assert.match(
        detail,
        /^SEARCH (a|meter_readings_accepted) USING (COVERING )?INDEX meter_readings_accepted_(channel|identity)_instant \(.*(<expr>|\(meter_id,source_revision,epoch_id\)>)/,
        `${detail}\n${sql}`
      );
    }
  }
});

test("the evidence index migration is additive and leaves accepted rows and the full-scope loader unchanged", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  seedUnrelatedHistory(database, 200);
  seedSeptemberRegister(database);
  const rawRows = () => database.prepare("SELECT * FROM meter_readings_accepted ORDER BY reading_id").all();
  const rowsBefore = rawRows();
  const loadedBefore = loadAcceptedMeterReadings(database, "kn");

  applyEvidenceIndexes(database);
  applyEvidenceIndexes(database);

  assert.deepStrictEqual(rawRows(), rowsBefore);
  assert.deepStrictEqual(loadAcceptedMeterReadings(database, "kn"), loadedBefore);
  const indexes = database.prepare("PRAGMA index_list('meter_readings_accepted')").all() as Array<{ name: string; unique: number }>;
  for (const name of ["meter_readings_accepted_channel_instant", "meter_readings_accepted_identity_instant"]) {
    assert.equal(indexes.find((index) => index.name === name)?.unique, 0, name);
  }
  seedAcceptedReading(database, source(1, "epoch-1"), "200", "2026-09-20T00:00:00Z", "2026-09-20T00:00:00Z");
  assert.equal(rawRows().length, rowsBefore.length + 1, "ingest keeps accepting readings once the indexes exist");
});

test("measured zero, missing baselines, stale boundaries and unavailable results stay equivalent", () => {
  const scenarios: Array<[string, (database: Database.Database) => void]> = [
    ["measured zero", (database) => {
      insertReading(database, { id: "zero-open", source: SEPTEMBER_START, value: "500" });
      insertReading(database, { id: "zero-close", source: "2026-09-14T23:59:00Z", value: "500" });
    }],
    ["missing baseline", (database) => {
      insertReading(database, { id: "first-inside", source: "2026-09-03T00:00:00Z", value: "10" });
      insertReading(database, { id: "later-inside", source: "2026-09-14T23:59:00Z", value: "20" });
    }],
    ["stale closing boundary", (database) => {
      insertReading(database, { id: "boundary-open", source: SEPTEMBER_START, value: "1" });
      insertReading(database, { id: "early-close", source: "2026-09-10T00:00:00Z", value: "9" });
    }],
    ["no evidence on the requested channel", () => {}]
  ];
  for (const [label, seed] of scenarios) {
    const database = createDatabase();
    seedUnrelatedHistory(database, 200, { channel: "kn-other" });
    seed(database);
    assertBoundedEquivalent(database, [
      { asOf: SEPTEMBER_AS_OF, label: `${label}: september`, meterIds: ["kn-main"], period: SEPTEMBER },
      { asOf: SEPTEMBER_AS_OF, label: `${label}: september 5`, meterIds: ["kn-main"], period: { day: 5, kind: "day", month: 9, year: 2026 } }
    ]);
    database.close();
  }
});

// Capacity fixture. The generator is seeded so every run builds the identical
// dataset; only the amount of unrelated history differs between sizes.
const CAPACITY_SEED = 20260910;
const CAPACITY_OTHER_ROWS = 1_000;
const CAPACITY_REQUEST = {
  channelIds: ["kn-main"],
  fromMs: Date.parse(SEPTEMBER_START),
  scope: "kn" as const,
  throughMs: Date.parse(SEPTEMBER_AS_OF)
};
const CAPACITY_RESULT = {
  calculatedThrough: SEPTEMBER_AS_OF,
  meterIds: ["kn-main"],
  periodEnd: "2026-09-30T16:00:00.000Z",
  periodStart: SEPTEMBER_START,
  profileRevision: 1,
  quality: "exact" as const,
  siteTimeZone: "Asia/Taipei",
  valueKwh: "75"
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The requested evidence is fixed: a prior baseline newer than every unrelated
 * reading, the September opening, a middle reading and the closing. Unrelated
 * readings are `unrelated` older readings of the same channel between 2019 and
 * 2024, plus a fixed number on another channel and in another scope — so the
 * required evidence closure is identical at every size.
 */
function seedCapacityDataset(database: Database.Database, unrelated: number) {
  const random = seededRandom(CAPACITY_SEED);
  const insert = database.prepare(`
    INSERT INTO meter_readings_accepted (
      reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id, raw_value_decimal,
      normalized_value_kwh, source_timestamp, received_at, timestamp_quality, origin, payload_hash, created_at, measurement_kind
    ) VALUES (?, ?, ?, ?, 1, 'epoch-1', ?, ?, ?, ?, 'source', 'mqtt', ?, ?, 'cumulative-energy')
  `);
  const historyStartMs = Date.parse("2019-01-01T00:00:00Z");
  const historySpanMs = Date.parse("2024-12-31T00:00:00Z") - historyStartMs;
  const row = (id: string, scope: string, channel: string, value: number, instantMs: number) => {
    const instant = new Date(instantMs).toISOString();
    insert.run(id, scope, channel, channel, String(value), String(value), instant, instant, id, instant);
  };
  database.transaction(() => {
    for (let index = 0; index < unrelated; index += 1) {
      row(`history-${index}`, "kn", "kn-main", index, historyStartMs + Math.floor(random() * historySpanMs));
    }
    for (let index = 0; index < CAPACITY_OTHER_ROWS; index += 1) {
      row(`other-channel-${index}`, "kn", "kn-other", index, historyStartMs + Math.floor(random() * historySpanMs));
      row(`other-scope-${index}`, "cl", "kn-main", index, historyStartMs + Math.floor(random() * historySpanMs));
    }
    row("required-prior", "kn", "kn-main", 90, Date.parse("2025-06-01T00:00:00Z"));
    row("required-opening", "kn", "kn-main", 100, Date.parse(SEPTEMBER_START));
    row("required-middle", "kn", "kn-main", 150, Date.parse("2026-09-10T00:00:00Z"));
    row("required-closing", "kn", "kn-main", 175, Date.parse("2026-09-14T23:59:00Z"));
  })();
}

test("the selected evidence stays identical as unrelated history grows from 10,000 to 100,000 readings", () => {
  const measure = (unrelated: number) => {
    const database = createDatabase();
    applyEvidenceIndexes(database);
    seedCapacityDataset(database, unrelated);
    const calculation = selectCalculationEvidence(database, CAPACITY_REQUEST);
    const fingerprint = selectProjectionFingerprintEvidence(database, "kn", CAPACITY_RESULT);
    assertEquivalentEvidence(database, toPeriodSamples(calculation.rows), periodResolver(database, SEPTEMBER, SEPTEMBER_AS_OF), `${unrelated} unrelated readings`);
    database.close();
    return {
      calculationMaterialized: calculation.materializedRowCount,
      calculationQueries: calculation.queryCount,
      calculationRows: calculation.rows.map((row) => row.reading_id).sort(),
      fingerprintMaterialized: fingerprint.materializedRowCount,
      fingerprintQueries: fingerprint.queryCount,
      fingerprintRows: fingerprint.rows.map((row) => row.reading_id),
      fullLoad: calculation.fullLoad || fingerprint.fullLoad
    };
  };

  const small = measure(10_000);
  const large = measure(100_000);

  assert.deepStrictEqual(large, small);
  assert.equal(small.fullLoad, false);
  assert.deepEqual(small.calculationRows, ["required-closing", "required-middle", "required-opening"]);
});

test("high-density prior history materializes only the newest required instant ties", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  applyEvidenceIndexes(database);
  const startMs = Date.parse(SEPTEMBER_START);
  database.transaction(() => {
    for (let index = 0; index < 200; index += 1) {
      insertReading(database, {
        id: `dense-prior-${index}`,
        source: new Date(startMs - (201 - index) * 60_000).toISOString(),
        value: String(index)
      });
    }
  })();
  insertReading(database, { id: "latest-prior-a", source: new Date(startMs - 1).toISOString(), value: "200" });
  insertReading(database, { id: "latest-prior-b", source: new Date(startMs - 1).toISOString(), value: "201" });
  insertReading(database, { id: "inside", source: new Date(startMs + 60_000).toISOString(), value: "202" });

  const fingerprint = selectProjectionFingerprintEvidence(database, "kn", {
    calculatedThrough: new Date(startMs + 120_000).toISOString(),
    meterIds: ["kn-main"],
    periodEnd: "2026-09-30T16:00:00.000Z",
    periodStart: SEPTEMBER_START,
    profileRevision: 1,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "1"
  });

  assert.equal(fingerprint.materializedRowCount, 3);
  assert.deepEqual(fingerprint.rows.map((row) => row.reading_id), ["inside", "latest-prior-a"]);
});

// Opt-in measurement for the capacity report: set ACCOUNTING_CAPACITY_REPORT to
// an output path. It records observations for comparison only — never a gate.
const capacityReportPath = process.env.ACCOUNTING_CAPACITY_REPORT;

test("accounting read capacity measurements", { skip: capacityReportPath ? false : "set ACCOUNTING_CAPACITY_REPORT=<path> to measure" }, () => {
  const directory = mkdtempSync(join(tmpdir(), "accounting-capacity-"));
  const summarize = (samples: number[]) => {
    const sorted = [...samples].sort((a, b) => a - b);
    // Nearest-rank p95 of seven samples is the largest one.
    return { medianMs: sorted[Math.floor(sorted.length / 2)]!, p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1]!, samplesMs: samples };
  };
  const timeRuns = (run: () => { queries: number; rows: number }) => {
    run();
    const latencies: number[] = [];
    let peakHeapUsed = 0;
    let peakRss = 0;
    let observed = { queries: 0, rows: 0 };
    for (let index = 0; index < 7; index += 1) {
      const started = performance.now();
      observed = run();
      latencies.push(Number((performance.now() - started).toFixed(3)));
      const memory = process.memoryUsage();
      peakHeapUsed = Math.max(peakHeapUsed, memory.heapUsed);
      peakRss = Math.max(peakRss, memory.rss);
    }
    return { ...observed, ...summarize(latencies), peakHeapUsedBytes: peakHeapUsed, peakRssBytes: peakRss };
  };

  try {
    const sizes = [];
    for (const unrelated of [10_000, 100_000]) {
      const plain = createDatabase(undefined, join(directory, `plain-${unrelated}.sqlite`));
      const plainSeedStarted = performance.now();
      seedCapacityDataset(plain, unrelated);
      const plainSeedMs = performance.now() - plainSeedStarted;
      plain.close();

      const indexedPath = join(directory, `indexed-${unrelated}.sqlite`);
      const database = createDatabase(undefined, indexedPath);
      applyEvidenceIndexes(database);
      const indexedSeedStarted = performance.now();
      seedCapacityDataset(database, unrelated);
      const indexedSeedMs = performance.now() - indexedSeedStarted;
      const resolveSeptember = periodResolver(database, SEPTEMBER, SEPTEMBER_AS_OF);

      const baseline = timeRuns(() => {
        const samples = loadAcceptedSamples(database, "kn");
        resolveSeptember(samples);
        return { queries: 1, rows: samples.length };
      });
      const optimized = timeRuns(() => {
        const selection = selectCalculationEvidence(database, CAPACITY_REQUEST);
        resolveSeptember(toPeriodSamples(selection.rows));
        return { queries: selection.queryCount, rows: selection.materializedRowCount };
      });
      const statements = recordAcceptedReadingStatements(database);
      selectCalculationEvidence(database, CAPACITY_REQUEST);
      selectProjectionFingerprintEvidence(database, "kn", CAPACITY_RESULT);
      const plans = [...new Set(statements.splice(0))].map((sql) => acceptedReadingAccess(database, sql));
      database.close();

      sizes.push({
        baseline,
        indexCost: {
          indexedFileBytes: statSync(indexedPath).size,
          indexedSeedMs: Number(indexedSeedMs.toFixed(1)),
          plainFileBytes: statSync(join(directory, `plain-${unrelated}.sqlite`)).size,
          plainSeedMs: Number(plainSeedMs.toFixed(1))
        },
        optimized,
        plans,
        unrelatedReadings: unrelated
      });
    }
    const probe = new Database(":memory:");
    const sqliteVersion = (probe.prepare("SELECT sqlite_version() AS version").get() as { version: string }).version;
    probe.close();
    writeFileSync(capacityReportPath!, `${JSON.stringify({
      environment: { arch: process.arch, cpu: cpus()[0]?.model ?? "unknown", node: process.version, platform: process.platform, sqlite: sqliteVersion },
      fixedOtherRows: { otherChannel: CAPACITY_OTHER_ROWS, otherScope: CAPACITY_OTHER_ROWS },
      request: { channelIds: CAPACITY_REQUEST.channelIds, from: SEPTEMBER_START, through: SEPTEMBER_AS_OF },
      runs: { measured: 7, warmUp: 1 },
      seed: CAPACITY_SEED,
      sizes
    }, null, 2)}\n`);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("a timestamp SQLite cannot evaluate falls back to the full scope read", (t) => {
  const database = createDatabase();
  t.after(() => database.close());
  seedSeptemberRegister(database);
  insertReading(database, { id: "unparseable", source: "not-a-timestamp", value: "1" });

  const selection = assertBoundedEquivalent(database, [
    { asOf: SEPTEMBER_AS_OF, label: "september with an unparseable reading", meterIds: ["kn-main"], period: SEPTEMBER }
  ]);

  assert.equal(selection.fullLoad, true);
  assert.equal(selection.rows.length, loadAcceptedMeterReadings(database, "kn").length);
});
