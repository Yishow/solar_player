import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("the mock metrics feed does not recompile the derived metric registry on every tick", () => {
  const source = readFileSync(join(import.meta.dirname, "MockMetricsFeedService.ts"), "utf8");

  // initializeDerivedMetricRegistry drops the cached compiled registry and
  // rescans live_metric_values and topic_mappings inside a transaction. Startup
  // already initialises the registry, and evaluateDerivedMetrics initialises
  // lazily when no snapshot is cached, so calling it per tick only throws the
  // cached registry away every interval. That costs work without changing any
  // produced value, which is why it is asserted here rather than through
  // behaviour: the accompanying tick tests cover that the values are unchanged.
  assert.equal(
    source.includes("initializeDerivedMetricRegistry"),
    false,
    "MockMetricsFeedService must not initialise the derived metric registry per tick"
  );
  assert.equal(
    source.includes("evaluateDerivedMetrics"),
    true,
    "MockMetricsFeedService must still evaluate derived metrics per tick"
  );
});
