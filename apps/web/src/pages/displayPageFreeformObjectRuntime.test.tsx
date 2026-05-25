import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const sources = [
  readFileSync(path.join(import.meta.dirname, "Overview/index.tsx"), "utf8"),
  readFileSync(path.join(import.meta.dirname, "Solar/index.tsx"), "utf8"),
  readFileSync(path.join(import.meta.dirname, "FactoryCircuit/index.tsx"), "utf8"),
  readFileSync(path.join(import.meta.dirname, "Images/index.tsx"), "utf8"),
  readFileSync(path.join(import.meta.dirname, "Sustainability/index.tsx"), "utf8")
];

test("all five playback pages wire the shared freeform object layer from resolved runtime config", () => {
  for (const source of sources) {
    assert.match(source, /DisplayPageObjectLayer/);
    assert.match(source, /freeformObjects\?: DisplayPageFreeformObject\[]/);
    assert.match(source, /<DisplayPageObjectLayer objects=\{freeformObjects\} \/>/);
  }
});
