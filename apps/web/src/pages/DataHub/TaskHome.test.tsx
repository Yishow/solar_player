import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { DATA_HUB_SECTIONS } from "../../app/dataHub";
import { DataHubTaskHomeContent } from "./TaskHome";
import type { WorkspaceHealthSummary } from "./sourceWorkspace";

const knSummary: WorkspaceHealthSummary = {
  emptyReason: null,
  hasData: true,
  issueCount: 1,
  issueExplanations: ["KN 沖床：等待資料 (Waiting for data)"],
  lastUpdated: "2026-08-31T01:02:00.000Z",
  managedCount: 0,
  operatorCount: 1,
  scopeLabel: "KN",
  sourceCount: 2
};

function renderHome(summary: WorkspaceHealthSummary, scope: "all" | "cl" | "kn" | "global" = "kn") {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DataHubTaskHomeContent
        specialistSections={DATA_HUB_SECTIONS}
        summary={summary}
        workspaceScope={scope}
      />
    </MemoryRouter>
  );
}

test("U1-R1-S01 and U1-M1-S01 task landing shows three tasks, health summary and specialist routes", () => {
  const html = renderHome(knSummary, "kn");
  assert.match(html, /data-data-hub-task-home/);
  assert.match(html, /data-data-hub-task="connect"/);
  assert.match(html, /接入新資料/);
  assert.match(html, /修改現有資料/);
  assert.match(html, /排除資料異常/);
  assert.match(html, /data-data-hub-health-summary/);
  assert.match(html, /KN目前狀況|KN 目前狀況|KN目前/);
  assert.match(html, /1 筆需要處理/);
  assert.match(html, /KN 沖床/);
  assert.match(html, /data-data-hub-specialist="connections"/);
  assert.match(html, /data-data-hub-specialist="sources"/);
  assert.match(html, /data-data-hub-specialist="metrics"/);
  assert.match(html, /data-data-hub-specialist="external"/);
  assert.doesNotMatch(html, /請先閱讀 MQTT mapping 文件/);
});

test("U1-R1 empty health summary does not pretend zero is healthy", () => {
  const html = renderHome({
    emptyReason: "目前這個範圍還沒有可顯示的資料來源。",
    hasData: false,
    issueCount: 0,
    issueExplanations: [],
    lastUpdated: null,
    managedCount: 0,
    operatorCount: 0,
    scopeLabel: "全域",
    sourceCount: 0
  }, "global");
  assert.match(html, /目前這個範圍還沒有可顯示的資料來源/);
  assert.doesNotMatch(html, /沒有需要處理的異常/);
});
