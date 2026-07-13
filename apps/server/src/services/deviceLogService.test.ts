import assert from "node:assert/strict";
import test from "node:test";
import {
  clampDeviceLogLimit,
  exportDeviceLogs,
  parseJournalJsonLines,
  readDeviceLogSummary,
  type JournalRunner
} from "./deviceLogService.js";

const sampleJsonLine = JSON.stringify({
  __REALTIME_TIMESTAMP: "1716022800000000",
  MESSAGE: "solar-display boot error: mqtt offline",
  PRIORITY: "3"
});

test("clampDeviceLogLimit clamps to 1..500 and defaults invalid values", () => {
  assert.equal(clampDeviceLogLimit(0), 1);
  assert.equal(clampDeviceLogLimit(-5), 1);
  assert.equal(clampDeviceLogLimit(20), 20);
  assert.equal(clampDeviceLogLimit(999), 500);
  assert.equal(clampDeviceLogLimit("12"), 12);
  assert.equal(clampDeviceLogLimit("nope"), 20);
  assert.equal(clampDeviceLogLimit(undefined), 20);
});

test("parseJournalJsonLines maps fixed journal fields without host paths", () => {
  const entries = parseJournalJsonLines(`${sampleJsonLine}\n`);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.message, "solar-display boot error: mqtt offline");
  assert.equal(entries[0]?.priority, "err");
  assert.equal(entries[0]?.timestamp, "2024-05-18T09:00:00.000Z");
  assert.equal(JSON.stringify(entries[0]).includes("/var/"), false);
});

test("parseJournalJsonLines rejects malformed output", () => {
  assert.throws(() => parseJournalJsonLines("not-json\n"), /malformed journal output/);
});

test("readDeviceLogSummary returns available entries from a valid runner", async () => {
  const runner: JournalRunner = async ({ mode, limit }) => {
    assert.equal(mode, "recent");
    assert.equal(limit, 20);
    return { exitCode: 0, stdout: `${sampleJsonLine}\n`, stderr: "" };
  };

  const summary = await readDeviceLogSummary({ runner, limit: 20 });
  assert.equal(summary.available, true);
  assert.equal(summary.source, "journald");
  assert.equal(summary.unavailableReason, null);
  assert.equal(summary.retention.unit, "solar-display");
  assert.equal(summary.retention.scope, "current-boot");
  assert.equal(summary.entries.length, 1);
  assert.match(summary.entries[0]?.message ?? "", /mqtt offline/);
});

test("readDeviceLogSummary reports unavailable for sudo denied fixtures", async () => {
  const runner: JournalRunner = async () => ({
    exitCode: 1,
    stdout: "",
    stderr: "sudo: a password is required"
  });

  const summary = await readDeviceLogSummary({ runner, limit: 10 });
  assert.equal(summary.available, false);
  assert.equal(summary.source, "journald");
  assert.equal(summary.entries.length, 0);
  assert.equal(summary.unavailableReason, "journal access denied");
});

test("readDeviceLogSummary reports unavailable when journal is missing", async () => {
  const runner: JournalRunner = async () => ({
    exitCode: 1,
    stdout: "",
    stderr: "error: journalctl is not available"
  });

  const summary = await readDeviceLogSummary({ runner });
  assert.equal(summary.available, false);
  assert.equal(summary.unavailableReason, "journald is unavailable");
});

test("readDeviceLogSummary reports unavailable for malformed output", async () => {
  const runner: JournalRunner = async () => ({
    exitCode: 0,
    stdout: "{bad\n",
    stderr: ""
  });

  const summary = await readDeviceLogSummary({ runner });
  assert.equal(summary.available, false);
  assert.equal(summary.unavailableReason, "malformed journal output");
});

test("exportDeviceLogs returns text content and clamps limit", async () => {
  let seenLimit = 0;
  const runner: JournalRunner = async ({ mode, limit }) => {
    assert.equal(mode, "export");
    seenLimit = limit;
    return {
      exitCode: 0,
      stdout: "2026-05-18T09:00:00+00:00 host solar-display[1]: boom\n",
      stderr: ""
    };
  };

  const exported = await exportDeviceLogs({ runner, limit: 9000 });
  assert.equal(seenLimit, 500);
  assert.equal(exported.available, true);
  assert.equal(exported.source, "journald");
  assert.match(exported.content, /boom/);
  assert.equal(exported.filename, "solar-display-journal-500.txt");
  assert.equal(exported.unavailableReason, null);
});

test("exportDeviceLogs does not accept caller unit or path through the runner contract", async () => {
  const runner: JournalRunner = async (input) => {
    assert.deepEqual(Object.keys(input).sort(), ["limit", "mode"]);
    assert.equal("unit" in input, false);
    assert.equal("path" in input, false);
    return { exitCode: 0, stdout: "ok\n", stderr: "" };
  };

  const exported = await exportDeviceLogs({ runner, limit: 5 });
  assert.equal(exported.available, true);
});
