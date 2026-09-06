import assert from "node:assert/strict";
import test from "node:test";
import { applyMapping, compileSelector, extractBySelector, previewMapping } from "./guidedMqttMapping.js";

test("M2 selector extracts nested counter without unsafe coercion", () => {
  const selector = compileSelector("meters.main.value");
  assert.equal(extractBySelector({ meters: { main: { value: "10000.125" } } }, selector), "10000.125");
});

test("M2 preview is read-only and apply requires the same token and draft", () => {
  const draft = {
    channelId: "kn-main",
    energyFlowRole: "consumption" as const,
    measurementKind: "cumulative-energy" as const,
    metricScope: "kn" as const,
    selector: compileSelector("value"),
    timestampPolicy: "source-required" as const
  };
  const preview = previewMapping(draft);
  assert.equal(preview.canonicalDraft.channelId, "kn-main");
  const applied = applyMapping({ canonicalDraft: draft, idempotencyKey: "k1", previewToken: preview.previewToken });
  assert.equal(applied.applied, true);
  assert.throws(
    () => applyMapping({ canonicalDraft: { ...draft, channelId: "other" }, idempotencyKey: "k1", previewToken: preview.previewToken }),
    /PREVIEW_DRAFT_MISMATCH/
  );
});
