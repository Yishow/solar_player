import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const routerSource = readFileSync(path.join(import.meta.dirname, "router.tsx"), "utf8");

const managementPageModules = [
  "../pages/BrandAssets",
  "../pages/CircuitSettings",
  "../pages/DataHub",
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

test("Data Hub route family exposes the required sections", () => {
  assert.match(routerSource, /path:\s*"settings\/data-hub"/);
  for (const section of ["connections", "sources", "metrics", "external"]) {
    assert.match(routerSource, new RegExp(`path:\\s*"${section}"`));
  }
  assert.match(routerSource, /DataHubTaskHome/);
  assert.doesNotMatch(routerSource, /index:\s*true,\s*element:\s*<Navigate to="connections"/);
});

test("legacy data settings routes redirect through guarded compatibility loaders", () => {
  assert.match(
    routerSource,
    /path:\s*"settings\/mqtt",\s*loader:\s*createDataHubCompatibilityRedirectLoader\("settings\/mqtt"\)/s
  );
  assert.match(
    routerSource,
    /path:\s*"settings\/data-source",\s*loader:\s*createDataHubCompatibilityRedirectLoader\("settings\/data-source"\)/s
  );
  assert.match(
    routerSource,
    /path:\s*"connections",[\s\S]*loadMqttConnectionsRoute[\s\S]*MqttConnections/s
  );
  assert.match(
    routerSource,
    /path:\s*"usage",\s*loader:\s*createDataHubCompatibilityRedirectLoader\("settings\/data-hub\/usage"\)/s
  );
  assert.match(
    routerSource,
    /path:\s*"diagnostics",\s*loader:\s*createDataHubCompatibilityRedirectLoader\("settings\/data-hub\/diagnostics"\)/s
  );
  assert.doesNotMatch(routerSource, /loadDataSourceSettingsRoute/);
});

test("Data Hub External Data lazy-loads only the weather surface", () => {
  assert.match(
    routerSource,
    /path:\s*"external",[\s\S]*createLazyManagementRouteLoader\([\s\S]*loadDataHubWeatherRoute[\s\S]*import\("\.\.\/pages\/DataHub\/Weather"\)[\s\S]*DataHubWeather/s
  );
  assert.doesNotMatch(routerSource, /createDataHubPlaceholderRoute\("external"\)/);
  assert.doesNotMatch(routerSource, /loadMqttEditableModel[\s\S]*path:\s*"external"/);
  assert.doesNotMatch(routerSource, /loadAllDataHub/);
});

test("Data Hub Sources loads only the managed and generic source surface", () => {
  assert.match(
    routerSource,
    /path:\s*"sources",[\s\S]*loadDataHubSourcesRoute[\s\S]*DataHubSources/s
  );
});

test("Data Hub keeps MQTT operations as guarded lazy child route", () => {
  assert.match(
    routerSource,
    /path:\s*"sources\/operations",[\s\S]*createLazyManagementRouteLoader\([\s\S]*settings\/data-hub\/sources\/operations[\s\S]*loadMqttOperationsRoute[\s\S]*import\("\.\.\/pages\/MqttSettings"\)[\s\S]*MqttOperations/s
  );
  assert.match(
    routerSource,
    /path:\s*"diagnostics\/operations",\s*loader:\s*createDataHubCompatibilityRedirectLoader\("settings\/data-hub\/diagnostics\/operations"\)/s
  );
});

test("Data Hub Metrics loads its scoped inventory surface", () => {
  assert.match(
    routerSource,
    /path:\s*"metrics",[\s\S]*loadDataHubMetricsRoute[\s\S]*DataHubMetrics/s
  );
});

test("Data Hub Derived Metrics redirects through compatibility loader", () => {
  assert.match(
    routerSource,
    /path:\s*"derived",\s*loader:\s*createDataHubCompatibilityRedirectLoader\("settings\/data-hub\/derived"\)/s
  );
});

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
