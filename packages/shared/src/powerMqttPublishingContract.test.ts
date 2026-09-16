import assert from "node:assert/strict";
import test from "node:test";
import {
  parseOpcPowerTopicV1,
  buildOpcPowerTopicV1,
  validatePhysicalPowerPacket,
  evaluateVirtualPowerFormula
} from "./powerMqttPublishingContract.js";
import {
  validateKnEngineeringSource
} from "./engineeringSources.js";

test("PMQ-R2-S01: Versioned opc-power-v1 topics distinguish CL and KN without collision", () => {
  const clTopic = buildOpcPowerTopicV1("cl", "raw", "meter-1");
  const knTopic = buildOpcPowerTopicV1("kn", "raw", "meter-1");

  assert.equal(clTopic, "opc/v1/cl/raw/meter-1");
  assert.equal(knTopic, "opc/v1/kn/raw/meter-1");

  const parsedCL = parseOpcPowerTopicV1(clTopic);
  assert.deepEqual(parsedCL, { site: "cl", kind: "raw", tagOrVirtualId: "meter-1" });

  const parsedKN = parseOpcPowerTopicV1(knTopic);
  assert.deepEqual(parsedKN, { site: "kn", kind: "raw", tagOrVirtualId: "meter-1" });
});

test("PMQ-R2-S03: Topic and payload mismatch is rejected", () => {
  const packet = {
    schemaVersion: 1,
    site: "cl",
    kind: "raw",
    tagId: "meter-1",
    publisherId: "pub-cl",
    value: "123.456",
    unit: "kW",
    readAt: "2026-09-16T12:00:00Z",
    publishedAt: "2026-09-16T12:00:01Z",
    sourceQuality: "good",
    readStatus: "ok"
  };

  // Expected topic is for KN, but payload is CL
  const res = validatePhysicalPowerPacket(packet, {
    expectedTopic: "opc/v1/kn/raw/meter-1"
  });

  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.match(res.errors.join(";"), /Topic site "kn" does not match payload site "cl"/);
  }
});

test("PMQ-R3: Preserves exact decimal string without float truncation", () => {
  const exactDecimal = "123456789.012345678";
  const packet = {
    schemaVersion: 1,
    site: "cl",
    kind: "raw",
    tagId: "meter-precision",
    publisherId: "pub-cl",
    value: exactDecimal,
    unit: "kW",
    readAt: "2026-09-16T12:00:00Z",
    sourceTimestamp: "2026-09-16T11:59:59Z",
    publishedAt: "2026-09-16T12:00:01Z",
    sourceQuality: "good",
    readStatus: "ok"
  };

  const res = validatePhysicalPowerPacket(packet);
  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.packet.value, exactDecimal);
    assert.equal(res.packet.sourceTimestamp, "2026-09-16T11:59:59Z");
    assert.notEqual(res.packet.readAt, res.packet.publishedAt);
  }
});

test("PMQ-R3/R4: Missing quality/status and offset-free timestamps are rejected", () => {
  const packet = {
    schemaVersion: 1,
    site: "kn",
    kind: "raw",
    tagId: "meter-quality",
    publisherId: "pub-kn",
    value: "12.5",
    unit: "kW",
    readAt: "2026-09-16T12:00:00",
    publishedAt: "2026-09-16T12:00:01Z"
  };

  const missing = validatePhysicalPowerPacket(packet);
  assert.equal(missing.valid, false);
  if (!missing.valid) {
    assert.ok(missing.errors.some((error) => error.includes("sourceQuality is required")));
    assert.ok(missing.errors.some((error) => error.includes("readStatus is required")));
    assert.ok(missing.errors.some((error) => error.includes("explicit offset or Z")));
  }

  const failed = validatePhysicalPowerPacket({
    ...packet,
    readAt: "2026-09-16T12:00:00Z",
    sourceQuality: "bad",
    readStatus: "timeout"
  });
  assert.equal(failed.valid, false);
  if (!failed.valid) {
    assert.ok(failed.errors.some((error) => error.includes("sourceQuality bad")));
    assert.ok(failed.errors.some((error) => error.includes("readStatus timeout")));
  }
});

test("PMQ-R5: Virtual power formula requires all members to be good and available", () => {
  // All good
  const allGood = evaluateVirtualPowerFormula([
    { id: "m1", value: "10.5", quality: "good" },
    { id: "m2", value: "20.5", quality: "good" }
  ]);
  assert.equal(allGood.available, true);
  assert.equal(allGood.totalKW, "31.000");

  // One member bad
  const oneBad = evaluateVirtualPowerFormula([
    { id: "m1", value: "10.5", quality: "good" },
    { id: "m2", value: "20.5", quality: "bad" }
  ]);
  assert.equal(oneBad.available, false);
  assert.equal(oneBad.totalKW, null);

  // Empty list
  const empty = evaluateVirtualPowerFormula([]);
  assert.equal(empty.available, false);
});

test("KNP-R1-S01 & KNP-R2-S01: KN begins per engineering, does not require meterId, permits staged enablement", () => {
  // Painting ready, other unconfigured
  const paintingSource = validateKnEngineeringSource({
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "painting",
    purpose: "power",
    mode: "power-gauge",
    exactTopic: "factory/guanyin/power/painting",
    unit: "kW",
    enabled: true
  });
  assert.equal(paintingSource.valid, true);

  // Unconfigured stays unconfigured and does not block painting
  const stampingDraft = validateKnEngineeringSource({
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "stamping",
    purpose: "power",
    mode: "unconfigured",
    enabled: false
  });
  assert.equal(stampingDraft.valid, true);
  if (stampingDraft.valid) {
    assert.equal(stampingDraft.source.mode, "unconfigured");
    assert.equal(stampingDraft.source.enabled, false);
  }
});
