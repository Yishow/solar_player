import assert from "node:assert/strict";
import test from "node:test";
import {
  admitMeterReading,
  inventoryLegacyMapping,
  isRegisteredConsumptionPowerChannel,
  meterIdentityKey,
  normalizeEnergyToKwhDecimal,
  parseSourceTimestamp,
  physicalIdentityChanged,
  subtractDecimalString,
  validateMeterSourceWrite,
  type MeterReadingSample,
  type MeterSourceDefinition
} from "./meterReading.js";

const clMain: MeterSourceDefinition = {
  channelId: "main",
  displayNameZh: "中壢總錶",
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

function sample(overrides: Partial<MeterReadingSample> = {}): MeterReadingSample {
  return {
    dup: false,
    origin: "mqtt",
    qos: 1,
    rawValueDecimal: "10000.125",
    receivedAt: "2026-09-01T00:00:01.000Z",
    retain: false,
    sourceTimestamp: "2026-08-31T16:00:00Z",
    ...overrides
  };
}

test("E1-R1-S04 source writes reject meterRole and departmentId", () => {
  const rejected = validateMeterSourceWrite({ meterRole: "site-main", departmentId: "stamping", metricScope: "cl" });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) {
    assert.deepEqual(rejected.fields, ["meterRole", "departmentId"]);
  }
  assert.equal(validateMeterSourceWrite({ metricScope: "cl", meterId: "cl-main" }).ok, true);
  assert.equal(validateMeterSourceWrite({ metricScope: "global" }).ok, false);
});

test("E1-R5-S01 CL and KN same metric key remain different identities", () => {
  const kn = { ...clMain, metricScope: "kn" as const, meterId: "kn-main" };
  assert.notEqual(meterIdentityKey(clMain), meterIdentityKey(kn));
});

test("E1-R3-S01 Wh normalization yields exact kWh for a later 125 kWh delta", () => {
  const first = normalizeEnergyToKwhDecimal("10000000", "Wh", "1");
  const second = normalizeEnergyToKwhDecimal("10125000", "Wh", "1");
  assert.equal(first, "10000");
  assert.equal(second, "10125");
  assert.equal(subtractDecimalString(second, first), "125");
});

test("E1-R3-S02 large register increment stays exactly 0.125 kWh", () => {
  const first = normalizeEnergyToKwhDecimal("9007199254740992.000", "kWh");
  const second = normalizeEnergyToKwhDecimal("9007199254740992.125", "kWh");
  assert.equal(subtractDecimalString(second, first), "0.125");
  assert.notEqual(Number(first) - Number("9007199254740992"), 0.125);
});

test("E1-R5-S03 offset-free UTC and +08:00 resolve to the same instant", () => {
  const fromUtc = parseSourceTimestamp("2026-08-31T16:00:00", "UTC");
  const fromOffset = parseSourceTimestamp("2026-09-01T00:00:00+08:00", "UTC");
  assert.equal(fromUtc.instant, "2026-08-31T16:00:00Z");
  assert.equal(fromOffset.instant, "2026-08-31T16:00:00Z");
});

test("E1-R5-S04 missing timezone, ambiguous DST and invalid timestamps quarantine", () => {
  assert.equal(parseSourceTimestamp("2026-08-31T16:00:00", null).reason, "SOURCE_TIMESTAMP_INVALID");
  assert.equal(parseSourceTimestamp("2026-11-01T01:30:00", "America/New_York").reason, "SOURCE_TIMESTAMP_INVALID");
  assert.equal(parseSourceTimestamp("not-a-time", "UTC").reason, "SOURCE_TIMESTAMP_INVALID");
});

test("E1-R2-S03 retained packet without source time is quarantined before any accept", () => {
  const result = admitMeterReading(clMain, sample({
    retain: true,
    sourceTimestamp: null,
    rawValueDecimal: "10000"
  }));
  assert.equal(result.status, "quarantined");
  assert.equal(result.reason, "RETAINED_SOURCE_TIME_UNKNOWN");
  assert.equal(result.timestampQuality, "unknown");
});

test("E1-R5-S02 receive-time estimate requires reviewed policy and live transport", () => {
  const allowed = admitMeterReading(
    { ...clMain, timestampPolicy: "allow-receive-time-estimate" },
    sample({ sourceTimestamp: null, retain: false, dup: false, qos: 1 })
  );
  assert.equal(allowed.status, "accepted");
  assert.equal(allowed.timestampQuality, "receive-time-estimated");
  const denied = admitMeterReading(clMain, sample({ sourceTimestamp: null, retain: false, dup: false, qos: 1 }));
  assert.equal(denied.reason, "SOURCE_TIMESTAMP_REQUIRED");
});

test("E1-R5-S05 missing transport evidence cannot enable fallback", () => {
  const result = admitMeterReading(
    { ...clMain, timestampPolicy: "allow-receive-time-estimate" },
    sample({ sourceTimestamp: null, retain: null, dup: null, qos: null })
  );
  assert.equal(result.reason, "TRANSPORT_EVIDENCE_MISSING");
});

test("E1-R5-S06 dup without source time is DUPLICATE_SOURCE_TIME_UNKNOWN", () => {
  const result = admitMeterReading(
    { ...clMain, timestampPolicy: "allow-receive-time-estimate" },
    sample({ sourceTimestamp: null, retain: false, dup: true, qos: 1 })
  );
  assert.equal(result.reason, "DUPLICATE_SOURCE_TIME_UNKNOWN");
});

test("E1-R4 display-name-only does not change physical identity", () => {
  assert.equal(
    physicalIdentityChanged(clMain, { ...clMain, displayNameZh: "新名稱" } as typeof clMain),
    false
  );
  assert.equal(
    physicalIdentityChanged(clMain, { ...clMain, meterId: "cl-main-2" }),
    true
  );
});

test("E1-R6 generation keys are never registered consumption power", () => {
  assert.equal(isRegisteredConsumptionPowerChannel("factoryGeneration.powerKw"), false);
  assert.equal(isRegisteredConsumptionPowerChannel("factoryProductionPower"), true);
  assert.equal(inventoryLegacyMapping("consumptionEnergy", "kWh").reviewStatus, "needs-review");
  assert.equal(inventoryLegacyMapping("factoryGeneration.powerKw", "kW").preserved, true);
});
