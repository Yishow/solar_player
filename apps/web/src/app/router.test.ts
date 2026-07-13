import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const routerSource = readFileSync(path.join(import.meta.dirname, "router.tsx"), "utf8");

const managementPageModules = [
  "../pages/BrandAssets",
  "../pages/CircuitSettings",
  "../pages/DataSourceSettings",
  "../pages/DeviceStatus",
  "../pages/DisplayPagesEditor/runtime",
  "../pages/EnergyHistory",
  "../pages/EnergyTrend",
  "../pages/ImageManagement",
  "../pages/MqttSettings",
  "../pages/OfflineError",
  "../pages/PlaybackSettings",
  "../pages/SlideshowPreview"
] as const;

test("hidden trends and history routes are guarded before their page modules load", () => {
  assert.match(routerSource, /import \{[\s\S]*redirect[\s\S]*\} from "react-router-dom"/);
  assert.match(routerSource, /createManagementRouteLoader\("trends"\)/);
  assert.match(routerSource, /createManagementRouteLoader\("history"\)/);
  assert.match(
    routerSource,
    /path:\s*"trends",\s*loader:\s*createManagementRouteLoader\("trends"\),\s*lazy:\s*async\s*\(\)\s*=>\s*\{[\s\S]*import\("\.\.\/pages\/EnergyTrend"\)/s
  );
  assert.match(
    routerSource,
    /path:\s*"history",\s*loader:\s*createManagementRouteLoader\("history"\),\s*lazy:\s*async\s*\(\)\s*=>\s*\{[\s\S]*import\("\.\.\/pages\/EnergyHistory"\)/s
  );
});

test("management route guard redirects to a visible management route with overview fallback", () => {
  assert.match(routerSource, /getConfiguredHiddenManagementRoutePaths/);
  assert.match(routerSource, /getManagementRouteRedirectPath/);
  assert.match(routerSource, /throw redirect\(managementRouteRedirectPath\)/);
});

test("management routes load outside the playback entry bundle", () => {
  for (const modulePath of managementPageModules) {
    assert.doesNotMatch(
      routerSource,
      new RegExp(`import\\s+\\{[^}]*\\}\\s+from\\s+"${modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`)
    );
    assert.match(routerSource, new RegExp(`import\\("${modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\)`));
  }

  assert.doesNotMatch(routerSource, /element:\s*<EnergyTrend\s*\/>/);
  assert.doesNotMatch(routerSource, /element:\s*<PlaybackSettings\s*\/>/);
  assert.doesNotMatch(routerSource, /element:\s*<DisplayPagesEditorRoute\s*\/>/);
  assert.match(routerSource, /createLazyManagementRouteLoader/);
  assert.match(routerSource, /lazy:\s*async\s*\(\)\s*=>/);
});
