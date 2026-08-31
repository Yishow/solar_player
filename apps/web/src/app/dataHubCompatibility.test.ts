import assert from "node:assert/strict";
import test from "node:test";
import { resolveDataHubCompatibilityRedirect } from "./dataHubCompatibility";

test("legacy data settings URLs resolve to their Data Hub sections and preserve query context", () => {
  assert.equal(
    resolveDataHubCompatibilityRedirect("https://display.local/settings/mqtt?scope=kn"),
    "/settings/data-hub/connections?scope=kn"
  );
  assert.equal(
    resolveDataHubCompatibilityRedirect("https://display.local/settings/data-source?scope=cl&metricKey=realTimePower"),
    "/settings/data-hub/metrics?scope=cl&metricKey=realTimePower"
  );
  assert.equal(
    resolveDataHubCompatibilityRedirect("https://display.local/settings/data-hub/usage?scope=cl&metricKey=realTimePower"),
    "/settings/data-hub/metrics?scope=cl&metricKey=realTimePower"
  );
  assert.equal(
    resolveDataHubCompatibilityRedirect("https://display.local/settings/data-hub/diagnostics?scope=cl&metricKey=realTimePower"),
    "/settings/data-hub/metrics?scope=cl&metricKey=realTimePower"
  );
});

test("unrelated management URLs are not treated as Data Hub compatibility entries", () => {
  assert.equal(resolveDataHubCompatibilityRedirect("https://display.local/settings/playback"), null);
});
