import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ObservationCandidate, ReceptionProfile } from "@solar-display/shared";
import { ReceptionScopePicker } from "./ReceptionScopePicker";
import { CaptureStatusBar } from "./CaptureStatusBar";
import { ReceivedCandidateList } from "./ReceivedCandidateList";
import { ReceivedSampleDrawer } from "./ReceivedSampleDrawer";
import { DataHubSourcesContent } from "./Sources";
import { defaultMqttStatus, emptySolarSources, type DataHubSourcesModel } from "./SourcesModel";

const testProfiles: ReceptionProfile[] = [
  { allowedFilters: ["factory/guanyin/"], description: "觀音八工程成果 MQTT topic", id: "kn-engineering", kind: "engineering", name: "觀音八工程成果", siteScope: "kn" },
  { allowedFilters: ["factory/kn/"], description: "觀音標準電力 topic", id: "kn-power", kind: "generic", name: "觀音電力資料", siteScope: "kn" },
  { allowedFilters: ["solar/kn/"], description: "觀音 Solar 託管資料", id: "kn-solar", kind: "solar", name: "觀音 Solar 託管資料", siteScope: "kn" }
];

const testCandidates: ObservationCandidate[] = [
  {
    candidateId: "factory/cl/meters#MAIN",
    candidateKind: "physical-raw",
    declaredTag: "MAIN",
    exactTopic: "factory/cl/meters",
    lastSeenAt: "2026-09-16T08:00:00.000Z",
    sampleRefs: ["s1"],
    schemaVersion: 1
  },
  {
    candidateId: "solar/kn/summary",
    candidateKind: "solar-managed",
    declaredTag: null,
    exactTopic: "solar/kn/summary",
    lastSeenAt: "2026-09-16T08:01:00.000Z",
    sampleRefs: ["s2"],
    schemaVersion: 1
  },
  {
    candidateId: "factory/guanyin/stamping",
    candidateKind: "engineering",
    declaredTag: null,
    exactTopic: "factory/guanyin/stamping",
    lastSeenAt: "2026-09-16T08:02:00.000Z",
    sampleRefs: ["s3"],
    schemaVersion: 1
  }
];

const baseModel: DataHubSourcesModel = {
  capabilities: { legacyReplaceSupported: false, versionedSourceEditing: true },
  collectionRevision: 1,
  solar: emptySolarSources,
  status: { ...defaultMqttStatus, broker: "mqtt://central-broker:1883", connected: true },
  topics: []
};

test("DHR-R2-S01 ReceptionScopePicker requires explicit choice when multiple profiles exist", () => {
  const html = renderToStaticMarkup(
    <ReceptionScopePicker
      onSelectProfile={() => undefined}
      profiles={testProfiles}
      selectedProfileId={null}
      siteScope="kn"
    />
  );
  assert.match(html, /data-reception-scope-picker/);
  assert.match(html, /觀音八工程成果/);
  assert.match(html, /觀音電力資料/);
  assert.match(html, /觀音 Solar 託管資料/);
  assert.match(html, /存在多個授權範圍，請明確選擇/);
  assert.doesNotMatch(html, /aria-pressed="true"/);
});

test("DHR-R2-S03 ReceptionScopePicker explains missing scope when siteScope is null", () => {
  const html = renderToStaticMarkup(
    <ReceptionScopePicker
      onSelectProfile={() => undefined}
      profiles={testProfiles}
      selectedProfileId={null}
      siteScope={null}
    />
  );
  assert.match(html, /data-reception-no-scope/);
  assert.match(html, /請先在上方選擇具體廠區/);
});

test("DHR-R3-S01 CaptureStatusBar distinguishes idle, active, and expired countdown states", () => {
  // 1. Idle state
  const idleHtml = renderToStaticMarkup(
    <CaptureStatusBar
      capture={null}
      onStart={() => undefined}
      onStop={() => undefined}
      selectedProfileName="觀音電力資料"
    />
  );
  assert.match(idleHtml, /data-capture-state="idle"/);
  assert.match(idleHtml, /開始接收資料/);

  // 2. Active state with future expiry
  const activeHtml = renderToStaticMarkup(
    <CaptureStatusBar
      capture={{
        captureId: "cap-1",
        connectionRef: "central",
        coverage: "complete",
        dropped: 0,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        featureEnabled: true,
        receptionProfileId: "kn-power",
        siteScope: "kn"
      }}
      onStart={() => undefined}
      onStop={() => undefined}
      selectedProfileName="觀音電力資料"
    />
  );
  assert.match(activeHtml, /data-capture-state="active"/);
  assert.match(activeHtml, /停止接收/);

  // 3. Expired state
  const expiredHtml = renderToStaticMarkup(
    <CaptureStatusBar
      capture={{
        captureId: "cap-1",
        connectionRef: "central",
        coverage: "complete",
        dropped: 0,
        expiresAt: new Date(Date.now() - 5000).toISOString(),
        featureEnabled: true,
        receptionProfileId: "kn-power",
        siteScope: "kn"
      }}
      onStart={() => undefined}
      onStop={() => undefined}
      selectedProfileName="觀音電力資料"
    />
  );
  assert.match(expiredHtml, /data-capture-state="expired"/);
  assert.match(expiredHtml, /重新開啟時窗/);
});

test("DHR-R4 ReceivedCandidateList displays candidates, tags, kinds and unmapped state", () => {
  const html = renderToStaticMarkup(
    <ReceivedCandidateList
      candidates={testCandidates}
      configuredMappings={[]}
      onSelectCandidate={() => undefined}
      selectedCandidateId="factory/cl/meters#MAIN"
    />
  );
  assert.match(html, /factory\/cl\/meters/);
  assert.match(html, /Tag: MAIN/);
  assert.match(html, /實體讀值/);
  assert.match(html, /Solar 託管/);
  assert.match(html, /工程成果/);
  assert.match(html, /未對應/);
  assert.match(html, /aria-pressed="true"/);
});

test("U1-R8-S02 Sources view renders dual tabs and received view on view=received or task=connect", () => {
  // 1. Configured view (default)
  const confHtml = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/settings/data-hub/sources?scope=kn"]}>
      <DataHubSourcesContent model={baseModel} />
    </MemoryRouter>
  );
  assert.match(confHtml, /data-tab-configured/);
  assert.match(confHtml, /data-tab-received/);
  assert.match(confHtml, /data-configured-sources-view/);
  assert.match(confHtml, /從接收資料新增/);

  // 2. Received view via task=connect
  const recvHtml = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/settings/data-hub/sources?scope=kn&task=connect"]}>
      <DataHubSourcesContent model={baseModel} />
    </MemoryRouter>
  );
  assert.match(recvHtml, /data-received-data-workspace/);
});

test("DHR-R3-S02 & DHR-R5-S01 ReceivedSampleDrawer handles retained evidence and solar-managed notes", () => {
  // 1. Solar managed candidate note
  const solarDrawer = renderToStaticMarkup(
    <ReceivedSampleDrawer
      candidate={testCandidates[1]!}
      captureId="cap-1"
      onClose={() => undefined}
      onCreateMapping={() => undefined}
    />
  );
  assert.match(solarDrawer, /data-solar-managed-note/);
  assert.match(solarDrawer, /Solar 系統專屬標準摘要或分區 topic/);
  assert.doesNotMatch(solarDrawer, /data-received-action-create/);

  // 2. Engineering candidate note and action
  const engDrawer = renderToStaticMarkup(
    <ReceivedSampleDrawer
      candidate={testCandidates[2]!}
      captureId="cap-1"
      onClose={() => undefined}
      onCreateMapping={() => undefined}
      onNavigateToEngineering={() => undefined}
    />
  );
  assert.match(engDrawer, /data-engineering-note/);
  assert.match(engDrawer, /data-received-action-engineering/);
  assert.match(engDrawer, /前往觀音工程來源工作台/);
});
