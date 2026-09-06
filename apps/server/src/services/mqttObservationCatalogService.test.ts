import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { seedAcceptedReading, countAcceptedReadings } from "./meterReadingService.js";
import {
  listReceptionProfiles,
  proveCatalogDoesNotWriteAcceptedHistory,
  startCapture,
  stopCapture,
  tapCatalogObservation
} from "./mqttObservationCatalogService.js";

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

test("M1 reception profiles never include broker passwords", () => {
  const listed = JSON.stringify(listReceptionProfiles());
  assert.doesNotMatch(listed, /password|secret/i);
  assert.match(listed, /觀音電力資料/);
});

test("M1 capture refuses unapproved filters and default #", () => {
  process.env.MQTT_OBSERVATION_CATALOG = "1";
  assert.throws(
    () => startCapture({ connectionRef: "central", filter: "#", receptionProfileId: "kn-power", siteScope: "kn" }),
    /SUBSCRIPTION_REFUSED/
  );
  const session = startCapture({
    connectionRef: "central",
    filter: "factory/kn/consumption",
    receptionProfileId: "kn-power",
    siteScope: "kn"
  });
  assert.equal(session.coverage, "no-traffic");
  stopCapture(session.captureId);
});

test("M1 catalog tap of retained 10000 does not change accepted 10100 rows", () => {
  process.env.MQTT_OBSERVATION_CATALOG = "1";
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
  seedAcceptedReading(database, clMain, "10100", "2026-08-31T17:00:00Z", "2026-08-31T17:00:01.000Z");
  const proof = proveCatalogDoesNotWriteAcceptedHistory(database, clMain, {
    connectionRef: "central",
    dup: false,
    exactTopic: "factory/cl/consumption",
    origin: "catalog",
    qos: 1,
    receivedAt: "2026-09-01T00:00:00.000Z",
    retain: true,
    sourceTimestampEvidence: null
  });
  assert.equal(proof.decision.mutateAccepted, false);
  assert.equal(proof.after, proof.before);
  assert.equal(countAcceptedReadings(database, clMain), 1);
  const session = startCapture({
    connectionRef: "central",
    filter: "factory/cl/consumption",
    receptionProfileId: "cl-power",
    siteScope: "cl"
  });
  tapCatalogObservation(session.captureId, proof.decision && {
    connectionRef: "central",
    dup: false,
    exactTopic: "factory/cl/consumption",
    origin: "catalog",
    qos: 1,
    receivedAt: "2026-09-01T00:00:00.000Z",
    retain: true,
    sourceTimestampEvidence: null
  }, '{"value":10000}');
  assert.equal(countAcceptedReadings(database, clMain), 1);
  stopCapture(session.captureId);
  database.close();
});
