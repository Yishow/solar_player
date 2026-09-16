import assert from "node:assert/strict";
import test from "node:test";
import {
  parseStrictJson,
  validateEngineeringPacket
} from "./engineeringGate.js";
import type { EngineeringSourceDefinition } from "./engineeringSources.js";

test("parseStrictJson: rejects duplicate JSON keys", () => {
  const jsonWithDup = '{"site":"kn","power":100,"site":"cl"}';
  const res = parseStrictJson(jsonWithDup);
  assert.equal(res.valid, false);
  assert.match(res.error || "", /Duplicate JSON key detected: "site"/);
});

test("parseStrictJson: rejects payload over 64KiB", () => {
  const largeStr = "a".repeat(65 * 1024);
  const json = JSON.stringify({ data: largeStr });
  const res = parseStrictJson(json);
  assert.equal(res.valid, false);
  assert.match(res.error || "", /exceeds 64 KiB limit/);
});

test("parseStrictJson: rejects depth > 8", () => {
  let nested = '{"a": 1}';
  for (let i = 0; i < 9; i++) {
    nested = `{"level${i}": ${nested}}`;
  }
  const res = parseStrictJson(nested);
  assert.equal(res.valid, false);
  assert.match(res.error || "", /JSON depth exceeds limit of 8/);
});

test("KNE-R4-S01: valid number in invalid envelope rejects before $.value fallback", () => {
  const payload = {
    sourceKind: "engineering",
    site: "cl", // wrong site
    engineeringId: "stamping",
    publisherId: "pub-1",
    measurementKind: "power-gauge",
    unit: "kW",
    value: 123.45,
    observedAt: "2026-09-16T12:00:00Z"
  };

  const res = validateEngineeringPacket(payload, { isProduction: true });
  assert.equal(res.accepted, false);
  assert.equal(res.rejectionCode, "SCHEMA_MISMATCH");
  assert.match(res.rejectionReason || "", /Expected site "kn"/);
});

test("KNE-R4-S03: exampleOnly is rejected in production but accepted in preview", () => {
  const payload = {
    schemaVersion: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "painting",
    publisherId: "pub-1",
    definitionRevision: 1,
    measurementKind: "power-gauge",
    unit: "kW",
    value: 50.5,
    observedAt: "2026-09-16T12:00:00Z",
    quality: "valid",
    exampleOnly: true
  };

  // In production: MUST REJECT
  const prodRes = validateEngineeringPacket(payload, { isProduction: true });
  assert.equal(prodRes.accepted, false);
  assert.equal(prodRes.rejectionCode, "EXAMPLE_ONLY_IN_PRODUCTION");

  // In preview: ACCEPTS
  const previewRes = validateEngineeringPacket(payload, { isProduction: false });
  assert.equal(previewRes.accepted, true);
});

test("KNE-R4: unit mismatch rejects with UNIT_MISMATCH", () => {
  const payload = {
    schemaVersion: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "body",
    publisherId: "pub-1",
    definitionRevision: 1,
    measurementKind: "power-gauge",
    unit: "kWh", // wrong!
    value: 50.5,
    observedAt: "2026-09-16T12:00:00Z",
    quality: "valid"
  };
  const res = validateEngineeringPacket(payload, { isProduction: true });
  assert.equal(res.accepted, false);
  assert.equal(res.rejectionCode, "UNIT_MISMATCH");
});

test("EPR-R1-S03: malformed daily interval is rejected without prorating", () => {
  const payload = {
    schemaVersion: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "utility",
    publisherId: "pub-1",
    definitionRevision: 1,
    measurementKind: "interval-energy",
    unit: "kWh",
    value: "100.5",
    periodStart: "2026-09-16T00:00:00Z",
    periodEnd: "2026-09-16T12:00:00Z", // only 12 hours!
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 1,
    publishedAt: "2026-09-17T01:00:00Z"
  };
  const res = validateEngineeringPacket(payload, { isProduction: true });
  assert.equal(res.accepted, false);
  assert.equal(res.rejectionCode, "INVALID_PERIOD");
  assert.match(res.rejectionReason || "", /must span exactly one day/);
});

test("EPR-R2: correction revision requires reason", () => {
  const payload = {
    schemaVersion: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "office",
    publisherId: "pub-1",
    definitionRevision: 1,
    measurementKind: "interval-energy",
    unit: "kWh",
    value: "120.0",
    periodStart: "2026-09-15T16:00:00Z",
    periodEnd: "2026-09-16T16:00:00Z",
    periodStatus: "final",
    coverage: "complete",
    quality: "valid",
    dataRevision: 2, // correction
    publishedAt: "2026-09-17T01:00:00Z",
    reason: "" // missing reason
  };
  const res = validateEngineeringPacket(payload, { isProduction: true });
  assert.equal(res.accepted, false);
  assert.equal(res.rejectionCode, "REASON_REQUIRED");
});

const registeredPowerSource: EngineeringSourceDefinition = {
  sourceRef: "kn-eng-painting-power",
  configurationRevision: 1,
  sourceKind: "engineering",
  site: "kn",
  engineeringId: "painting",
  engineeringName: "塗裝工程",
  purpose: "power",
  mode: "power-gauge",
  exactTopic: "factory/guanyin/power/painting",
  approvedPublisherId: "pub-kn-1",
  definitionRevision: 3,
  definitionSummary: "",
  scopeCoverage: "department-aggregate",
  unit: "kW",
  scaleDecimal: 1,
  qualityPolicy: null,
  calendarRevision: 2,
  expectedDelivery: null,
  replayWindowDays: 93,
  enabled: true,
  reviewStatus: "approved"
};

test("KNE-R4: production admission requires a registered schema and exact authority", () => {
  const base = {
    schemaVersion: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "painting",
    publisherId: "pub-kn-1",
    definitionRevision: 3,
    calendarRevision: 2,
    measurementKind: "power-gauge",
    unit: "kW",
    value: "50.5",
    observedAt: "2026-09-16T12:00:00Z",
    quality: "valid"
  };

  const unregisteredSchema = validateEngineeringPacket({ ...base, schemaVersion: 999 }, { isProduction: true });
  assert.equal(unregisteredSchema.accepted, false);
  assert.equal(unregisteredSchema.rejectionCode, "SCHEMA_MISMATCH");

  const unregistered = validateEngineeringPacket(base, { isProduction: true });
  assert.equal(unregistered.accepted, false);
  assert.equal(unregistered.rejectionCode, "REGISTRATION_REQUIRED");

  const accepted = validateEngineeringPacket(base, {
    isProduction: true,
    expectedRegistration: registeredPowerSource,
    expectedTopic: registeredPowerSource.exactTopic
  });
  assert.equal(accepted.accepted, true);

  for (const [field, value] of [
    ["publisherId", "other-publisher"],
    ["definitionRevision", 4],
    ["calendarRevision", 4]
  ] as const) {
    const rejected = validateEngineeringPacket({ ...base, [field]: value }, {
      isProduction: true,
      expectedRegistration: registeredPowerSource,
      expectedTopic: registeredPowerSource.exactTopic
    });
    assert.equal(rejected.accepted, false);
  }
});
