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
        summary={summary}
        workspaceScope={scope}
      />
    </MemoryRouter>
  );
}

test("U1-R1-S01 and U1-M1-S01 task landing shows three tasks and health summary", () => {
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
  assert.doesNotMatch(html, /請先閱讀 MQTT mapping 文件/);
});

test("U6 energy task opens the four-step factory setup on KN", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <DataHubTaskHomeContent
        summary={knSummary}
        task="energy"
        workspaceScope="kn"
      />
    </MemoryRouter>
  );
  assert.match(html, /data-site-energy-setup/);
  assert.match(html, /設定觀音用電/);
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

test("health summary limits visible issues to 3 and links to diagnose task to prevent page scroll", () => {
  const html = renderHome({
    emptyReason: null,
    hasData: true,
    issueCount: 5,
    issueExplanations: [
      "異常 1：等待資料",
      "異常 2：等待資料",
      "異常 3：等待資料",
      "異常 4：等待資料",
      "異常 5：等待資料"
    ],
    lastUpdated: null,
    managedCount: 0,
    operatorCount: 5,
    scopeLabel: "全部",
    sourceCount: 5
  }, "all");

  assert.match(html, /異常 1/);
  assert.match(html, /異常 2/);
  assert.match(html, /異常 3/);
  assert.doesNotMatch(html, /異常 4/);
  assert.doesNotMatch(html, /異常 5/);
  assert.match(html, /還有 2 筆異常項目/);
  assert.match(html, /排除資料異常/);
});

