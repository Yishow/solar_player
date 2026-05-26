import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../../");
const agentsDoc = readFileSync(path.join(repoRoot, "AGENTS.md"), "utf8");
const claudeDoc = readFileSync(path.join(repoRoot, "CLAUDE.md"), "utf8");
const readmeDoc = readFileSync(path.join(repoRoot, "README.md"), "utf8");
const docsReadmeDoc = readFileSync(path.join(repoRoot, "docs/README.md"), "utf8");
const assetSkillDoc = readFileSync(
  path.join(repoRoot, ".agents/skills/display-asset-generation/SKILL.md"),
  "utf8"
);
const assetSkillReadme = readFileSync(
  path.join(repoRoot, ".agents/skills/display-asset-generation/README.md"),
  "utf8"
);
const productGapAuditSkill = readFileSync(
  path.join(repoRoot, ".agents/skills/product-gap-audit/SKILL.md"),
  "utf8"
);
const entrypointSpec = readFileSync(
  path.join(repoRoot, "openspec/specs/agent-and-doc-entrypoint-alignment/spec.md"),
  "utf8"
);
const workflowEntrypointsDoc = readFileSync(
  path.join(repoRoot, "docs/reference-match/fhd-workflow-entrypoints.md"),
  "utf8"
);

test("agent and doc entrypoint spec defines aligned agent, human, and skill vocabulary", () => {
  assert.match(entrypointSpec, /Keep agent-facing entrypoints aligned to one display workflow/);
  assert.match(entrypointSpec, /Keep human-facing entrypoints lightweight and navigable/);
  assert.match(entrypointSpec, /Repo-local skills use the same workflow vocabulary as the entrypoints/);
});

test("workflow entrypoint index points readers to canonicals, evidence workflow, and launch witness docs", () => {
  assert.match(workflowEntrypointsDoc, /visual canonicals/i);
  assert.match(workflowEntrypointsDoc, /evidence workflow/i);
  assert.match(workflowEntrypointsDoc, /launch witness gates/i);
  assert.match(workflowEntrypointsDoc, /docs\/reference-match\/playback-visual-canonicals\.md/);
  assert.match(workflowEntrypointsDoc, /docs\/reference-match\/fhd-evidence-bundle-template\.md/);
  assert.match(workflowEntrypointsDoc, /docs\/reference-match\/display-launch-witness-matrix\.md/);
});

test("AGENTS and CLAUDE mirror the same FHD workflow vocabulary", () => {
  for (const source of [agentsDoc, claudeDoc]) {
    assert.match(source, /witness batch/i);
    assert.match(source, /evidence bundle/i);
    assert.match(source, /visual canonicals/i);
    assert.match(source, /launch witness gates/i);
    assert.match(source, /fhd-workflow-entrypoints\.md/);
  }
});

test("README entrypoints stay lightweight and route readers to canonical workflow docs", () => {
  for (const source of [readmeDoc, docsReadmeDoc]) {
    assert.match(source, /fhd-workflow-entrypoints\.md/);
    assert.match(source, /playback-visual-canonicals\.md/);
    assert.match(source, /display-launch-witness-matrix\.md/);
  }
});

test("repo-local skills reuse the same workflow vocabulary instead of inventing new names", () => {
  for (const source of [assetSkillDoc, assetSkillReadme, productGapAuditSkill]) {
    assert.match(source, /witness batch/i);
    assert.match(source, /evidence bundle/i);
    assert.match(source, /visual canonicals/i);
    assert.match(source, /launch witness gate/i);
  }
});
