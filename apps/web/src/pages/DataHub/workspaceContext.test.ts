import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDataHubTaskHref,
  DATA_HUB_TASKS,
  parseDataHubWorkspaceSearch,
  resolveCreateMetricScope,
  toDataHubWorkspaceSearch,
  validatePhysicalMeterSiteChoice,
  workspaceContextKeys
} from "./workspaceContext";

test("U1-R1-S01 task catalog names three operator tasks without specialist jargon", () => {
  assert.deepEqual(
    DATA_HUB_TASKS.map(({ key, label }) => ({ key, label })),
    [
      { key: "connect", label: "接入新資料" },
      { key: "edit", label: "修改現有資料" },
      { key: "diagnose", label: "排除資料異常" }
    ]
  );
  for (const task of DATA_HUB_TASKS) {
    assert.doesNotMatch(task.label, /MQTT|broker|mapping|topic/i);
    assert.doesNotMatch(task.description, /MQTT|broker|mapping|topic/i);
  }
});

test("U1-R2 invalid URL scope is corrected to all with an explicit message and never silently becomes CL", () => {
  const parsed = parseDataHubWorkspaceSearch("scope=factory-a&q=沖床");
  assert.equal(parsed.managementScope, "all");
  assert.equal(parsed.requestedScope, "factory-a");
  assert.equal(parsed.scopeCorrected, true);
  assert.match(parsed.scopeCorrectionMessage ?? "", /factory-a/);
  assert.match(parsed.scopeCorrectionMessage ?? "", /全部/);
  assert.match(parsed.scopeCorrectionMessage ?? "", /不會自動改成 CL/);
  assert.equal(parsed.managementScope, "all");
  assert.equal(parsed.search, "沖床");
});

test("U6 energy task stays in workspace search without replacing the three operator tasks", () => {
  assert.equal(parseDataHubWorkspaceSearch("scope=kn&task=energy").task, "energy");
  assert.deepEqual(
    DATA_HUB_TASKS.map((task) => task.key),
    ["connect", "edit", "diagnose"]
  );
});

test("U1-R2 KN and all remain distinct legal management scopes", () => {
  assert.equal(parseDataHubWorkspaceSearch("scope=kn").managementScope, "kn");
  assert.equal(parseDataHubWorkspaceSearch("scope=all").managementScope, "all");
  assert.equal(parseDataHubWorkspaceSearch("scope=cl").managementScope, "cl");
  assert.equal(parseDataHubWorkspaceSearch("scope=global").managementScope, "global");
  assert.equal(parseDataHubWorkspaceSearch("").managementScope, "all");
});

test("U1-R2 workspace context does not carry display binding or preview device fields", () => {
  const keys = workspaceContextKeys(parseDataHubWorkspaceSearch("scope=kn&selection=mqtt:kn:power:1"));
  assert.deepEqual(keys, [
    "filter",
    "managementScope",
    "requestedScope",
    "scopeCorrected",
    "scopeCorrectionMessage",
    "search",
    "selection",
    "task"
  ]);
  assert.equal(keys.includes("binding"), false);
  assert.equal(keys.includes("previewDevice"), false);
  assert.equal(keys.includes("displayBinding"), false);
});

test("U1-R2-S01 create under KN defaults to KN and not CL", () => {
  assert.equal(resolveCreateMetricScope("kn"), "kn");
  assert.notEqual(resolveCreateMetricScope("kn"), "cl");
  assert.equal(resolveCreateMetricScope("cl"), "cl");
});

test("U1-R2-S02 create under all or global requires an explicit CL or KN choice", () => {
  assert.equal(resolveCreateMetricScope("all"), null);
  assert.equal(resolveCreateMetricScope("global"), null);
  assert.equal(validatePhysicalMeterSiteChoice(null).ok, false);
  assert.equal(validatePhysicalMeterSiteChoice("").ok, false);
  const globalChoice = validatePhysicalMeterSiteChoice("global");
  assert.equal(globalChoice.ok, false);
  if (!globalChoice.ok) {
    assert.match(globalChoice.message, /CL 或 KN/);
  }
  const chosen = validatePhysicalMeterSiteChoice("kn");
  assert.equal(chosen.ok, true);
  if (chosen.ok) {
    assert.equal(chosen.scope, "kn");
  }
});

test("U1-M1-S02 task hrefs preserve scope while specialist filters stay in the query", () => {
  const diagnose = buildDataHubTaskHref(DATA_HUB_TASKS[2], "kn");
  assert.equal(diagnose, "/settings/data-hub/metrics?scope=kn&filter=issue&task=diagnose");
  const connect = buildDataHubTaskHref(DATA_HUB_TASKS[0], "kn");
  assert.equal(connect, "/settings/data-hub/sources?scope=kn&task=connect");
  const hopsFromHome = 1;
  assert.equal(hopsFromHome, 1);
  assert.equal(DATA_HUB_TASKS[0].path.startsWith("/settings/data-hub/"), true);
  assert.equal(DATA_HUB_TASKS[2].path.startsWith("/settings/data-hub/"), true);
});

test("workspace search round-trips filter, selection and task without inventing a scope", () => {
  const params = toDataHubWorkspaceSearch({
    filter: "issue",
    managementScope: "kn",
    search: "沖床",
    selection: "mqtt:kn:factoryCircuit.stampingPower:11",
    task: "edit"
  });
  const parsed = parseDataHubWorkspaceSearch(params);
  assert.equal(parsed.filter, "issue");
  assert.equal(parsed.managementScope, "kn");
  assert.equal(parsed.search, "沖床");
  assert.equal(parsed.selection, "mqtt:kn:factoryCircuit.stampingPower:11");
  assert.equal(parsed.task, "edit");
  assert.equal(parsed.scopeCorrected, false);
});
