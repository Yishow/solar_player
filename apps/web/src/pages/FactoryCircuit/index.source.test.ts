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
