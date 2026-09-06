import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMapping,
  compileSelector,
  extractBySelector,
  extractDecimalLexeme,
  previewMapping
} from "./guidedMqttMapping.js";

test("M2 selector extracts nested counter without unsafe coercion", () => {
  const selector = compileSelector("meters.main.value");
  assert.equal(extractBySelector({ meters: { main: { value: "10000.125" } } }, selector), "10000.125");
});

test("M2-R3 tag identity survives array reordering and rejects duplicate tags", () => {
  const selector = compileSelector("value", "MAIN");
  const reordered = [
    { tag: "STAMP", value: "200" },
    { tag: "OTHER", value: "1" },
    { tag: "OTHER", value: "2" },
    { tag: "MAIN", value: "1000" }
  ];
  assert.equal(extractBySelector(reordered, selector), "1000");
  assert.equal(extractBySelector({ tag: "STAMP", value: "200" }, selector), undefined);
  assert.throws(
    () => extractBySelector([{ tag: "MAIN", value: "1" }, { tag: "MAIN", value: "2" }], selector),
    /AMBIGUOUS_TAG/
  );
});

test("M2-R4 high precision counter lexemes stay decimal strings", () => {
  assert.equal(extractDecimalLexeme("9007199254740992.125"), "9007199254740992.125");
  assert.equal(extractDecimalLexeme(9007199254740993), null);
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
  const retried = applyMapping({ canonicalDraft: draft, idempotencyKey: "k1", previewToken: preview.previewToken });
  assert.equal(retried.channelId, "kn-main");
  assert.throws(
    () => applyMapping({ canonicalDraft: { ...draft, channelId: "other" }, idempotencyKey: "k1", previewToken: preview.previewToken }),
    /PREVIEW_DRAFT_MISMATCH/
  );
});
