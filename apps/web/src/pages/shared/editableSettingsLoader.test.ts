import assert from "node:assert/strict";
import test from "node:test";
import {
  loadEditableSettingsLane,
  refreshDeferredSettingsDiagnostics
} from "./editableSettingsLoader";

test("loadEditableSettingsLane waits for every persisted-control loader", async () => {
  const calls: string[] = [];

  await loadEditableSettingsLane([
    async () => {
      calls.push("broker");
    },
    async () => {
      calls.push("topics");
    }
  ]);

  assert.deepEqual(calls.sort(), ["broker", "topics"]);
});

test("loadEditableSettingsLane propagates editable loader failures", async () => {
  await assert.rejects(
    loadEditableSettingsLane([
      async () => {
        throw new Error("editable denied");
      }
    ]),
    /editable denied/
  );
});

test("refreshDeferredSettingsDiagnostics schedules diagnostics outside the editable lane", async () => {
  const calls: string[] = [];

  refreshDeferredSettingsDiagnostics([
    async () => {
      calls.push("readiness");
    }
  ]);

  await Promise.resolve();
  assert.deepEqual(calls, ["readiness"]);
});
