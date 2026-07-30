import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("FactoryCircuit remounts safely under StrictMode before guarding async state writes", () => {
  assert.match(
    source,
    /useEffect\(\(\) => \{\s*mountedRef\.current = true;[\s\S]*return \(\) => \{\s*mountedRef\.current = false;/
  );
});

test("FactoryCircuit stops routing animation when aggregate freshness is not live", () => {
  assert.match(source, /shouldAnimateFactoryFlow/);
  assert.match(source, /className=\{shouldAnimateFactoryFlow \? "fc-flow-60" : undefined\}/);
  assert.match(source, /animation: shouldAnimateFactoryFlow[\s\S]*: "none"/);
});
