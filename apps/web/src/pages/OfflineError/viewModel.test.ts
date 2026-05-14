import assert from "node:assert/strict";
import test from "node:test";
import { buildOfflineErrorViewModel } from "./viewModel";

test("buildOfflineErrorViewModel maps reconnecting state into prototype-ready copy", () => {
  const model = buildOfflineErrorViewModel({
    lastUpdatedAt: "2026-05-13T10:12:45.000Z",
    reason: "reconnecting",
    retryCountdown: 12,
    returnTo: "/factory-circuit"
  });

  assert.equal(model.headline, "無法取得即時資料");
  assert.equal(model.subtitle, "Unable to retrieve live data.");
  assert.equal(model.iconKey, "offline-error");
  assert.match(model.reasonLabel, /重新連線/);
  assert.equal(model.retryLabel, "將於 12 秒後重新嘗試連線");
  assert.equal(model.returnToLabel, "/factory-circuit");
  assert.match(model.lastUpdatedLabel, /2026/);
});

test("buildOfflineErrorViewModel keeps placeholders for missing timestamp and unknown reason", () => {
  const model = buildOfflineErrorViewModel({
    lastUpdatedAt: null,
    reason: null,
    retryCountdown: 30,
    returnTo: "/overview"
  });

  assert.equal(model.lastUpdatedLabel, "尚未收到");
  assert.match(model.reasonLabel, /等待最新/);
  assert.equal(model.retryLabel, "將於 30 秒後重新嘗試連線");
});
