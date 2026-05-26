import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../../");
const workflowSpec = readFileSync(
  path.join(repoRoot, "openspec/specs/ai-frontend-fhd-evidence-workflow/spec.md"),
  "utf8"
);
const guardrailSpec = readFileSync(
  path.join(repoRoot, "openspec/specs/display-surface-visual-guardrails/spec.md"),
  "utf8"
);
const evidenceBundleTemplate = readFileSync(
  path.join(repoRoot, "docs/reference-match/fhd-evidence-bundle-template.md"),
  "utf8"
);
const surfaceSplitGuide = readFileSync(
  path.join(repoRoot, "docs/reference-match/fhd-surface-split-guide.md"),
  "utf8"
);
const exceptionLedgerTemplate = readFileSync(
  path.join(repoRoot, "docs/reference-match/fhd-exception-ledger-template.md"),
  "utf8"
);
const hookConfig = readFileSync(path.join(repoRoot, ".codex/hooks.json"), "utf8");
const hookReminderScript = readFileSync(
  path.join(repoRoot, ".codex/hooks/fhd-evidence-reminder.js"),
  "utf8"
);

test("ai frontend fhd evidence workflow spec defines witness batches, surface families, and exception ledgers", () => {
  assert.match(workflowSpec, /Require witness-batch evidence for FHD-affecting frontend changes/);
  assert.match(workflowSpec, /Split FHD work by surface family and reviewable scope/);
  assert.match(workflowSpec, /Record FHD exceptions as durable review artifacts/);
  assert.match(workflowSpec, /witness batch/i);
  assert.match(workflowSpec, /surface family/i);
  assert.match(workflowSpec, /exception ledger/i);
  assert.match(workflowSpec, /verification pack/i);
});

test("guardrail spec links the visual checklist back into the ai-authored workflow", () => {
  assert.match(guardrailSpec, /Visual review checklist remains part of the AI-authored change workflow/);
  assert.match(guardrailSpec, /evidence bundle/i);
  assert.match(guardrailSpec, /checklist/i);
});

test("evidence bundle template carries the shared workflow vocabulary for playback, management, and editor surfaces", () => {
  assert.match(evidenceBundleTemplate, /witness batch/i);
  assert.match(evidenceBundleTemplate, /surface family/i);
  assert.match(evidenceBundleTemplate, /protected attributes/i);
  assert.match(evidenceBundleTemplate, /exception ledger/i);
  assert.match(evidenceBundleTemplate, /verification pack/i);
  assert.match(evidenceBundleTemplate, /playback/i);
  assert.match(evidenceBundleTemplate, /management/i);
  assert.match(evidenceBundleTemplate, /editor/i);
});

test("surface split guide names the supported reviewable families and when to split a large diff", () => {
  assert.match(surfaceSplitGuide, /playback/i);
  assert.match(surfaceSplitGuide, /management/i);
  assert.match(surfaceSplitGuide, /editor/i);
  assert.match(surfaceSplitGuide, /launch audit/i);
  assert.match(surfaceSplitGuide, /witness batch/i);
  assert.match(surfaceSplitGuide, /surface family/i);
  assert.match(surfaceSplitGuide, /separate changes|split/i);
});

test("exception ledger template records durable deviation evidence instead of chat-only notes", () => {
  assert.match(exceptionLedgerTemplate, /exception ledger/i);
  assert.match(exceptionLedgerTemplate, /affected surface/i);
  assert.match(exceptionLedgerTemplate, /reason/i);
  assert.match(exceptionLedgerTemplate, /user-visible effect/i);
  assert.match(exceptionLedgerTemplate, /residual risk/i);
  assert.match(exceptionLedgerTemplate, /verification pack/i);
});

test("hook reminder stays scoped to relevant fhd frontend paths", () => {
  assert.match(hookConfig, /fhd-evidence-reminder\.js/);
  assert.match(hookReminderScript, /DisplayPagesEditor/);
  assert.match(hookReminderScript, /displaySurfaceChrome/);
  assert.match(hookReminderScript, /Overview/);
  assert.match(hookReminderScript, /Sustainability/);
  assert.match(hookReminderScript, /witness batch/i);
  assert.match(hookReminderScript, /surface family/i);
  assert.match(hookReminderScript, /exception ledger/i);
});
