import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const routerSource = readFileSync(path.join(import.meta.dirname, "router.tsx"), "utf8");

test("hidden trends and history routes are guarded before their page elements mount", () => {
  assert.match(routerSource, /import \{[\s\S]*redirect[\s\S]*\} from "react-router-dom"/);
  assert.match(routerSource, /createManagementRouteLoader\("trends"\)/);
  assert.match(routerSource, /createManagementRouteLoader\("history"\)/);
  assert.match(
    routerSource,
    /path:\s*"trends",\s*loader:\s*createManagementRouteLoader\("trends"\),\s*element:\s*<EnergyTrend \/>/s
  );
  assert.match(
    routerSource,
    /path:\s*"history",\s*loader:\s*createManagementRouteLoader\("history"\),\s*element:\s*<EnergyHistory \/>/s
  );
});

test("management route guard redirects to a visible management route with overview fallback", () => {
  assert.match(routerSource, /getConfiguredHiddenManagementRoutePaths/);
  assert.match(routerSource, /getManagementRouteRedirectPath/);
  assert.match(routerSource, /throw redirect\(managementRouteRedirectPath\)/);
});
