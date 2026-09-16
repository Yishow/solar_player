import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  KnEngineeringSourcesView,
  computeDeliveryStatus,
  type EngineeringReportHeadView
} from "./KnEngineeringSourcesView";
import {
  KN_ENGINEERING_IDS,
  type EngineeringSourceDefinition
} from "@solar-display/shared";

test("KNE-R6-S01: Seven received reports shows all eight rows and missing engineering name", () => {
  // 7 engineering heads, "heavy_vehicle" missing
  const reportHeads: EngineeringReportHeadView[] = KN_ENGINEERING_IDS.filter(
    (id) => id !== "heavy_vehicle"
  ).map((id) => ({
    site: "kn",
    engineering_id: id,
    period_start: "2026-09-14T16:00:00Z",
    period_end: "2026-09-15T16:00:00Z",
    current_data_revision: 1,
    period_status: "final",
    coverage: "complete",
    quality: "valid",
    value: "100"
  }));

  const sources: EngineeringSourceDefinition[] = KN_ENGINEERING_IDS.map((id) => ({
    sourceRef: `kn-eng-${id}-energy`,
    configurationRevision: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: id,
    engineeringName: id,
    purpose: "energy",
    mode: "daily-report",
    exactTopic: `factory/guanyin/energy/daily/${id}`,
    approvedPublisherId: "pub-1",
    definitionRevision: 1,
    definitionSummary: "",
    scopeCoverage: "department-aggregate",
    unit: "kWh",
    scaleDecimal: 1,
    qualityPolicy: null,
    calendarRevision: 1,
    expectedDelivery: { dueLocalTime: "08:00", dayOffset: 1, graceMinutes: 30 },
    replayWindowDays: 93,
    enabled: true,
    reviewStatus: "approved"
  }));

  const html = renderToStaticMarkup(
    React.createElement(KnEngineeringSourcesView, { sources, reportHeads })
  );

  assert.match(html, /7 \/ 8 工程已具備完整日報/);
  assert.match(html, /部分缺失：大車工程/);

  // All 8 engineering names should be present
  assert.match(html, /沖壓工程/);
  assert.match(html, /車身工程/);
  assert.match(html, /塗裝工程/);
  assert.match(html, /裝配工程/);
  assert.match(html, /原動力/);
  assert.match(html, /事務系/);
  assert.match(html, /大車工程/);
  assert.match(html, /ED電著/);
});

test("KNE-R6-S02: Report within delivery deadline shows not-due", () => {
  const source: EngineeringSourceDefinition = {
    sourceRef: "kn-eng-stamping-energy",
    configurationRevision: 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: "stamping",
    engineeringName: "沖壓工程",
    purpose: "energy",
    mode: "daily-report",
    exactTopic: "factory/guanyin/energy/daily/stamping",
    approvedPublisherId: "pub-1",
    definitionRevision: 1,
    definitionSummary: "",
    scopeCoverage: "department-aggregate",
    unit: "kWh",
    scaleDecimal: 1,
    qualityPolicy: null,
    calendarRevision: 1,
    expectedDelivery: { dueLocalTime: "08:00", dayOffset: 1, graceMinutes: 30 },
    replayWindowDays: 93,
    enabled: true,
    reviewStatus: "approved"
  };

  // When no head is yet received, it is not-due, not disconnected
  const status = computeDeliveryStatus(source, undefined);
  assert.equal(status, "not-due");
});
