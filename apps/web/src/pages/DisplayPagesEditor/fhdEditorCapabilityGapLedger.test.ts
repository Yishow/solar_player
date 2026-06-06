import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { displayPageTemplateKeys } from "@solar-display/shared";
import { resolvePageRegionSchemas } from "./pageRegionSchemas";

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
const ledgerPath = path.join(repoRoot, "docs/fhd-editor-gap-ledger.md");
const ledger = () => readFileSync(ledgerPath, "utf8");

const requiredReferencePaths = [
  "docs/reference/FHD/01-1.Overview (大).png",
  "docs/reference/FHD/02-2.Solar (大).png",
  "docs/reference/FHD/03-3.Factory Circuit (大).png",
  "docs/reference/FHD/04-4.Images (大).png",
  "docs/reference/FHD/05-5.Sustainability (大).png"
];

const classifications = [
  "existing-editor-control",
  "new-editor-capability",
  "non-editor-runtime-gap",
  "accepted-difference"
];

const downstreamChanges = [
  "add-display-editor-fhd-typography-rhythm-controls",
  "add-display-editor-fhd-ornament-media-controls",
  "add-display-editor-fhd-flow-connector-controls",
  "add-ai-led-fhd-witness-tooling"
];

const deprecatedReferenceWorkflow = ["docs", "reference-match", ""].join("/");
const ledgerTableHeader = [
  "Page",
  "Route",
  "FHD reference path",
  "Surface",
  "Current editor region id",
  "Current editor field group",
  "Code anchor or evidence path",
  "Classification",
  "Downstream owner",
  "Next verification",
  "Notes"
];

function splitLedgerRow(row: string) {
  return row
    .trim()
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

test("FHD editor capability gap ledger exists and references the five playback witnesses", () => {
  assert.equal(existsSync(ledgerPath), true);

  const markdown = ledger();

  for (const referencePath of requiredReferencePaths) {
    assert.match(markdown, new RegExp(referencePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("FHD editor capability gap ledger keeps classifications and downstream ownership deterministic", () => {
  const markdown = ledger();

  for (const classification of classifications) {
    assert.match(markdown, new RegExp(`\\b${classification}\\b`));
  }

  for (const downstreamChange of downstreamChanges) {
    assert.match(markdown, new RegExp(`\\b${downstreamChange}\\b`));
  }

  assert.doesNotMatch(markdown, new RegExp(deprecatedReferenceWorkflow));

  const tableHeaders = markdown
    .split("\n")
    .filter((line) => line.startsWith("| Page | Route | FHD reference path |"));
  assert.equal(tableHeaders.length, 5);
  for (const header of tableHeaders) {
    assert.deepEqual(splitLedgerRow(header), ledgerTableHeader);
  }

  const pageRows = markdown
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| ---") && !line.startsWith("| Page |"));

  assert.ok(pageRows.length >= 5);

  for (const row of pageRows) {
    const cells = splitLedgerRow(row);
    assert.equal(cells.length, ledgerTableHeader.length);
    const classification = cells[7] ?? "";
    const owner = cells[8] ?? "";
    assert.notEqual(classification, "");
    assert.equal(classifications.includes(classification), true);
    if (classification === "new-editor-capability") {
      assert.ok(
        downstreamChanges.includes(owner) || owner.startsWith("new-change-required:"),
        `Unexpected new editor capability owner: ${owner}`
      );
    }
  }

  for (const vagueStatus of ["todo", "unknown", "needs polish"]) {
    assert.doesNotMatch(markdown, new RegExp(`\\b${vagueStatus}\\b`, "i"));
  }
});

test("FHD editor capability gap ledger records current editor source model", () => {
  const markdown = ledger();
  const indexSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
  const pageRegionSchemaSource = readFileSync(path.join(import.meta.dirname, "pageRegionSchemas.ts"), "utf8");

  assert.match(
    indexSource,
    /resolveDisplayEditorRegions\(config,\s*resolvePageRegionSchemas\(selectedPage\.templateKey\),\s*seedConfig\)/
  );

  for (const templateKey of displayPageTemplateKeys) {
    assert.ok(resolvePageRegionSchemas(templateKey).length > 0);
  }

  for (const sourceName of [
    "overviewDisplayPageEditorRegions",
    "solarDisplayPageEditorRegions",
    "factoryCircuitDisplayPageEditorRegions",
    "imagesDisplayPageEditorRegions",
    "sustainabilityDisplayPageEditorRegions"
  ]) {
    assert.match(pageRegionSchemaSource, new RegExp(sourceName));
    assert.match(markdown, new RegExp(sourceName));
  }

  assert.match(markdown, /buildOverviewRegions/);
  assert.match(markdown, /buildSolarRegions/);
  assert.match(markdown, /buildFactoryCircuitRegions/);
  assert.match(markdown, /buildImagesRegions/);
  assert.match(markdown, /buildSustainabilityRegions/);
});
