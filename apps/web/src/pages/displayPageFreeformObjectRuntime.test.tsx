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

test("overview and solar render the freeform object layer after runtime surfaces so overlays stay on top", () => {
  const overviewSource = sources[0]!;
  const solarSource = sources[1]!;

  assert.ok(
    overviewSource.indexOf("<OverviewRuntimeContent") < overviewSource.indexOf("<DisplayPageObjectLayer objects={freeformObjects} />"),
    "Overview should render the object layer after runtime content"
  );
  assert.ok(
    solarSource.indexOf("<SolarRuntimeContent") < solarSource.indexOf("<DisplayPageObjectLayer objects={freeformObjects} />"),
    "Solar should render the object layer after runtime content"
  );
});
