import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../../");
const launchSpec = readFileSync(
  path.join(repoRoot, "openspec/specs/display-launch-witness-gates/spec.md"),
  "utf8"
);
const authoringCoverageSpec = readFileSync(
  path.join(repoRoot, "openspec/specs/display-editor-page-authoring-coverage/spec.md"),
  "utf8"
);
const livePublishingSpec = readFileSync(
  path.join(repoRoot, "openspec/specs/display-page-draft-live-publishing/spec.md"),
  "utf8"
);
const witnessMatrixDoc = readFileSync(
  path.join(repoRoot, "docs/reference-match/display-launch-witness-matrix.md"),
  "utf8"
);
const closeoutMatrixDoc = readFileSync(
  path.join(repoRoot, "docs/fhd-witness/playback-closeout-matrix.md"),
  "utf8"
);
const verificationPackDoc = readFileSync(
  path.join(repoRoot, "docs/reference-match/display-launch-verification-pack.md"),
  "utf8"
);
const allPagesAuditDoc = readFileSync(
  path.join(repoRoot, "docs/reference-match/all-pages-audit.md"),
  "utf8"
);
const allPagesChecklistDoc = readFileSync(
  path.join(repoRoot, "docs/reference-match/all-pages-checklist.md"),
  "utf8"
);

test("display launch witness spec defines page matrix, authoritative status, blockers, and verification pack", () => {
  assert.match(launchSpec, /Define a launch witness matrix for the five playback pages/);
  assert.match(launchSpec, /Keep launch status in one authoritative matrix/);
  assert.match(launchSpec, /Treat publish refresh and fallback verification as launch blockers/);
  assert.match(launchSpec, /Keep launch verification evidence inside the repo workflow/);
});

test("authoring coverage and live publishing specs gain launch-complete deltas", () => {
  assert.match(authoringCoverageSpec, /Page-specific authoring coverage is not launch-complete without runtime parity witness/);
  assert.match(authoringCoverageSpec, /runtime parity witness/i);
  assert.match(livePublishingSpec, /Live publishing is launch-complete only after refresh witness passes/);
  assert.match(livePublishingSpec, /operator-visible confirmation/i);
});

test("launch witness matrix is the single page-by-page status ledger for all five playback routes", () => {
  for (const route of [
    "/overview",
    "/solar",
    "/factory-circuit",
    "/images",
    "/sustainability"
  ]) {
    assert.match(witnessMatrixDoc, new RegExp(route.replace("/", "\\/")));
  }

  assert.match(witnessMatrixDoc, /authoring/i);
  assert.match(witnessMatrixDoc, /runtime parity/i);
  assert.match(witnessMatrixDoc, /publish refresh/i);
  assert.match(witnessMatrixDoc, /fallback/i);
  assert.match(witnessMatrixDoc, /handoff/i);
  assert.match(witnessMatrixDoc, /pass|fail|blocked/i);
});

test("launch witness matrix links boundary rationale without replacing blocked launch status", () => {
  for (const token of ["protected-product-choice", "reference-quality-target", "actual-gap"]) {
    assert.match(witnessMatrixDoc, new RegExp(token));
    assert.match(closeoutMatrixDoc, new RegExp(token));
  }

  assert.match(witnessMatrixDoc, /boundary rationale/i);
  assert.match(witnessMatrixDoc, /single authoritative launch status ledger/i);
  assert.match(witnessMatrixDoc, /does not.*launch-ready|不.*launch-ready|不得.*launch-ready/i);

  for (const route of [
    "/overview",
    "/solar",
    "/factory-circuit",
    "/images",
    "/sustainability"
  ]) {
    const routePattern = new RegExp(`${route.replace("/", "\\/")}.*blocked`, "s");
    assert.match(witnessMatrixDoc, routePattern);
  }

  for (const cue of [
    "hero photo fade",
    "connector thickness",
    "circuit line weight",
    "media stage crop",
    "highlight rail density"
  ]) {
    assert.match(closeoutMatrixDoc, new RegExp(cue, "i"));
  }
});

test("launch verification pack provides commands, manual checks, and matrix recording instructions", () => {
  assert.match(verificationPackDoc, /pnpm --filter @solar-display\/web test/);
  assert.match(verificationPackDoc, /spectra analyze add-display-launch-witness-gates --json/);
  assert.match(verificationPackDoc, /spectra validate --strict --changes add-display-launch-witness-gates/);
  assert.match(verificationPackDoc, /manual witness checks/i);
  assert.match(verificationPackDoc, /record the result back into the matrix/i);
});

test("all-pages audit and checklist point to the matrix instead of behaving like parallel launch ledgers", () => {
  assert.match(allPagesAuditDoc, /display-launch-witness-matrix\.md/);
  assert.match(allPagesAuditDoc, /supporting input|supporting reference/i);
  assert.match(allPagesChecklistDoc, /display-launch-witness-matrix\.md/);
  assert.match(allPagesChecklistDoc, /display-launch-verification-pack\.md/);
  assert.match(allPagesChecklistDoc, /authoritative launch status/i);
});
