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
  assert.equal(isAllowedDiscoveryFilter("factory/kn/consumption", profile), true);
  assert.equal(isAllowedDiscoveryFilter("factory/cl/consumption", profile), false);
});

test("M1 payload inspection redacts secrets", () => {
  assert.match(redactObservationPayload('{"password":"hunter2","value":1}'), /\*\*\*\*/);
  assert.doesNotMatch(redactObservationPayload('{"password":"hunter2","value":1}'), /hunter2/);
});
