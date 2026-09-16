import assert from "node:assert/strict";
import test from "node:test";
import { catalogMustNotMutateAcceptedHistory, isAllowedDiscoveryFilter, mapCatalogRetainedToSampleRetain, redactObservationPayload, toMeterReadingSample } from "./mqttObservation.js";
import type { MeterSourceDefinition } from "./meterReading.js";

const clMain: MeterSourceDefinition = {
  channelId: "main",
  enabled: true,
  energyFlowRole: "consumption",
  epochId: "epoch-1",
  expectedCadenceSeconds: 60,
  inputUnit: "kWh",
  measurementKind: "cumulative-energy",
  meterId: "cl-main",
  metricKey: "consumptionEnergy",
  metricScope: "cl",
  reviewStatus: "reviewed",
  scaleDecimal: "1",
  sourceRevision: 1,
  sourceTimestampTimeZone: "UTC",
  timestampPolicy: "source-required"
};

test("M1 catalog retained maps 1:1 onto sample.retain and never defaults missing evidence to false", () => {
  assert.equal(mapCatalogRetainedToSampleRetain(true), true);
  assert.equal(mapCatalogRetainedToSampleRetain(false), false);
  assert.equal(mapCatalogRetainedToSampleRetain(null), null);
  const sample = toMeterReadingSample({
    connectionRef: "central-broker",
    dup: null,
    exactTopic: "factory/cl/consumption",
    origin: "catalog",
    qos: null,
    receivedAt: "2026-09-01T00:00:00.000Z",
    retain: true,
    sourceTimestampEvidence: null
  }, "10000");
  assert.equal(sample.retain, true);
  assert.equal(sample.origin, "catalog");
});

test("M1 catalog and offline evidence never mutate accepted history", () => {
  const catalog = catalogMustNotMutateAcceptedHistory(clMain, {
    connectionRef: "central-broker",
    dup: false,
    exactTopic: "factory/cl/consumption",
    origin: "catalog",
    qos: 1,
    receivedAt: "2026-09-01T00:00:00.000Z",
    retain: true,
    sourceTimestampEvidence: null
  }, "10000");
  assert.equal(catalog.mutateAccepted, false);
  const offline = catalogMustNotMutateAcceptedHistory(clMain, {
    connectionRef: "paste",
    dup: false,
    exactTopic: "factory/cl/consumption",
    origin: "offline",
    qos: 1,
    receivedAt: "2026-09-01T00:00:00.000Z",
    retain: false,
    sourceTimestampEvidence: "2026-08-31T16:00:00Z"
  }, "10000");
  assert.equal(offline.mutateAccepted, false);
});

test("M1 retained 10000 without source time cannot overwrite accepted 10100", () => {
  const result = catalogMustNotMutateAcceptedHistory(clMain, {
    connectionRef: "central-broker",
    dup: false,
    exactTopic: "factory/cl/consumption",
    origin: "mqtt",
    qos: 1,
    receivedAt: "2026-09-01T00:00:00.000Z",
    retain: true,
    sourceTimestampEvidence: null
  }, "10000");
  assert.equal(result.mutateAccepted, false);
  assert.equal(result.reason, "RETAINED_SOURCE_TIME_UNKNOWN");
});

test("M1 discovery never defaults to # and requires an approved filter", () => {
  const profile = { allowedFilters: ["factory/kn/"], id: "kn-power", name: "觀音電力資料", siteScope: "kn" as const };
  assert.equal(isAllowedDiscoveryFilter("#", profile), false);
  assert.equal(isAllowedDiscoveryFilter("+", profile), false);
  assert.equal(isAllowedDiscoveryFilter("factory/kn/consumption", profile), true);
  assert.equal(isAllowedDiscoveryFilter("factory/cl/consumption", profile), false);
});

test("M1 payload inspection redacts secrets and sanitizes markup", () => {
  const result = redactObservationPayload('{"password":"hunter2","tag":"<script>alert(1)</script>"}');
  assert.match(result, /\*\*\*\*/);
  assert.doesNotMatch(result, /hunter2/);
  assert.doesNotMatch(result, /<script>/);
  assert.match(result, /&lt;script&gt;/);
});

test("DHR-R5 classifyObservationCandidate correctly identifies topic categories", async () => {
  const { classifyObservationCandidate, isManagedSolarTopic, isKnEngineeringTopic, isPhysicalRawTopic, isDiagnosticTopic } = await import("./mqttObservation.js");
  assert.equal(classifyObservationCandidate("solar/cl/summary"), "solar-managed");
  assert.equal(classifyObservationCandidate("solar/kn/zone/z1"), "solar-managed");
  assert.equal(isManagedSolarTopic("solar/kn/summary"), true);
  assert.equal(isManagedSolarTopic("solar/custom/other"), false);

  assert.equal(classifyObservationCandidate("solar/cl/status"), "diagnostic");
  assert.equal(classifyObservationCandidate("solar/kn/heartbeat"), "diagnostic");
  assert.equal(classifyObservationCandidate("opc/v1/cl/snapshot/pub1"), "diagnostic");
  assert.equal(isDiagnosticTopic("opc/v1/cl/status/pub1"), true);

  assert.equal(classifyObservationCandidate("factory/guanyin/stamping"), "engineering");
  assert.equal(classifyObservationCandidate("factory/guanyin/assembly/power"), "engineering");
  assert.equal(isKnEngineeringTopic("factory/guanyin/utility"), true);
  assert.equal(isKnEngineeringTopic("factory/guanyin/unknown_section"), false);

  assert.equal(classifyObservationCandidate("opc/v1/cl/raw/GCB_610_KWH"), "physical-raw");
  assert.equal(classifyObservationCandidate("opc/raw/VCB_15_KWH"), "physical-raw");
  assert.equal(isPhysicalRawTopic("opc/v1/cl/raw/GCB_610_KWH"), true);

  assert.equal(classifyObservationCandidate("custom/energy/meter1"), "generic");
});
